# Infrastructure Setup Guide

Complete setup guide for GuardQuote Pi cluster infrastructure.

---

## Network Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           192.168.2.0/24 Network                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌─────────────────┐                                                     │
│     │     Router      │                                                     │
│     │   192.168.2.1   │                                                     │
│     └────────┬────────┘                                                     │
│              │                                                              │
│     ┌────────┼────────┬────────────────┬────────────────┐                  │
│     │        │        │                │                │                  │
│  ┌──┴──┐  ┌──┴──┐  ┌──┴──┐         ┌──┴──┐         ┌──┴──┐               │
│  │ Pi1 │  │Syslog│  │ Dev │         │ Pi2 │         │ GW  │               │
│  │ .70 │  │ .101 │  │(you)│         │ .x  │         │ .x  │               │
│  │  ●  │  │  ●   │  │  ●  │         │  ◌  │         │  ◌  │               │
│  └──┬──┘  └──┬──┘  └──┬──┘         └──┬──┘         └──┬──┘               │
│     │        │        │                │                │                  │
│  ┌──┴──┐  ┌──┴──┐  ┌──┴──┐         ┌──┴──┐         ┌──┴──┐               │
│  │Pgsql│  │rsyslg│ │ Bun │         │Redis│         │Nginx│               │
│  │Redis│  │Prom │  │ API │         │LDAP │         │Kong │               │
│  │pgbnc│  │Graf │  │     │         │     │         │Cert │               │
│  └─────┘  └─────┘  └─────┘         └─────┘         └─────┘               │
│                                                                             │
│  Legend: ● = Active   ◌ = Planned                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Server Details

### Pi1 - Database Server (192.168.2.70)

| Property | Value |
|----------|-------|
| Hostname | pi-db |
| IP | 192.168.2.70 |
| OS | Raspberry Pi OS (Debian 12) |
| SSH User | johnmarston |
| Role | Primary Database + Cache |

**Services:**
- PostgreSQL 15 (port 5432)
- Redis 7 (port 6379)
- PgBouncer (port 6432)
- Node Exporter (port 9100)
- Postgres Exporter (port 9187)

**Storage:**
- `/var/lib/postgresql/` - Database files
- `/var/lib/redis/` - Redis persistence
- `/tmp/guardquote-backups/` - Backup staging

---

### Syslog Server (192.168.2.101)

| Property | Value |
|----------|-------|
| Hostname | syslog |
| IP | 192.168.2.101 |
| OS | Ubuntu 22.04 / Debian 12 |
| SSH User | user |
| Role | Logging + Monitoring |

**Services:**
- rsyslog (UDP 514)
- Prometheus (port 9090)
- Grafana (port 3001)
- Alertmanager (port 9093)
- Node Exporter (port 9100)

**Storage:**
- `/var/log/guardquote.log` - Application logs
- `/var/lib/prometheus/` - Metrics data
- `/var/lib/grafana/` - Dashboards

---

## Package Installation

### Pi1 - Database Server

```bash
# SSH to Pi
ssh johnmarston@192.168.2.70

# Update system
sudo apt update && sudo apt upgrade -y

# Core packages
sudo apt install -y \
  postgresql-15 \
  postgresql-contrib-15 \
  redis-server \
  pgbouncer

# Monitoring packages
sudo apt install -y \
  prometheus-node-exporter \
  prometheus-postgres-exporter

# Security packages
sudo apt install -y \
  fail2ban \
  ufw

# Utility packages
sudo apt install -y \
  htop \
  iotop \
  ncdu \
  tmux \
  git \
  curl \
  jq
```

### Syslog Server

```bash
# SSH to syslog server
ssh user@192.168.2.101

# Update system
sudo apt update && sudo apt upgrade -y

# Logging packages
sudo apt install -y \
  rsyslog \
  rsyslog-relp \
  logrotate

# Monitoring packages (add Grafana repo first)
sudo apt install -y software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update

sudo apt install -y \
  prometheus \
  prometheus-node-exporter \
  prometheus-alertmanager \
  grafana

# Security packages
sudo apt install -y \
  fail2ban \
  ufw

# Utility packages
sudo apt install -y \
  htop \
  nethogs \
  tcpdump \
  nmap \
  curl \
  jq
```

---

## Service Configuration

### PostgreSQL (Pi1)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
```

```ini
# Listen on all interfaces
listen_addresses = '*'

# Performance tuning for Pi
shared_buffers = 256MB
effective_cache_size = 512MB
work_mem = 16MB
maintenance_work_mem = 64MB

# Logging
log_destination = 'syslog'
syslog_facility = 'LOCAL0'
syslog_ident = 'postgres'
log_min_duration_statement = 1000
```

```bash
# Edit pg_hba.conf for remote access
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

```
# Add this line for network access
host    guardquote    guardquote    192.168.2.0/24    scram-sha-256
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### Redis (Pi1)

```bash
sudo nano /etc/redis/redis.conf
```

```ini
# Network
bind 0.0.0.0
port 6379
protected-mode yes
requirepass your_redis_password

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### PgBouncer (Pi1)

```bash
sudo nano /etc/pgbouncer/pgbouncer.ini
```

```ini
[databases]
guardquote = host=127.0.0.1 port=5432 dbname=guardquote

[pgbouncer]
listen_addr = *
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

```bash
# Create userlist.txt
echo '"guardquote" "WPU8bj3nbwFyZFEtHZQz"' | sudo tee /etc/pgbouncer/userlist.txt
sudo systemctl restart pgbouncer
sudo systemctl enable pgbouncer
```

### rsyslog (Syslog Server)

```bash
sudo nano /etc/rsyslog.d/guardquote.conf
```

```
# UDP listener
module(load="imudp")
input(type="imudp" port="514")

# GuardQuote logs
local0.*    /var/log/guardquote.log
```

```bash
sudo systemctl restart rsyslog
sudo systemctl enable rsyslog
```

### Prometheus (Syslog Server)

```bash
sudo nano /etc/prometheus/prometheus.yml
```

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets:
        - 'localhost:9100'
        - '192.168.2.70:9100'

  - job_name: 'postgres'
    static_configs:
      - targets: ['192.168.2.70:9187']

  - job_name: 'guardquote'
    static_configs:
      - targets: ['YOUR_DEV_IP:3000']
    metrics_path: '/metrics'
```

```bash
sudo systemctl restart prometheus
sudo systemctl enable prometheus
```

### Grafana (Syslog Server)

```bash
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
# Access at http://192.168.2.101:3001
# Default: admin/admin
```

---

## Firewall Configuration

### Pi1

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp

# PostgreSQL (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 5432

# Redis (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 6379

# PgBouncer (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 6432

# Node exporter (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 9100
sudo ufw allow from 192.168.2.0/24 to any port 9187

sudo ufw enable
```

### Syslog Server

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp

# Syslog (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 514/udp

# Prometheus (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 9090

# Grafana (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 3001

# Alertmanager (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 9093

# Node exporter (internal only)
sudo ufw allow from 192.168.2.0/24 to any port 9100

sudo ufw enable
```

---

## Fail2ban Configuration

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
```

```bash
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

---

## Health Check Commands

```bash
# Check all services on Pi1
ssh johnmarston@192.168.2.70 "
  echo '=== PostgreSQL ===' && sudo systemctl is-active postgresql
  echo '=== Redis ===' && sudo systemctl is-active redis-server
  echo '=== PgBouncer ===' && sudo systemctl is-active pgbouncer
  echo '=== Node Exporter ===' && sudo systemctl is-active prometheus-node-exporter
  echo '=== UFW ===' && sudo ufw status
  echo '=== Fail2ban ===' && sudo systemctl is-active fail2ban
"

# Check all services on Syslog
ssh user@192.168.2.101 "
  echo '=== rsyslog ===' && sudo systemctl is-active rsyslog
  echo '=== Prometheus ===' && sudo systemctl is-active prometheus
  echo '=== Grafana ===' && sudo systemctl is-active grafana-server
  echo '=== Node Exporter ===' && sudo systemctl is-active prometheus-node-exporter
"
```

---

## Future Infrastructure

### API Gateway Server

```bash
# Packages
sudo apt install -y nginx nginx-extras certbot python3-certbot-nginx

# Or Kong
curl -Lo kong.deb "https://download.konghq.com/gateway-3.x-ubuntu-$(lsb_release -cs)/pool/all/k/kong/kong_3.5.0_amd64.deb"
sudo dpkg -i kong.deb
```

### LDAP Server

```bash
# OpenLDAP
sudo apt install -y slapd ldap-utils

# SSSD for client auth
sudo apt install -y sssd sssd-ldap sssd-tools
```

### SIEM Server

```bash
# Wazuh Manager
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt update
sudo apt install -y wazuh-manager

# Suricata IDS
sudo apt install -y suricata
```
