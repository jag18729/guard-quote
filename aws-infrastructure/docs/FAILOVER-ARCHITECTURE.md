# GuardQuote Failover Architecture

## Overview

This document describes the multi-layer failover architecture integrating Pi1, AWS, and Cloudflare.

## Traffic Flow (Normal Operation)

```
┌──────────────┐
│   Client     │
│   Browser    │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                            │
│  ┌────────────────┐      ┌─────────────────────────────────┐ │
│  │ Cloudflare     │      │ Cloudflare Worker               │ │
│  │ Pages          │      │ (API Proxy + Failover)          │ │
│  │ ────────────── │      │ ─────────────────────────────── │ │
│  │ /              │      │ /api/*  → AWS ALB (primary)     │ │
│  │ /assets/*      │      │         → Pi1 Tunnel (backup)   │ │
│  │ /static/*      │      │ /ws/*   → AWS WebSocket         │ │
│  └───────┬────────┘      └──────────────┬──────────────────┘ │
│          │                              │                     │
└──────────┼──────────────────────────────┼─────────────────────┘
           │                              │
           │ (static)                     │ (dynamic)
           ▼                              ▼
    ┌──────────────┐            ┌─────────────────┐
    │ S3 Origin    │            │ AWS ALB         │
    │ (via OAC)    │            │ (Primary API)   │
    └──────────────┘            └────────┬────────┘
                                         │
                      ┌──────────────────┼──────────────────┐
                      ▼                  ▼                  ▼
               ┌────────────┐    ┌────────────┐    ┌────────────┐
               │ Backend    │    │ ML Engine  │    │ WebSocket  │
               │ (ECS)      │    │ (ECS)      │    │ (ECS)      │
               └─────┬──────┘    └─────┬──────┘    └────────────┘
                     │                 │
                     └────────┬────────┘
                              ▼
                     ┌────────────────┐
                     │ Aurora         │
                     │ Serverless     │◄─── Replication ───┐
                     │ (Primary DB)   │                    │
                     └────────────────┘                    │
                              │                            │
                     ┌────────────────┐            ┌───────┴────────┐
                     │ ElastiCache    │            │ Pi1 PostgreSQL │
                     │ Redis          │            │ (Source)       │
                     └────────────────┘            └────────────────┘
```

## Failover Scenarios

### Scenario 1: AWS API Degraded (Latency > 5s)

```
                    ┌─────────────────────┐
                    │ Cloudflare Worker   │
                    │ ─────────────────── │
                    │ 1. Request to AWS   │
                    │ 2. Timeout (5s)     │
                    │ 3. Fallback to Pi1  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
    ┌─────────────────┐              ┌─────────────────┐
    │ AWS ALB         │              │ Cloudflare      │
    │ ⚠️ SLOW/ERROR   │              │ Tunnel → Pi1    │
    │ (skipped)       │              │ ✅ HEALTHY      │
    └─────────────────┘              └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │ Pi1 Backend     │
                                     │ (via Tunnel)    │
                                     └────────┬────────┘
                                              │
                                     ┌────────┴────────┐
                                     ▼                 ▼
                              ┌───────────┐    ┌───────────┐
                              │ PostgreSQL│    │ Redis     │
                              │ (Primary) │    │           │
                              └───────────┘    └───────────┘
```

### Scenario 2: AWS Completely Down

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ const response = await Promise.race([                   │ │
│ │   fetchAWS(request).catch(() => null),                  │ │
│ │   fetchPi1(request),                                    │ │
│ │ ]);                                                     │ │
│ │                                                         │ │
│ │ // AWS times out, Pi1 responds                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Cloudflare Tunnel   │
                    │ ───────────────────│
                    │ tunnel.guardquote   │
                    │ .cfargotunnel.com   │
                    └──────────┬──────────┘
                               │ (encrypted)
                               ▼
                    ┌─────────────────────┐
                    │ Pi1 (192.168.2.70)  │
                    │ ─────────────────── │
                    │ cloudflared daemon  │
                    │ → localhost:3000    │
                    └─────────────────────┘
```

### Scenario 3: Pi1 Down (AWS Only)

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ // Pi1 health check fails, route to AWS only            │ │
│ │ if (!pi1Healthy) {                                      │ │
│ │   return fetchAWS(request);                             │ │
│ │ }                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ AWS ALB             │
                    │ ✅ HEALTHY          │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │ Backend (ECS)   │   │ ML Engine (ECS) │
          └────────┬────────┘   └────────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌─────────────────────┐
                    │ Aurora Serverless   │
                    │ (Last replicated    │
                    │  data from Pi1)     │
                    └─────────────────────┘
```

## Health Check Implementation

### Cloudflare Worker Health Checks

```javascript
// Health check endpoints
const HEALTH_ENDPOINTS = {
  aws: 'https://api.guardquote.com/health',
  pi1: 'https://pi1.guardquote.com/health', // via Tunnel
};

// Health status cache (KV store)
async function checkHealth(env) {
  const results = await Promise.allSettled([
    fetch(HEALTH_ENDPOINTS.aws, { method: 'HEAD', cf: { cacheTtl: 0 } }),
    fetch(HEALTH_ENDPOINTS.pi1, { method: 'HEAD', cf: { cacheTtl: 0 } }),
  ]);

  const health = {
    aws: results[0].status === 'fulfilled' && results[0].value.ok,
    pi1: results[1].status === 'fulfilled' && results[1].value.ok,
    timestamp: Date.now(),
  };

  // Store in KV for other workers
  await env.HEALTH_KV.put('status', JSON.stringify(health), { expirationTtl: 60 });

  return health;
}
```

### AWS Health Check Lambda

```python
# Lambda function triggered every 1 minute
import boto3
import requests

def handler(event, context):
    cloudwatch = boto3.client('cloudwatch')

    endpoints = [
        ('Backend', 'http://internal-alb/health'),
        ('MLEngine', 'http://internal-alb/ml/health'),
        ('Aurora', check_aurora_health),
        ('Redis', check_redis_health),
    ]

    for name, check in endpoints:
        try:
            if callable(check):
                healthy = check()
            else:
                response = requests.get(check, timeout=5)
                healthy = response.status_code == 200
        except:
            healthy = False

        cloudwatch.put_metric_data(
            Namespace='GuardQuote/Health',
            MetricData=[{
                'MetricName': f'{name}Health',
                'Value': 1 if healthy else 0,
                'Unit': 'Count'
            }]
        )
```

## Data Consistency Strategy

### During Normal Operation

```
┌─────────────────────────────────────────────────────────────────┐
│                     Write Path                                   │
│                                                                  │
│  Client ──► Cloudflare ──► AWS Backend ──► Aurora (Primary)     │
│                                               │                  │
│                                               │ (async)          │
│                                               ▼                  │
│                                          Pi1 PostgreSQL         │
│                                          (Logical Replica)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Read Path                                    │
│                                                                  │
│  Client ──► Cloudflare ──► AWS Backend ──► Aurora (Read)        │
│                                                                  │
│  (Cache hit)                                                     │
│  Client ──► Cloudflare ──► AWS Backend ──► ElastiCache          │
└─────────────────────────────────────────────────────────────────┘
```

### During Failover (AWS Down)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Write Path (Failover)                        │
│                                                                  │
│  Client ──► Cloudflare ──► CF Tunnel ──► Pi1 Backend            │
│                                            │                     │
│                                            ▼                     │
│                                       PostgreSQL (Primary)       │
│                                                                  │
│  ⚠️ Aurora is now STALE until AWS recovers                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Recovery (AWS Back)                          │
│                                                                  │
│  1. AWS comes back online                                        │
│  2. Aurora catches up from Pi1 replication                       │
│  3. Cloudflare Worker detects AWS healthy                        │
│  4. Traffic gradually shifts back to AWS                         │
│  5. Verify data consistency                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Cloudflare Tunnel Setup on Pi1

### Installation

```bash
# SSH to Pi1
ssh pi1

# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create guardquote-pi1

# Configure tunnel
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/johnmarston/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Backend API
  - hostname: api-pi1.guardquote.com
    service: http://localhost:3000
  # ML Engine
  - hostname: ml-pi1.guardquote.com
    service: http://localhost:8000
  # Health check
  - hostname: health-pi1.guardquote.com
    service: http://localhost:3000/health
  # Catch-all
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns guardquote-pi1 api-pi1.guardquote.com
cloudflared tunnel route dns guardquote-pi1 ml-pi1.guardquote.com

# Install as service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Verify
sudo systemctl status cloudflared
cloudflared tunnel info guardquote-pi1
```

### Systemd Service

```ini
# /etc/systemd/system/cloudflared.service
[Unit]
Description=Cloudflare Tunnel for GuardQuote Pi1
After=network.target

[Service]
Type=simple
User=johnmarston
ExecStart=/usr/local/bin/cloudflared tunnel run guardquote-pi1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Monitoring Dashboard

### Cloudflare Analytics

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Error Rate | > 1% | Check origin health |
| Cache Hit Ratio | < 80% | Review cache rules |
| Latency (p95) | > 500ms | Check origin performance |
| Requests/min | Unusual spike | Potential DDoS |

### AWS CloudWatch

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| ALB 5xx Rate | > 1% | Check backend health |
| Aurora CPU | > 80% | Scale up ACUs |
| Redis Memory | > 80% | Increase node size |
| ECS CPU | > 80% | Add tasks |

### Pi1 Prometheus

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| PostgreSQL Connections | > 80% of max | Check connection leaks |
| Redis Memory | > 80% | Flush cache or increase |
| Disk Usage | > 80% | Clean up or expand |
| Replication Lag | > 60s | Check network |

## Runbook: Failover Procedures

### Manual Failover to Pi1

```bash
# 1. Verify Pi1 is healthy
curl https://health-pi1.guardquote.com

# 2. Update Cloudflare Worker to force Pi1
# (via Cloudflare Dashboard or Wrangler)
wrangler kv:key put --binding=CONFIG "FORCE_ORIGIN" "pi1"

# 3. Monitor traffic shift
# Check Cloudflare Analytics

# 4. Verify responses are from Pi1
curl -I https://api.guardquote.com/health
# Should show X-Origin: pi1
```

### Manual Failback to AWS

```bash
# 1. Verify AWS is healthy
curl https://api.guardquote.aws.internal/health

# 2. Check Aurora replication lag
aws rds describe-db-clusters --query 'DBClusters[0].ReplicationLag'

# 3. Remove force flag
wrangler kv:key delete --binding=CONFIG "FORCE_ORIGIN"

# 4. Monitor traffic shift back to AWS

# 5. Verify data consistency
# Compare row counts, checksums
```

---

## Summary

| Layer | Primary | Failover | Detection |
|-------|---------|----------|-----------|
| DNS | Cloudflare | - | - |
| Edge/CDN | Cloudflare Pages | - | - |
| API Routing | CF Worker → AWS | CF Worker → Pi1 Tunnel | Worker health checks |
| Backend | ECS Fargate | Pi1 (via Tunnel) | ALB health checks |
| Database | Aurora Serverless | Pi1 PostgreSQL | Replication monitoring |
| Cache | ElastiCache | Pi1 Redis | Connection health |

**Total Failover Time:** < 30 seconds (automatic)
**Manual Override:** Available via Cloudflare KV flag
