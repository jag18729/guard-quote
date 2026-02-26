# Nettools Bastion

Secure network operations terminal for the GuardQuote infrastructure team.

**URL:** https://nettools.vandine.us

---

## Quick Start

1. Go to https://nettools.vandine.us
2. Login with LDAP credentials
3. Run `check-services` to verify infrastructure

## Team Credentials

| User | Username | Password | Role |
|------|----------|----------|------|
| Rafa | `rafaeljg` | (personal) | admin |
| Isaiah | `isaiah` | `Welcome123!` | security |
| Milkias | `milkias` | `Welcome123!` | developer |
| Xavier | `xavier` | `Welcome123!` | developer |

## Role Permissions

| Role | SSH Access | Database | Use Case |
|------|------------|----------|----------|
| **admin** | All hosts | Full CRUD | Infrastructure management |
| **security** | pi0, pi1 | Read-only | SIEM, log analysis |
| **developer** | pi1 only | Read-only | API dev, debugging |

## Quick Commands

### Health Checks
```bash
check-services      # Full infrastructure health
prom-targets        # Prometheus target status
prom-down           # Show failing targets only
```

### Database
```bash
db-stats            # Table row counts
db-users            # List users
db-quotes           # Recent quotes
psql-gq             # Interactive PostgreSQL (role-dependent)
```

### SSH Access
```bash
ssh pi1             # Services host (API, Grafana, DB)
ssh pi0             # Monitoring host (LDAP, logs)
ssh pi1-ts          # Via Tailscale
```

### Logs
```bash
logs-gq             # Tail GuardQuote API logs
logs-vector         # Tail Vector logs
logs-syslog         # Tail syslog
```

### Network Tools
```bash
nmap <target>       # Port scan
mtr <target>        # Traceroute with stats
tcpdump -i any      # Packet capture
ping-all            # Ping all hosts
```

### SNMP
```bash
snmp-udm            # Query UDM (SNMPv3)
snmp-pa220          # Query PA-220 (SNMPv2c)
```

## Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│  nettools.vandine.us → CF Tunnel → pi0:7681 (ttyd)         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌──────────┐
   │   pi0   │          │   pi1   │          │ Internet │
   │ Monitor │◄────────►│ Services│          │  Tests   │
   └─────────┘   SSH    └─────────┘          └──────────┘
```

## Hosts

| Host | Local IP | Tailscale | Services |
|------|----------|-----------|----------|
| pi0 | [see .env] | [tailscale] | LDAP, Vector, rsyslog |
| pi1 | [see .env] | [tailscale] | API, Grafana, Prometheus, PostgreSQL |
| UDM | [see .env] | - | Router, DHCP |
| PA-220 | [see .env] | - | Firewall |

## Technical Details

- **Container:** nicolaka/netshoot:latest
- **Terminal:** ttyd on port 7681
- **Auth:** LDAP (dc=vandine,dc=us)
- **Network:** Host mode (full network access)
- **Location:** pi0:~/nettools/

## Troubleshooting

### Can't connect
```bash
# Check container is running
ssh pi0 "docker ps | grep nettools"

# Check logs
ssh pi0 "docker logs nettools"

# Restart
ssh pi0 "cd ~/nettools && docker compose restart"
```

### LDAP auth failing
```bash
# Test LDAP from pi0
docker exec nettools ldapwhoami -x -H ldap://[see .env] \
  -D "uid=USERNAME,ou=People,dc=vandine,dc=us" -w "PASSWORD"
```

### SSH not working
- Check your role allows SSH to that host
- Verify SSH keys are in ~/nettools/secrets/ssh/
