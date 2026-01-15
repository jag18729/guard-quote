# Ubuntu/Debian Package Reference

Complete package list for GuardQuote infrastructure.

---

## Quick Install Scripts

### Pi1 - Database Server (192.168.2.70)

```bash
#!/bin/bash
# pi1-setup.sh - Run on Raspberry Pi database server

set -e

echo "=== Updating System ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Core Packages ==="
sudo apt install -y \
  postgresql-15 \
  postgresql-contrib-15 \
  redis-server \
  pgbouncer

echo "=== Installing Monitoring ==="
sudo apt install -y \
  prometheus-node-exporter

# Postgres exporter (manual install)
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-arm64.tar.gz
tar xvf postgres_exporter-*.tar.gz
sudo mv postgres_exporter-*/postgres_exporter /usr/local/bin/
rm -rf postgres_exporter-*

echo "=== Installing Security ==="
sudo apt install -y \
  fail2ban \
  ufw

echo "=== Installing Utilities ==="
sudo apt install -y \
  htop \
  iotop \
  ncdu \
  tmux \
  git \
  curl \
  jq \
  vim \
  net-tools

echo "=== Enabling Services ==="
sudo systemctl enable postgresql
sudo systemctl enable redis-server
sudo systemctl enable prometheus-node-exporter
sudo systemctl enable fail2ban

echo "=== Setup Complete ==="
```

### Syslog Server (192.168.2.101)

```bash
#!/bin/bash
# syslog-setup.sh - Run on syslog/monitoring server

set -e

echo "=== Updating System ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Logging ==="
sudo apt install -y \
  rsyslog \
  rsyslog-relp \
  logrotate

echo "=== Adding Grafana Repository ==="
sudo apt install -y software-properties-common gnupg2
wget -q -O - https://packages.grafana.com/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/grafana.gpg
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update

echo "=== Installing Monitoring ==="
sudo apt install -y \
  prometheus \
  prometheus-node-exporter \
  prometheus-alertmanager \
  grafana

echo "=== Installing Security ==="
sudo apt install -y \
  fail2ban \
  ufw

echo "=== Installing Utilities ==="
sudo apt install -y \
  htop \
  nethogs \
  tcpdump \
  nmap \
  curl \
  jq \
  vim

echo "=== Enabling Services ==="
sudo systemctl enable rsyslog
sudo systemctl enable prometheus
sudo systemctl enable prometheus-node-exporter
sudo systemctl enable prometheus-alertmanager
sudo systemctl enable grafana-server
sudo systemctl enable fail2ban

echo "=== Starting Services ==="
sudo systemctl start rsyslog
sudo systemctl start prometheus
sudo systemctl start grafana-server

echo "=== Setup Complete ==="
echo "Grafana: http://$(hostname -I | awk '{print $1}'):3000"
echo "Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
```

---

## Package Categories

### Database & Caching

| Package | Description | Port | Server |
|---------|-------------|------|--------|
| `postgresql-15` | PostgreSQL database | 5432 | Pi1 |
| `postgresql-contrib-15` | PostgreSQL extensions | - | Pi1 |
| `redis-server` | In-memory cache | 6379 | Pi1 |
| `pgbouncer` | Connection pooler | 6432 | Pi1 |
| `pgpool2` | Load balancer (optional) | 9999 | Pi1 |

### Logging

| Package | Description | Port | Server |
|---------|-------------|------|--------|
| `rsyslog` | System logger | 514/UDP | Syslog |
| `rsyslog-relp` | Reliable log delivery | 2514 | Syslog |
| `logrotate` | Log rotation | - | All |

### Monitoring

| Package | Description | Port | Server |
|---------|-------------|------|--------|
| `prometheus` | Metrics collection | 9090 | Syslog |
| `prometheus-node-exporter` | System metrics | 9100 | All |
| `prometheus-postgres-exporter` | PostgreSQL metrics | 9187 | Pi1 |
| `prometheus-alertmanager` | Alert routing | 9093 | Syslog |
| `grafana` | Dashboards | 3000 | Syslog |

### Security

| Package | Description | Purpose | Server |
|---------|-------------|---------|--------|
| `fail2ban` | Brute-force protection | SSH/HTTP | All |
| `ufw` | Firewall | Network security | All |
| `apparmor` | Mandatory access control | Process isolation | All |
| `unattended-upgrades` | Auto security updates | Patching | All |

### Networking

| Package | Description | Purpose |
|---------|-------------|---------|
| `nginx` | Reverse proxy | API Gateway |
| `nginx-extras` | Extra modules | Lua, headers |
| `certbot` | SSL certificates | HTTPS |
| `haproxy` | Load balancer | High availability |

### Utilities

| Package | Description | Usage |
|---------|-------------|-------|
| `htop` | Process viewer | Monitoring |
| `iotop` | I/O monitor | Disk analysis |
| `nethogs` | Network monitor | Bandwidth |
| `ncdu` | Disk usage | Storage |
| `tmux` | Terminal multiplexer | Sessions |
| `tcpdump` | Packet capture | Debugging |
| `nmap` | Port scanner | Discovery |
| `curl` | HTTP client | Testing |
| `jq` | JSON processor | Parsing |

---

## Future Packages

### API Gateway

```bash
# Nginx with extras
sudo apt install -y nginx nginx-extras

# Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Kong (alternative)
# Add Kong repo first
curl -Lo kong.deb "https://download.konghq.com/gateway-3.x-ubuntu-jammy/pool/all/k/kong/kong_3.5.0_amd64.deb"
sudo dpkg -i kong.deb
```

### LDAP/Directory

```bash
# OpenLDAP server
sudo apt install -y slapd ldap-utils

# SSSD client
sudo apt install -y sssd sssd-ldap sssd-tools libpam-sss libnss-sss
```

### SIEM/Security

```bash
# Wazuh (add repo first)
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt update
sudo apt install -y wazuh-manager wazuh-agent

# Suricata IDS
sudo apt install -y suricata suricata-update
```

### Container Runtime (Optional)

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Podman (alternative)
sudo apt install -y podman
```

---

## Version Requirements

| Package | Minimum Version | Recommended |
|---------|----------------|-------------|
| PostgreSQL | 14 | 15+ |
| Redis | 6 | 7+ |
| Prometheus | 2.40 | 2.45+ |
| Grafana | 9.0 | 10+ |
| Node.js | 18 (if needed) | 20+ |
| Bun | 1.0 | 1.3+ |

---

## Verification Commands

```bash
# Check installed packages
dpkg -l | grep -E "postgresql|redis|prometheus|grafana|rsyslog"

# Check versions
postgres --version
redis-server --version
prometheus --version
grafana-server -v

# Check listening ports
sudo ss -tlnp

# Check services
systemctl list-units --type=service --state=running | grep -E "postgres|redis|prometheus|grafana|rsyslog"
```

---

## Uninstall Commands

```bash
# Remove package but keep config
sudo apt remove <package>

# Remove package and config
sudo apt purge <package>

# Remove unused dependencies
sudo apt autoremove

# Clean package cache
sudo apt clean
```

---

## Troubleshooting

### Package Not Found

```bash
# Update package lists
sudo apt update

# Search for package
apt search <package>

# Check if repo is enabled
cat /etc/apt/sources.list.d/*.list
```

### Dependency Issues

```bash
# Fix broken dependencies
sudo apt --fix-broken install

# Force install with dependencies
sudo apt install -f <package>
```

### Service Won't Start

```bash
# Check service status
sudo systemctl status <service>

# Check logs
sudo journalctl -u <service> -n 50

# Check config syntax
# PostgreSQL
sudo -u postgres pg_isready

# Redis
redis-cli ping

# Nginx
sudo nginx -t
```
