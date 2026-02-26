# SIEM Integration Guide - Isaiah's Setup

This document covers the Wazuh SIEM integration between the GuardQuote infrastructure and Isaiah's Wazuh manager.

## Overview

Isaiah is deploying a Wazuh SIEM for his capstone project. This infrastructure will feed logs and security events to his SIEM instance.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GuardQuote Infrastructure                     │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  PA-220  │    │   UDM    │    │   pi0    │    │   pi1    │  │
│  │(firewall)│    │ (router) │    │(monitor) │    │(services)│  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       └───────────────┴───────┬───────┴───────────────┘         │
│                               │                                  │
│                        ┌──────┴──────┐                          │
│                        │   Vector    │                          │
│                        │ (pi0:agent) │                          │
│                        └──────┬──────┘                          │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                         Tailscale Mesh
                         (Encrypted WireGuard)
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Isaiah's Wazuh SIEM                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Wazuh Manager                             │ │
│  │  • Agent Registration (1514/tcp)                            │ │
│  │  • Log Ingestion (1515/tcp)                                 │ │
│  │  • API (55000/tcp)                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌───────────────────────────┴────────────────────────────────┐  │
│  │                    Analysis & Alerts                        │  │
│  │  • Rule matching        • FIM alerts                        │  │
│  │  • Threat detection     • Vulnerability reports            │  │
│  │  • Compliance checks    • Dashboard visualization          │  │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## What Isaiah Needs to Provide

### 1. Wazuh Manager Address

Preferred: Tailscale hostname (e.g., `isaiah-wazuh.tail12345.ts.net`)
Alternative: Tailscale IP (e.g., `100.x.x.x`)

### 2. Agent Registration Keys

Generate on the Wazuh manager:

```bash
# On Wazuh manager
/var/ossec/bin/manage_agents

# Choose (A) to add agents
# Agent name: pi0
# Agent IP: any (or [tailscale-ip])
# Extract key

# Repeat for pi1
# Agent name: pi1  
# Agent IP: any (or [tailscale-ip])
```

Provide two keys:
- `PI0_AGENT_KEY=MDAxIHBpMCAx...`
- `PI1_AGENT_KEY=MDAxIHBpMSAx...`

## What Gets Monitored

### Log Sources

| Source | Path | Description |
|--------|------|-------------|
| syslog | /var/log/syslog | System messages |
| auth | /var/log/auth.log | Authentication events |
| kernel | /var/log/kern.log | Kernel messages |
| docker | /var/log/docker.log | Container logs |
| guardquote | /var/log/guardquote/ | Application logs |

### Security Features

| Feature | Description |
|---------|-------------|
| **File Integrity** | Monitor /etc, /usr/bin, application files |
| **Rootkit Detection** | Known rootkit signatures |
| **Vulnerability Scan** | Ubuntu CVE database checks |
| **System Inventory** | Packages, ports, processes |
| **Log Analysis** | Pattern matching, anomaly detection |

## Deployment Steps

### Step 1: Isaiah Sets Up Manager

1. Install Wazuh manager on his system
2. Join Tailscale network (get invite from Rafa)
3. Generate agent keys for pi0 and pi1
4. Share manager address and keys

### Step 2: We Deploy Agents

```bash
# On pi0
export WAZUH_MANAGER="isaiah-wazuh.ts.net"
export WAZUH_AGENT_KEY="<key-from-isaiah>"
cd ~/.openclaw/workspace/scripts
sudo -E ./wazuh-agent-install.sh

# On pi1 (similar)
```

### Step 3: Verify Connection

```bash
# Check agent status
sudo /var/ossec/bin/agent_control -l

# View logs
sudo tail -f /var/ossec/logs/ossec.log
```

## Alternative: Vector Forwarding

If Wazuh agents are problematic, we can forward via Vector:

```toml
# /etc/vector/vector.toml on pi0
[sinks.wazuh]
type = "socket"
inputs = ["journald", "auth_logs"]
address = "isaiah-wazuh.ts.net:1514"
mode = "tcp"
encoding.codec = "json"
```

## Tailscale Network

Both sides need Tailscale:
- **Our side**: pi0 ([tailscale-ip]), pi1 ([tailscale-ip])
- **Isaiah's side**: His Wazuh manager

Benefits:
- Encrypted WireGuard tunnel
- No port forwarding needed
- Works across NATs
- Automatic DNS (*.ts.net)

## Testing Connectivity

```bash
# From pi0, test connection to Isaiah's manager
nc -zv isaiah-wazuh.ts.net 1514
nc -zv isaiah-wazuh.ts.net 1515

# Ping test
ping isaiah-wazuh.ts.net
```

## Contact

- **Isaiah Bernal** - SIEM setup, Wazuh manager
- **Rafa** - Infrastructure, agent deployment
- **Team Slack** - #guardquote-infra

---

Last updated: 2026-02-06
