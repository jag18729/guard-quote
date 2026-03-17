# GuardQuote Networking Runbook

> Last updated: 2026-03-17

## Architecture Constraint: PA-220 Cross-Zone Blocking

GuardQuote runs in K3s on Pi2 (`dmz-security` zone, 192.168.22.x).
Pi1 PostgreSQL is in `dmz-services` zone (192.168.20.x).

**PA-220 blocks direct cross-zone traffic.** You cannot route from dmz-security → dmz-services on ports 5432, 2049, or any non-permitted port.

### Rule: Always use Tailscale IPs for cross-host connections

| Host | Direct IP | Tailscale IP | Use |
|------|-----------|--------------|-----|
| Pi1 (PostgreSQL) | 192.168.20.10 ❌ | 100.77.26.41 ✅ | DATABASE_URL |
| Pi2 (K3s) | 192.168.22.10 ❌ | 100.111.113.35 ✅ | Inbound source |
| ThinkStation | 192.168.2.x | 100.126.232.42 | OpenClaw / monitoring |

---

## DATABASE_URL

**Correct format:**
```
postgresql://postgres:<password>@100.77.26.41:5432/guardquote
```

**Stored in:** K8s secret `guardquote-secrets` (key: `database-url`) in namespace `guardquote`

**To update:**
```bash
NEW_URL="postgresql://postgres:<password>@100.77.26.41:5432/guardquote"
kubectl patch secret guardquote-secrets -n guardquote \
  --type='json' \
  -p="[{\"op\":\"replace\",\"path\":\"/data/database-url\",\"value\":\"$(echo -n "$NEW_URL" | base64 -w0)\"}]"
kubectl rollout restart deployment/guardquote-backend -n guardquote
```

**Never use** `192.168.20.10:5432` — blocked by PA-220.

---

## Pi1 PostgreSQL: pg_hba.conf

Connections from K3s pods masquerade through Pi2's Tailscale IP (`100.111.113.35`).
PostgreSQL must allow non-SSL connections from the Tailscale subnet.

**Required entry in `/etc/postgresql/17/main/pg_hba.conf`:**
```
hostnossl    all             all             100.64.0.0/10           scram-sha-256
```

`hostnossl` is required because the `postgres` npm package does not enable SSL by default,
and PostgreSQL 17 surfaces this as "no pg_hba.conf entry... no encryption".

**To verify:**
```bash
ssh johnmarston@100.77.26.41 "sudo grep '100.64' /etc/postgresql/17/main/pg_hba.conf"
# Should output: hostnossl    all    all    100.64.0.0/10    scram-sha-256
```

**To restore after a PostgreSQL reinstall:**
```bash
ssh johnmarston@100.77.26.41 "echo 'hostnossl    all             all             100.64.0.0/10           scram-sha-256' | sudo tee -a /etc/postgresql/17/main/pg_hba.conf && sudo -u postgres psql -c 'SELECT pg_reload_conf();'"
```

---

## Internet Egress (K3s Pods)

Pi2 has direct internet access via its matrix network USB ethernet adapter (DHCP from UDM, metric 50).
K3s pods masquerade through Pi2's host network and inherit this egress path.

`OAUTH_PROXY_URL` is unset — the backend makes OAuth token and userinfo calls directly.
The `oauth-proxy.service` on ThinkStation has been stopped and disabled (2026-03-17).

---

## cloudflared Port Map

Cloudflare Tunnel routes public hostnames to K3s NodePorts on Pi2.
Config: `~/.cloudflared/config.yml` on Pi2 (rafaeljg@100.111.113.35)

| Hostname | NodePort | K8s Service |
|----------|----------|-------------|
| guardquote.vandine.us | 30522 | guardquote-frontend |
| api.vandine.us | 30522 | guardquote-frontend |

**Verify NodePorts haven't changed:**
```bash
ssh rafaeljg@100.111.113.35 "kubectl get svc -n guardquote"
```

**If 502 Bad Gateway:** check that the port in `~/.cloudflared/config.yml` matches the current NodePort.

---

## Prometheus Scrape Targets

All Prometheus jobs in `~/monitoring/prometheus.yml` on Pi1 that target Pi2 or Pi0 services **must use Tailscale IPs** — Pi1 (dmz-services) has no direct route to Pi2 (dmz-security) or many Pi0 ports.

Full mapping and details: `docs/infrastructure/monitoring/README.md`

**If a target is DOWN after adding a new service on Pi2:**
```bash
# Change the target IP in prometheus.yml, then:
ssh johnmarston@100.77.26.41 "cd ~/monitoring && docker compose restart prometheus"
```

## Disk Monitoring

Fleet Disk Monitor cron runs every 30 min via OpenClaw on ThinkStation.
Telegrams `@frank_is_a_real_bot` if any host exceeds 75% disk usage.

Pi2 Suricata logs rotate daily with 3-day retention (`/etc/logrotate.d/suricata`).
Daily offload to Pi0 NFS: `/usr/local/bin/fleet-log-offload.sh` (cron: 3am)
Weekly archive to ThinkStation M: drive: `scripts/archive-to-thinkstation.sh` (cron: Sunday 4am)

If Pi2 disk climbs unexpectedly:
```bash
ssh rafaeljg@100.111.113.35 "df -h / && du -sh /var/log/suricata/ && ls -lh /var/log/suricata/"
sudo logrotate -f /etc/logrotate.d/suricata
```
