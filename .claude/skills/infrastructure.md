# GuardQuote Infrastructure Skill

Use this skill when working with GuardQuote infrastructure, SSH connections, or server management.

## Network

- **Subnet:** 192.168.2.0/24

## Servers

### Pi1 - Database & Monitoring Server
| Property | Value |
|----------|-------|
| Hostname | pi1 |
| IP | 192.168.2.70 |
| OS | Raspbian GNU/Linux 12 (bookworm) |
| SSH User | johnmarston |
| SSH Password | 481526 |
| SSH Command | `ssh pi1` or `sshpass -p '481526' ssh johnmarston@192.168.2.70` |

**Native Services:**
| Service | Port | Status | Password |
|---------|------|--------|----------|
| PostgreSQL 15 | 5432 | active | WPU8bj3nbwFyZFEtHZQz |
| Redis 7 | 6379 | active | guardquote_redis_2024 |
| PgBouncer | 6432 | active | WPU8bj3nbwFyZFEtHZQz |
| Pi-hole FTL | 53 | active | - |
| fail2ban | - | active | - |

**Docker Services:**
| Service | Port | Image |
|---------|------|-------|
| Prometheus | 9090 | prom/prometheus:latest |
| Grafana | 3000 | grafana/grafana:latest |
| Alertmanager | 9093 | prom/alertmanager:latest |
| Node Exporter | 9100 | prom/node-exporter:latest |
| Loki | - | grafana/loki:latest |
| Promtail | - | grafana/promtail:latest |
| cAdvisor | 8080 | gcr.io/cadvisor/cadvisor:latest |
| Blackbox Exporter | 9115 | prom/blackbox-exporter:latest |
| SNMP Exporter | 9116 | prom/snmp-exporter:latest |

**UFW Firewall Rules:**
- SSH (22) - Open to all
- DNS (53 TCP/UDP) - Open to all (Pi-hole)
- PostgreSQL (5432) - 192.168.2.0/24 and 192.168.1.0/24
- Redis (6379) - 192.168.2.0/24 and 192.168.1.0/24
- PgBouncer (6432) - 192.168.2.0/24 only
- Prometheus (9090) - 192.168.2.0/24 only
- Grafana (3000) - 192.168.2.0/24 only
- Alertmanager (9093) - 192.168.2.0/24 only
- Node Exporter (9100) - 192.168.2.0/24 only

### Pi0 - GitHub Actions Runner
| Property | Value |
|----------|-------|
| Hostname | pi0 |
| IP | 192.168.2.101 |
| SSH User | rafaeljg |
| SSH Password | adm1npassw0rD |
| SSH Command | `ssh pi0` or `sshpass -p 'adm1npassw0rD' ssh rafaeljg@192.168.2.101` |
| Role | Self-hosted GitHub Actions runner |

**Services:**
| Service | Status | Purpose |
|---------|--------|---------|
| GitHub Actions Runner | To configure | CI/CD jobs |
| rsyslog | Planned | Log aggregation |

**Runner Setup:** See `/runner-setup.md` skill for installation steps

## Quick Commands

### SSH to Pi0 (Runner)
```bash
ssh pi0
# or with password
sshpass -p 'adm1npassw0rD' ssh rafaeljg@192.168.2.101
```

### SSH to Pi1 (Database)
```bash
ssh pi1
# or with password
sshpass -p '481526' ssh johnmarston@192.168.2.70
```

### Check Pi1 Services
```bash
ssh pi1 "systemctl is-active postgresql redis-server pgbouncer fail2ban docker"
```

### Test Redis
```bash
ssh pi1 "redis-cli -a guardquote_redis_2024 ping"
```

### Test PostgreSQL
```bash
ssh pi1 "sudo -u postgres psql -c 'SELECT version();'"
```

### Check Docker Containers
```bash
ssh pi1 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

### Check UFW Status
```bash
ssh pi1 "sudo ufw status verbose"
```

### Check Listening Ports
```bash
ssh pi1 "ss -tln | grep -E ':5432|:6379|:6432|:9090|:9093|:9100|:3000'"
```

## Database Connection Strings

### Direct PostgreSQL
```
postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote
```

### Via PgBouncer (Recommended)
```
postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:6432/guardquote
```

### Redis
```
redis://:guardquote_redis_2024@192.168.2.70:6379
```

## Web UIs

| Service | URL |
|---------|-----|
| Pi-hole Admin | http://192.168.2.70:8080/admin |
| Grafana | http://192.168.2.70:3000 |
| Prometheus | http://192.168.2.70:9090 |
| Alertmanager | http://192.168.2.70:9093 |

## Pi-hole DNS

Pi1 runs Pi-hole v6 as the network DNS server.

**Configuration:**
- DNS Server: 192.168.2.70:53
- Web Admin: http://192.168.2.70:8080/admin
- Config File: /etc/pihole/pihole.toml
- Listening Mode: ALL (accepts from any network)
- Upstreams: 1.1.1.1, 1.0.0.1, 9.9.9.9, 149.112.112.112

**Quick Commands:**
```bash
# Check Pi-hole status
ssh pi1 "pihole status"

# View live query log
ssh pi1 "sudo pihole -t"

# Test DNS resolution
dig @192.168.2.70 google.com +short
```

## Configuration Files on Pi1

| Service | Config Path |
|---------|-------------|
| PostgreSQL | /etc/postgresql/15/main/postgresql.conf |
| PostgreSQL Auth | /etc/postgresql/15/main/pg_hba.conf |
| Redis | /etc/redis/redis.conf |
| PgBouncer | /etc/pgbouncer/pgbouncer.ini |
| PgBouncer Users | /etc/pgbouncer/userlist.txt |
| fail2ban | /etc/fail2ban/jail.local |

## Backups

### Automated Daily Backups (2 AM)
**Script:** `/home/johnmarston/backup-guardquote.sh`
**Cron:** `0 2 * * * /home/johnmarston/backup-guardquote.sh`

**What's backed up:**
| Item | Method | Size |
|------|--------|------|
| PostgreSQL | pg_dump -Fc | ~42KB |
| Redis | BGSAVE + copy | ~100B |
| Configs | tar.gz | ~30KB |

**Configs included:** postgresql.conf, pg_hba.conf, pgbouncer.ini, fail2ban, pihole.toml

**Storage:**
- Local (Pi1): `/home/johnmarston/backups/` - 3 day retention
- Remote (Pi0): `/home/rafaeljg/backups/pi1/` - 7 day retention (when accessible)

### Manual Backup
```bash
ssh pi1 "~/backup-guardquote.sh"
```

### Restore PostgreSQL
```bash
# Copy backup locally
scp pi1:~/backups/guardquote_YYYYMMDD_HHMMSS.dump ./

# Restore
ssh pi1 "sudo -u postgres pg_restore -d guardquote -c guardquote_YYYYMMDD.dump"
```

### Data Locations
- PostgreSQL data: /var/lib/postgresql/
- Redis data: /var/lib/redis/
- Backup staging: /home/johnmarston/backups/

## Resources (as of last check)

- **Disk:** 13GB free on /
- **RAM:** 6.7GB available
- **CPU:** ARM (Raspberry Pi)

---

*Last updated: January 15, 2026*
*Phase -1 Infrastructure: Complete*
*Backups: Automated daily at 2 AM*
