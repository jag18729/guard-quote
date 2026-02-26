# GuardQuote Documentation

> Comprehensive documentation for the GuardQuote platform and infrastructure.

## 📚 Documentation Index

### Architecture
- [System Overview](./architecture/OVERVIEW.md) - High-level system architecture
- [Network Topology](./architecture/NETWORK.md) - Network design and data flows
- [Security Model](./architecture/SECURITY.md) - Security layers and access control

### Infrastructure
- [Host Inventory](./infrastructure/HOSTS.md) - All servers and their roles
- [Tailscale Setup](./infrastructure/tailscale/README.md) - VPN mesh configuration
- [NordVPN Integration](./infrastructure/nordvpn/README.md) - Dedicated IP egress proxy
- [Monitoring Stack](./infrastructure/monitoring/README.md) - Grafana, Prometheus, Loki

### Integrations
- [SIEM Integration](./integrations/siem/README.md) - Log shipping to external SIEM
- [GitHub Actions](./integrations/GITHUB-ACTIONS.md) - CI/CD pipelines
- [Cloudflare](./integrations/CLOUDFLARE.md) - Edge services configuration

### Runbooks
- [Deployment](./runbooks/DEPLOY.md) - How to deploy changes
- [Incident Response](./runbooks/INCIDENT.md) - What to do when things break
- [Backup & Recovery](./runbooks/BACKUP.md) - Data protection procedures
- [Access Provisioning](./runbooks/ACCESS.md) - Onboarding team members

### Team
- [Access Matrix](./team/ACCESS-MATRIX.md) - Who can access what
- [Onboarding](./team/ONBOARDING.md) - Getting started guide
- [Contacts](./team/CONTACTS.md) - Team contact information

---

## 🏗️ Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                  ▼
         ┌──────────────────┐               ┌──────────────────┐
         │  Cloudflare      │               │    Tailscale     │
         │  (Public Access) │               │   (Admin VPN)    │
         │                  │               │                  │
         │  • Pages (CDN)   │               │  • Zero Trust    │
         │  • Workers (API) │               │  • ACL-based     │
         │  • Tunnel        │               │  • WireGuard     │
         │  • Zero Trust    │               │                  │
         └────────┬─────────┘               └────────┬─────────┘
                  │                                   │
                  └────────────────┬──────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                  ▼
         ┌──────────────────┐               ┌──────────────────┐
         │      Pi1         │               │       Pi0        │
         │  [see .env]    │               │  [see .env]   │
         │                  │               │                  │
         │  • GuardQuote    │──────────────►│  • Syslog        │
         │  • PostgreSQL    │   logs        │  • LDAP          │
         │  • Grafana       │               │  • NFS           │
         │  • Prometheus    │               │                  │
         └──────────────────┘               └──────────────────┘
```

## 🔐 Access Tiers

| Tier | Who | Method | What |
|------|-----|--------|------|
| **Public** | Anyone | HTTPS | guardquote.vandine.us (public pages) |
| **Protected** | Team | Cloudflare Access (Email OTP) | Grafana, Prometheus, Admin UI |
| **Admin** | Rafa only | Tailscale + SSH Key | Direct server access, database |
| **SIEM** | Isaiah | Tailscale (restricted) | Syslog only (pi0:514) |

## 📞 Quick Links

- **Production:** https://guardquote.vandine.us
- **Admin Dashboard:** https://guardquote.vandine.us/admin
- **Grafana:** https://grafana.vandine.us
- **Prometheus:** https://prometheus.vandine.us
- **GitHub:** https://github.com/jag18729/guard-quote

---

*Last updated: 2026-02-06*
