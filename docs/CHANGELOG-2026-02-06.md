# Changelog - February 6, 2026

## Summary

Major infrastructure and documentation sprint. Completed SNMP monitoring, created role-specific guides for all team members, implemented secure cookie authentication, and deployed nettools bastion container.

---

## 🔒 Security & Authentication

### Cookie-Based Auth (#29)
- Replaced localStorage JWT with HttpOnly cookies
- `gq_session`: HttpOnly, SameSite=Lax session cookie
- `gq_csrf`: JavaScript-readable CSRF token
- `gq_remember`: 30-day remember-me indicator
- CSRF double-submit pattern for state-changing requests

### Self-Service Profile (#30)
- `GET /api/auth/me` - Current user info
- `PATCH /api/auth/profile` - Update display name  
- `POST /api/auth/change-password` - Password change
- Profile page with inline editing

---

## 📊 Monitoring & Observability

### SNMP Monitoring (Complete)
- **SNMP Exporter** deployed on pi1:9116
- **UDM** ([internal]): SNMPv3 with SHA auth
- **PA-220** ([internal]): SNMPv2c community `matrixlab`
- **16+ Prometheus targets** all UP
- Interface stats, system info, uptime metrics

### Nettools Bastion Container
- **Image:** nicolaka/netshoot:latest (arm64)
- **Host:** pi0:7681 (ttyd web terminal)
- **Tools:** nmap, tcpdump, mtr, iperf3, curl, dig, traceroute, etc.
- **Access:** https://nettools.vandine.us (CF Access protected)
- **Helper scripts:** quick-scan.sh, check-services.sh, trace-path.sh

---

## 👥 Team Role Documentation

### Milkias - ICAM Lead
- Created `docs/ICAM-REVIEW.md` - Full security audit checklist
- GitHub Issue #33 - ICAM Security Review
- Obsidian note: ICAM Review.md

### Xavier - User Testing & Customer Liaison  
- Created `docs/UAT-GUIDE-XAVIER.md` - Comprehensive testing guide
- Multi-browser testing methodology
- Screenshot best practices
- Report template with severity levels
- GitHub Issue #34 - UAT Workflow Validation
- Obsidian note: UAT Guide.md

### Isaiah - SIEM & Security Ops
- `docs/QUICKSTART-ISAIAH.md` (created earlier)
- GitHub Issue #12 - SIEM Integration
- Wazuh agent install script ready

---

## 🖥️ Frontend Updates

### Network Page Enhancements
- Added nettools to pi0 services
- Added SNMP Exporter to pi1 services
- Updated PA-220 status (SNMP now green ✓)
- Added Nettools Bastion section with tool list
- Updated SNMP data flow diagram (now shows working)
- Added nettools.vandine.us to service URLs

### Other UI
- Favicon added (orange shield SVG)
- Profile page for self-service updates

---

## 🔧 CI/CD Fixes

### Workflow Repair
- Regenerated `backend/package-lock.json`
- CI now passing (was failing on npm ci)
- All recent commits: ✅ Success

---

## 📋 GitHub Project Updates

### Issues Created
- #33: ICAM Security Review (Milkias)
- #34: UAT Workflow Validation (Xavier)

### Issues Closed
- #29: Cookie authentication ✅
- #30: Self-service profile ✅  
- #31: Favicon ✅

### Milestones
- UAT Round 1: Feb 14
- UAT Round 2: Feb 19
- Presentation Ready: Feb 28

---

## 📁 Files Created/Modified

### New Files
```
docs/ICAM-REVIEW.md          # Security audit checklist
docs/UAT-GUIDE-XAVIER.md     # Testing methodology guide
docs/CHANGELOG-2026-02-06.md # This file
```

### Modified Files
```
frontend/src/pages/admin/Network.tsx  # Infrastructure updates
frontend/public/favicon.svg            # Orange shield icon
frontend/index.html                    # Favicon link
docs/TEAM-TASKS.md                     # Updated roles
backend/package-lock.json              # Regenerated for CI
```

### Obsidian Vault
```
~/workspace/obsidian/GuardQuote/
├── ICAM Review.md       # NEW
├── UAT Guide.md         # NEW  
├── Saturday Meeting.md  # Updated with role guides
├── Team.md              # Updated roles
└── ... (8 total files)
```

---

## 🌐 Infrastructure Status

| Component | Status | Details |
|-----------|--------|---------|
| Frontend | ✅ | Deployed to CF Pages |
| Backend API | ✅ | Deno on pi1:3002 |
| PostgreSQL | ✅ | pi1:5432 |
| Grafana | ✅ | pi1:3000 |
| Prometheus | ✅ | pi1:9090, 16+ targets UP |
| SNMP Exporter | ✅ | pi1:9116 |
| Loki | ✅ | pi1:3100 |
| Vector | ✅ | pi0 log collection |
| Nettools | ✅ | pi0:7681 |
| Wazuh | 🟡 | Pending Isaiah's manager |
| CI/CD | ✅ | All builds passing |

---

## 📅 Next Steps

1. **Saturday 1 PM:** Isaiah SIEM handoff
2. **Saturday 3 PM:** Full team status review
3. **Feb 14:** UAT Round 1
4. **Feb 19:** UAT Round 2
5. **Feb 28:** Presentation ready

---

---

## 🖥️ Nettools Bastion (Evening Session)

### Deployed: nettools.vandine.us
- **Container:** nicolaka/netshoot:latest on pi0
- **Terminal:** ttyd web terminal on port 7681
- **Auth:** LDAP-based login (terminal prompt, not browser popup)
- **Tunnel:** Cloudflare Tunnel via pi1

### Features
- LDAP authentication against OpenLDAP
- Role-based access control (admin/security/developer)
- Pre-configured SSH access to pi0/pi1
- Database access (PostgreSQL) based on role
- Network tools: nmap, mtr, tcpdump, iperf3
- Quick commands: check-services, db-stats, prom-targets

### Team Access
| User | Role | SSH | Database |
|------|------|-----|----------|
| rafaeljg | admin | All | Full CRUD |
| isaiah | security | pi0, pi1 | Read-only |
| milkias | developer | pi1 | Read-only |
| xavier | developer | pi1 | Read-only |

### Infrastructure Fixes
- PostgreSQL now listening on 0.0.0.0:5432 (was localhost)
- UFW opened port 7681 on pi0
- Cloudflare tunnel config updated on pi1

### Xavier Role Upgrade
- Promoted from Liaison to Developer
- Now has SSH access to pi1
- Database read access enabled

---

*Generated: 2026-02-06 21:40 PST*
