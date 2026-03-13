# Backup & Recovery Procedures

> How to backup and restore the GuardQuote infrastructure.

## Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| Database (PostgreSQL) | Daily | 30 days | pi0:/backups/db/ |
| Application Code | Git push | Unlimited | GitHub |
| Configuration Files | Daily | 30 days | pi0:/backups/config/ |
| Grafana Dashboards | Weekly | 90 days | pi0:/backups/grafana/ |
| Secrets | On change | 5 versions | 1Password |
| Suricata/Wazuh logs (Pi2) | Daily (3am) | 30 days | Pi0 NFS: /srv/nfs/backups/pi2/logs/ |
| Long-term log archive | Weekly (Sun 4am) | 90 days | ThinkStation M:/Backups/logs/ |

### Log Pipeline (3-2-1)

| Copy | Location | Retention | Script |
|------|----------|-----------|--------|
| 1st | Pi2 `/var/log/suricata/` | 3 days | logrotate (`/etc/logrotate.d/suricata`) |
| 2nd | Pi0 NFS `/srv/nfs/backups/pi2/logs/` | 30 days | `/usr/local/bin/fleet-log-offload.sh` (cron 3am on Pi2) |
| 3rd | ThinkStation `M:/Backups/logs/` | 90 days | `scripts/archive-to-thinkstation.sh` (cron Sun 4am) |

Pi0 NFS retention cleanup: Sunday 2am cron removes `.gz` files older than 30 days.

---

## Database Backup

### Automated Daily Backup

```bash
# /etc/cron.d/guardquote-backup
0 3 * * * root /opt/scripts/backup-db.sh
```

### Manual Backup

```bash
# SSH to pi1
ssh johnmarston@pi1

# Dump database
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U postgres guardquote > ~/backups/guardquote-$(date +%Y%m%d).sql

# Compress
gzip ~/backups/guardquote-$(date +%Y%m%d).sql

# Copy to pi0 for offsite storage
scp ~/backups/guardquote-*.sql.gz rafaeljg@pi0:/backups/db/
```

### Database Restore

```bash
# Stop application
sudo systemctl stop guardquote

# Restore from backup
gunzip -c /backups/guardquote-YYYYMMDD.sql.gz | psql -h localhost -U postgres guardquote

# Restart application
sudo systemctl start guardquote
```

---

## Configuration Backup

### Files to Backup

**Pi0:**
- `/etc/rsyslog.d/`
- `/etc/ldap/`
- `/etc/nfs-exports`
- `/opt/cloudflared/config.yml`
- `~/.config/` (user configs)

**Pi1:**
- `~/guardquote-deno/`
- `~/monitoring/docker-compose.yml`
- `/etc/nginx/sites-available/`
- `/opt/cloudflared/config.yml`
- Docker volume data

### Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-config.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups/config/$DATE

mkdir -p $BACKUP_DIR

# System configs
tar -czf $BACKUP_DIR/etc.tar.gz /etc/rsyslog.d /etc/nginx /etc/systemd/system/*.service

# Application
tar -czf $BACKUP_DIR/guardquote.tar.gz ~/guardquote-deno

# Docker
tar -czf $BACKUP_DIR/monitoring.tar.gz ~/monitoring

# Docker volumes
docker run --rm -v monitoring_grafana_data:/data -v /backups:/backup alpine tar czf /backup/config/$DATE/grafana-data.tar.gz /data

echo "Backup complete: $BACKUP_DIR"
```

### Sync to Pi0

```bash
# Run weekly
rsync -avz /backups/ rafaeljg@pi0:/backups/pi1-mirror/
```

---

## Grafana Dashboard Backup

### Export Dashboards

```bash
# Get all dashboard UIDs
curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3000/api/search?type=dash-db | jq -r '.[].uid'

# Export each dashboard
for uid in $(curl -s ... | jq -r '.[].uid'); do
  curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
    http://localhost:3000/api/dashboards/uid/$uid > dashboards/$uid.json
done
```

### Restore Dashboard

```bash
# Import dashboard
curl -X POST -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @dashboards/matrix-lab.json \
  http://localhost:3000/api/dashboards/db
```

---

## Secrets Backup

### 1Password Items to Backup

| Item | Vault | Type |
|------|-------|------|
| Cloudflare API Token | Infrastructure | Password |
| GitHub PAT | Infrastructure | Password |
| PostgreSQL credentials | Infrastructure | Password |
| Grafana Admin | Infrastructure | Password |
| Age Encryption Key | Infrastructure | Document |
| Slack Webhook | Infrastructure | Password |

### Export for Disaster Recovery

```bash
# Export encrypted backup
source ~/.local/bin/load-secrets
env | grep -E '^(CLOUDFLARE|GITHUB|PG|GRAFANA)' | age -r age1... > secrets-backup.age

# Store securely (USB, safety deposit box, etc.)
```

---

## Full System Recovery

### Scenario: Pi1 Total Loss

Pi1 hosts: **PostgreSQL 17** (GuardQuote DB) + **Grafana/Prometheus/Loki** (monitoring stack).

1. **Flash new SD card** with Ubuntu 24.04 ARM64

2. **Basic setup:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y postgresql-17 docker.io docker-compose git curl
   ```

3. **Restore PostgreSQL:**
   ```bash
   # Restore from Pi0 backup
   scp rafaeljg@pi0:/backups/db/guardquote-latest.sql.gz ~/
   gunzip -c ~/guardquote-latest.sql.gz | sudo -u postgres psql -d guardquote
   ```

4. **Critical: restore pg_hba.conf** — K3s pods on Pi2 connect via Tailscale masquerade:
   ```bash
   echo 'hostnossl    all    all    100.64.0.0/10    scram-sha-256' | \
     sudo tee -a /etc/postgresql/17/main/pg_hba.conf
   sudo -u postgres psql -c 'SELECT pg_reload_conf();'
   ```
   Without this, GuardQuote will 401 with "no pg_hba.conf entry... no encryption".

5. **Restore monitoring stack:**
   ```bash
   scp rafaeljg@pi0:/backups/pi1-mirror/config/latest/* ~/
   tar -xzf monitoring.tar.gz -C ~/
   docker-compose -f ~/monitoring/docker-compose.yml up -d
   ```

6. **Verify:**
   ```bash
   # PostgreSQL accessible via Tailscale
   PGPASSWORD=<pw> psql -h 100.77.26.41 -U postgres -d guardquote -c '\conninfo'
   # GuardQuote health
   curl https://guardquote.vandine.us/api/health
   ```

---

## Backup Verification

### Monthly Verification Checklist

- [ ] Restore database to test container
- [ ] Verify all tables present
- [ ] Check row counts match production
- [ ] Test config file restore
- [ ] Verify Grafana dashboard import
- [ ] Document any issues

### Verification Script

```bash
#!/bin/bash
# /opt/scripts/verify-backup.sh

# Test database restore
LATEST=$(ls -t /backups/db/*.sql.gz | head -1)
echo "Testing restore of $LATEST..."

docker run -d --name pg-test -e POSTGRES_PASSWORD=test postgres:16
sleep 10

gunzip -c $LATEST | docker exec -i pg-test psql -U postgres

TABLES=$(docker exec pg-test psql -U postgres -c "\dt" | grep -c "public")
echo "Restored $TABLES tables"

docker rm -f pg-test

if [ $TABLES -lt 10 ]; then
  echo "WARNING: Expected more tables!"
  exit 1
fi

echo "Backup verification passed"
```

---

## Disaster Recovery Contacts

| Scenario | Contact | Action |
|----------|---------|--------|
| Pi failure | Rafa | Restore from backup |
| Data corruption | Rafa | Point-in-time recovery |
| Security breach | Rafa + Team | Incident response plan |
| Cloud outage | Rafa | Failover to backup path |

---

*Last updated: 2026-03-12*
