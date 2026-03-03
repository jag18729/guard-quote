#!/usr/bin/env python3
"""
Log Shipper for SIEM Integration
Reads logs from multiple sources and ships them to a webhook endpoint.
Designed to run through NordVPN for IP allowlisting.

Usage:
    python3 log-shipper.py --config /etc/log-shipper/config.yaml
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import logging
import os
import queue
import signal
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class LogEntry:
    """Represents a single log entry"""
    timestamp: str
    host: str
    source: str
    severity: str
    message: str
    fields: dict = None


class LogShipper:
    """Main log shipper class"""
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.log_queue = queue.Queue(maxsize=10000)
        self.running = False
        self.stats = {
            'logs_read': 0,
            'logs_sent': 0,
            'logs_failed': 0,
            'batches_sent': 0,
        }
        
    def _load_config(self, config_path: str) -> dict:
        """Load configuration from YAML file"""
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Set defaults
        config.setdefault('batch_size', 100)
        config.setdefault('batch_timeout_seconds', 30)
        config.setdefault('retry_count', 3)
        config.setdefault('retry_delay_seconds', 5)
        
        return config
    
    def _sign_payload(self, payload: str) -> str:
        """Generate HMAC signature for payload"""
        secret = self.config.get('webhook_secret', '').encode()
        return hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()
    
    def _send_batch(self, logs: list[LogEntry]) -> bool:
        """Send a batch of logs to the webhook endpoint"""
        if not logs:
            return True
            
        payload = json.dumps({
            'source': self.config.get('source_name', 'vandine-homelab'),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'host': os.uname().nodename,
            'count': len(logs),
            'logs': [asdict(log) for log in logs]
        })
        
        signature = self._sign_payload(payload)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Source': self.config.get('source_name', 'vandine-homelab'),
            'User-Agent': 'VandineLogShipper/1.0'
        }
        
        # Add API key if configured
        if api_key := self.config.get('api_key'):
            headers['X-API-Key'] = api_key
        
        webhook_url = self.config['webhook_url']
        
        for attempt in range(self.config['retry_count']):
            try:
                response = requests.post(
                    webhook_url,
                    data=payload,
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code in (200, 201, 202):
                    self.stats['logs_sent'] += len(logs)
                    self.stats['batches_sent'] += 1
                    logger.info(f"Sent batch of {len(logs)} logs (attempt {attempt + 1})")
                    return True
                else:
                    logger.warning(f"Webhook returned {response.status_code}: {response.text[:200]}")
                    
            except requests.RequestException as e:
                logger.error(f"Request failed (attempt {attempt + 1}): {e}")
                
            if attempt < self.config['retry_count'] - 1:
                time.sleep(self.config['retry_delay_seconds'])
        
        self.stats['logs_failed'] += len(logs)
        return False
    
    def _tail_file(self, log_source: dict):
        """Tail a log file and add entries to queue"""
        file_path = log_source['path']
        source_name = log_source.get('name', Path(file_path).stem)
        host = log_source.get('host', os.uname().nodename)
        
        logger.info(f"Starting tail on {file_path}")
        
        try:
            process = subprocess.Popen(
                ['tail', '-F', '-n', '0', file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL
            )
            
            while self.running:
                line = process.stdout.readline()
                if not line:
                    time.sleep(0.1)
                    continue
                    
                message = line.decode('utf-8', errors='replace').strip()
                if not message:
                    continue
                
                entry = LogEntry(
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    host=host,
                    source=source_name,
                    severity=self._parse_severity(message),
                    message=message,
                    fields=log_source.get('fields', {})
                )
                
                try:
                    self.log_queue.put(entry, timeout=1)
                    self.stats['logs_read'] += 1
                except queue.Full:
                    logger.warning("Queue full, dropping log entry")
                    
        except Exception as e:
            logger.error(f"Error tailing {file_path}: {e}")
        finally:
            if process:
                process.terminate()
    
    def _parse_severity(self, message: str) -> str:
        """Parse severity from log message"""
        message_lower = message.lower()
        if 'error' in message_lower or 'fail' in message_lower:
            return 'error'
        elif 'warn' in message_lower:
            return 'warning'
        elif 'crit' in message_lower or 'alert' in message_lower:
            return 'critical'
        elif 'debug' in message_lower:
            return 'debug'
        return 'info'
    
    def _batch_sender(self):
        """Background thread to batch and send logs"""
        batch = []
        last_send = time.time()
        
        while self.running or not self.log_queue.empty():
            try:
                entry = self.log_queue.get(timeout=1)
                batch.append(entry)
            except queue.Empty:
                pass
            
            # Send batch if size or time threshold reached
            should_send = (
                len(batch) >= self.config['batch_size'] or
                (batch and (time.time() - last_send) >= self.config['batch_timeout_seconds'])
            )
            
            if should_send:
                self._send_batch(batch)
                batch = []
                last_send = time.time()
        
        # Send remaining logs
        if batch:
            self._send_batch(batch)
    
    def start(self):
        """Start the log shipper"""
        self.running = True
        
        # Start file tailers
        tailer_threads = []
        for source in self.config.get('log_sources', []):
            if source.get('enabled', True):
                thread = threading.Thread(
                    target=self._tail_file,
                    args=(source,),
                    daemon=True
                )
                thread.start()
                tailer_threads.append(thread)
        
        # Start batch sender
        sender_thread = threading.Thread(target=self._batch_sender, daemon=True)
        sender_thread.start()
        
        logger.info(f"Log shipper started with {len(tailer_threads)} sources")
        
        # Wait for shutdown signal
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        
        self.stop()
    
    def stop(self):
        """Stop the log shipper"""
        logger.info("Shutting down...")
        self.running = False
        
        # Wait for queue to drain
        timeout = 30
        start = time.time()
        while not self.log_queue.empty() and (time.time() - start) < timeout:
            time.sleep(0.5)
        
        logger.info(f"Stats: {self.stats}")


def main():
    parser = argparse.ArgumentParser(description='Ship logs to SIEM webhook')
    parser.add_argument(
        '--config', '-c',
        default='/etc/log-shipper/config.yaml',
        help='Path to configuration file'
    )
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        logger.error(f"Config file not found: {args.config}")
        sys.exit(1)
    
    shipper = LogShipper(args.config)
    
    # Handle signals
    def signal_handler(sig, frame):
        shipper.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    shipper.start()


if __name__ == '__main__':
    main()
