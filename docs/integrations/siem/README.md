# SIEM Integration Guide

> Comprehensive guide for integrating external SIEM systems with the Vandine home lab.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Options](#architecture-options)
3. [Tailscale Setup](#tailscale-setup)
4. [Webhook Push Setup](#webhook-push-setup)
5. [Log Sources](#log-sources)
6. [Sample Data](#sample-data)
7. [Detection Rules](#detection-rules)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers how to ship logs from the Vandine home lab to an external SIEM system. The architecture prioritizes security while maintaining real-time log delivery.

### Design Principles

- **Zero inbound exposure** - No ports opened to the internet
- **Defense in depth** - Multiple authentication layers
- **RBAC** - Principle of least privilege
- **Encryption** - All traffic encrypted in transit

### Current Implementation

| Path | Method | Use Case |
|------|--------|----------|
| **Primary** | Tailscale + Syslog | Real-time, low-latency |
| **Backup** | NordVPN + Webhook | Failover, IP allowlisting |

---

## Architecture Options

### Option 1: Tailscale Direct (Recommended)

```
┌──────────────────────────────────────────────────────────────┐
│  Vandine Home Lab                                             │
│                                                               │
│   ┌─────────┐                                                │
│   │   pi0   │──────► Tailscale ──────► SIEM Receiver         │
│   │ :514/UDP│        Mesh VPN          (Bastion Host)        │
│   └─────────┘        (Encrypted)                             │
│                                                               │
│   ACL: "siem-client can only reach pi0:514"                  │
└──────────────────────────────────────────────────────────────┘
```

**Pros:**
- Real-time syslog delivery
- Zero network exposure
- ACL-based access control
- WireGuard encryption

**Cons:**
- Requires Tailscale installation on SIEM

### Option 2: Webhook Push (Backup)

```
┌──────────────────────────────────────────────────────────────┐
│  Vandine Home Lab                                             │
│                                                               │
│   ┌─────────┐     ┌───────────┐     ┌──────────────┐        │
│   │   pi0   │────►│   Nord    │────►│ SIEM Webhook │        │
│   │  Logs   │     │  VPN      │     │  Receiver    │        │
│   └─────────┘     │ (Egress)  │     │              │        │
│                   │ 203.x.x.x │     │ IP Allowlist │        │
│                   └───────────┘     └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

**Pros:**
- Outbound only (no inbound exposure)
- IP allowlisting for extra security
- Works without VPN on SIEM side

**Cons:**
- Batch delivery (not real-time)
- Requires webhook endpoint on SIEM

---

## Tailscale Setup

### Prerequisites

1. Tailscale account (invite from admin)
2. Tailscale client installed
3. SSH public key (for admin access, optional)

### Step 1: Request Access

Contact the network admin:
- **Email:** rafael.garcia.contact.me@gmail.com
- **Discord:** @openSourced

Provide:
- Your email address
- Device type (macOS/Windows/Linux)
- Purpose (SIEM integration)

### Step 2: Install Tailscale

#### macOS
```bash
# Download from Mac App Store or:
brew install tailscale
```

#### Windows
Download from https://tailscale.com/download/windows

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### Step 3: Connect

```bash
# Start Tailscale
sudo tailscale up

# Verify connection
tailscale status

# You should see:
# 100.x.x.101  pi0      vandine@     linux   -
# 100.x.x.70   pi1      vandine@     linux   -
```

### Step 4: Configure SIEM to Receive Syslog

On your SIEM/Bastion (after connecting to Tailscale):

```bash
# Get pi0's Tailscale IP
tailscale status | grep pi0

# Configure rsyslog to receive from pi0
sudo cat >> /etc/rsyslog.conf << 'EOF'
# Receive syslog from Vandine pi0
module(load="imudp")
input(type="imudp" port="514")
EOF

sudo systemctl restart rsyslog

# Test connectivity
nc -vz <pi0-tailscale-ip> 514
```

### Tailscale ACL Policy

The network is configured with these ACLs:

```json
{
  "acls": [
    {
      // SIEM client can only reach pi0 syslog
      "action": "accept",
      "src": ["tag:siem-client"],
      "dst": ["tag:log-server:514"]
    },
    {
      // Admins have full access
      "action": "accept",
      "src": ["group:admin"],
      "dst": ["*:*"]
    }
  ],
  "tagOwners": {
    "tag:siem-client": ["rafael.garcia.contact.me@gmail.com"],
    "tag:log-server": ["rafael.garcia.contact.me@gmail.com"]
  },
  "groups": {
    "group:admin": ["rafael.garcia.contact.me@gmail.com"]
  }
}
```

---

## Webhook Push Setup

### Architecture

```
pi0 → Log Shipper → NordVPN → HTTPS POST → SIEM Webhook
                    (Dedicated IP)         (IP Allowlist)
```

### Pi0 Configuration

**Install NordVPN:**
```bash
sh <(curl -sSf https://downloads.nordcdn.com/apps/linux/install.sh)
nordvpn login
nordvpn set technology nordlynx
nordvpn connect --group Dedicated_IP
```

**Deploy Log Shipper:**
```bash
# See scripts/siem/log-shipper.py
sudo cp scripts/siem/log-shipper.py /opt/log-shipper/
sudo cp scripts/siem/log-shipper.service /etc/systemd/system/
sudo systemctl enable --now log-shipper
```

### SIEM Webhook Receiver

Your SIEM needs a webhook endpoint that:
1. Accepts POST requests
2. Validates source IP (NordVPN dedicated IP)
3. Validates HMAC signature
4. Forwards to SIEM ingest pipeline

See [webhook-receiver.py](./samples/webhook-receiver.py) for reference implementation.

---

## Log Sources

### Pi0 (Log Aggregator)

| Log Type | Path | Format | Description |
|----------|------|--------|-------------|
| System | `/var/log/syslog` | Syslog RFC3164 | Main system log |
| Auth | `/var/log/auth.log` | Syslog RFC3164 | SSH, sudo, PAM |
| LDAP | `/var/log/slapd.log` | OpenLDAP | Authentication events |
| Kernel | `/var/log/kern.log` | Syslog RFC3164 | Kernel messages |
| Remote | `/var/log/remote/*.log` | Syslog RFC3164 | Logs from pi1 |

### Pi1 (Application Server)

| Log Type | Path | Format | Description |
|----------|------|--------|-------------|
| API | `/tmp/gq.log` | Custom JSON-ish | GuardQuote API |
| Nginx Access | `/var/log/nginx/access.log` | Combined | HTTP requests |
| Nginx Error | `/var/log/nginx/error.log` | Nginx | HTTP errors |
| PostgreSQL | `/var/log/postgresql/*.log` | PostgreSQL | Database events |
| Docker | `docker logs <name>` | JSON | Container logs |

### Log Format Examples

**Syslog (auth.log):**
```
Feb  6 13:45:22 pi1 sshd[1234]: Accepted publickey for user from 10.0.0.x port 54321 ssh2: RSA SHA256:xxx
```

**GuardQuote API:**
```
[2026-02-06T21:02:12.454Z] POST /api/auth/login 200 - 45ms
[AUTH] Login: admin@guardquote.vandine.us (admin)
[ERROR] Database connection timeout after 30000ms
```

**Nginx Access:**
```
10.0.0.x - - [06/Feb/2026:13:45:22 -0800] "GET /api/status HTTP/1.1" 200 156 "-" "curl/8.5.0"
```

---

## Sample Data

Sample log files are provided for testing your SIEM ingest pipeline before connecting to live data.

### Files

| File | Size | Description |
|------|------|-------------|
| [auth.log.sample](./samples/auth.log.sample) | 3KB | 24h of SSH/sudo events |
| [guardquote-api.log.sample](./samples/guardquote-api.log.sample) | 2.5KB | 24h of API logs |
| [logs-export.json](./samples/logs-export.json) | 5KB | Pre-parsed JSON format |

### Usage

```bash
# Import JSON to Elasticsearch
curl -X POST "localhost:9200/vandine-logs/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @logs-export.json

# Or use Filebeat
filebeat -e -c filebeat-sample.yml
```

---

## Detection Rules

### High Priority

| Rule | Query | Description |
|------|-------|-------------|
| SSH Brute Force | `source:auth AND "Failed password" \| stats count by src_ip \| where count > 3` | Multiple failed SSH attempts |
| Invalid User | `source:auth AND "Invalid user"` | SSH with non-existent user |
| API Auth Failure | `source:api AND status:401` | Failed API authentication |
| Privilege Escalation | `source:auth AND "sudo" AND "COMMAND="` | Sudo command execution |

### Medium Priority

| Rule | Query | Description |
|------|-------|-------------|
| New SSH Key | `source:auth AND "Accepted publickey"` | SSH key authentication |
| Permission Denied | `source:api AND status:403` | Authorization failure |
| Service Restart | `event_type:service_restart` | Admin action |
| Database Error | `"connection timeout" OR "database error"` | DB connectivity issues |

### Sigma Rules

See [detection-rules/](./detection-rules/) for Sigma format rules that can be converted to your SIEM's query language.

---

## Troubleshooting

### Tailscale Not Connecting

```bash
# Check Tailscale status
tailscale status

# Check if logged in
tailscale ip

# Re-authenticate
sudo tailscale up --reset
```

### No Logs Received

```bash
# Verify syslog is running on pi0
ssh pi0 'systemctl status rsyslog'

# Check connectivity
nc -vz <pi0-tailscale-ip> 514

# Test with netcat
echo "<14>Test message from SIEM" | nc -u <pi0-tailscale-ip> 514
```

### Webhook Delivery Failures

```bash
# Check log shipper status
ssh pi0 'systemctl status log-shipper'

# View shipper logs
ssh pi0 'journalctl -u log-shipper -f'

# Test connectivity
curl -v https://your-siem-webhook/health
```

---

## Contacts

| Role | Contact |
|------|---------|
| Network Admin | rafael.garcia.contact.me@gmail.com |
| Discord | @openSourced |

---

*Last updated: 2026-02-06*
