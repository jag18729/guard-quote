# Statement of Work (Updated)

**GuardQuote - Enterprise Security Solution Quote Platform**

---

## Introduction

| Field | Value |
|-------|-------|
| **Project Name** | GuardQuote |
| **Client** | CIT 480 Capstone Program, CSULA |
| **Project Lead** | Rafael Garcia |
| **CI/CD, ML & Data Engineering** | Rafael Garcia |
| **Identity & Access Management** | Milkias Kassa |
| **SIEM & Security Operations** | Isaiah Bernal |
| **Documentation & Presentation** | Xavier Nguyen |
| **Project Duration** | 8 weeks |
| **Project Type** | Academic Capstone - Enterprise Architecture |

---

## Scope of Work (Updated)

GuardQuote is a secure web application platform enabling businesses to request network and security solution quotes through an automated, intelligent interface.

### ~~Original AWS-Based~~ → **Current Pi Cluster Architecture**

| Original | Current | Reason |
|----------|---------|--------|
| AWS VPC | Pi Cluster + Tailscale | Zero cost, full ownership |
| AWS ECS | Deno on Pi1 | ARM-native, no container overhead |
| AWS RDS | PostgreSQL on Pi1 | Self-hosted, encrypted |
| MongoDB Atlas | PostgreSQL | Single database, simpler |
| FastAPI | Deno + Hono | Better ARM compatibility |
| AWS ALB/WAF | Cloudflare Tunnel + Access | Zero Trust, free tier |
| OpenSearch SIEM | Wazuh SIEM | Self-hosted, more features |
| Monday.com | GitHub Projects | Integrated with repo |

### System Components

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Deno 2.6 + Hono framework
- **Database:** PostgreSQL 16 (self-hosted)
- **Monitoring:** Prometheus + Grafana + Loki
- **Logging:** Vector log pipeline
- **SIEM:** Wazuh (agent-based)
- **Edge:** Cloudflare Workers + Tunnel + Access
- **VPN:** Tailscale (WireGuard-based)
- **ML Engine:** Python-based cost estimation

---

## Location

| Component | Location | Notes |
|-----------|----------|-------|
| **Frontend** | Cloudflare Pages | guardquote.vandine.us |
| **Backend API** | Pi1 (192.168.2.70) | Port 3002 |
| **Database** | Pi1 | PostgreSQL :5432 |
| **Monitoring** | Pi1 | Grafana :3000, Prometheus :9090 |
| **Log Collector** | Pi0 (192.168.2.101) | Vector |
| **SIEM** | Isaiah's Host | Wazuh via Tailscale |
| **Development** | ThinkStation | WSL2 |
| **Repository** | GitHub | jag18729/guard-quote |
| **Project Board** | GitHub Projects | Roadmap view |

---

## Schedule (8 Weeks)

### Phase 1: Weeks 1-2 ✅ COMPLETE
- [x] Pi cluster infrastructure setup
- [x] Cloudflare Tunnel + Zero Trust
- [x] Tailscale mesh VPN
- [x] PostgreSQL deployment
- [x] Backend API (Deno + Hono)
- [x] CI/CD pipeline (GitHub Actions)

### Phase 2: Weeks 2-3 ✅ COMPLETE
- [x] React frontend with Vite
- [x] Admin dashboard with RBAC
- [x] User management system
- [x] Quote management interface
- [x] ML Engine controls page
- [x] Network operations visualization

### Phase 3: Weeks 3-4 🔄 IN PROGRESS
- [x] Prometheus + Grafana monitoring
- [x] SNMP monitoring (UDM + PA-220)
- [x] Loki log aggregation
- [ ] Wazuh SIEM integration
- [ ] Bastion host setup
- [ ] IDS/IPS detection rules

### Phase 4: Weeks 4-5 ⏳ UPCOMING
- [ ] LDAP authentication integration
- [ ] ML model training improvements
- [ ] SSO/OAuth implementation
- [ ] Security dashboard creation

### Phase 5: Weeks 5-7 ⏳ SCHEDULED
- [ ] UAT Round 1 (Feb 14) - Functional testing
- [ ] UAT Round 2 (Feb 19) - Security testing
- [ ] Peer review (Feb 21)
- [ ] Documentation finalization
- [ ] Performance tuning

### Phase 6: Weeks 7-8 ⏳ FINAL
- [ ] Presentation dry run (Feb 25)
- [ ] Final deployment verification
- [ ] Demo environment preparation
- [ ] Presentation materials complete

---

## Deliverables

### Completed ✅
- **Infrastructure as Code:** Ansible playbooks, Docker Compose
- **Backend API:** Deno + Hono with PostgreSQL, JWT auth, RBAC
- **Frontend:** React admin dashboard, responsive design
- **Database:** PostgreSQL with normalized schema
- **CI/CD:** GitHub Actions workflows
- **Monitoring:** Full Prometheus + Grafana + Loki stack
- **Documentation:** README, CONTRIBUTING, ROADMAP

### In Progress 🔄
- **SIEM System:** Wazuh with agent deployment
- **Security Dashboards:** Detection rules, alerts
- **Presentation:** Updated slides

### Upcoming ⏳
- **ML Engine:** Trained model for cost estimation
- **SSO/OAuth:** Identity provider integration
- **UAT Documentation:** Test results, validation

---

## Milestones

| Milestone | Date | Status |
|-----------|------|--------|
| Infrastructure Complete | Feb 5 | ✅ Done |
| Admin Dashboard Deployed | Feb 6 | ✅ Done |
| Monitoring Stack Live | Feb 6 | ✅ Done |
| Team Meeting | Feb 7 | 📅 Scheduled |
| SIEM Integration | Feb 14 | ⏳ Planned |
| UAT Round 1 | Feb 14 | ⏳ Planned |
| UAT Round 2 | Feb 19 | ⏳ Planned |
| Peer Review | Feb 21 | ⏳ Planned |
| Presentation Ready | Feb 28 | ⏳ Planned |

---

## Team Tasks

### Rafael Garcia
- [x] Pi cluster setup
- [x] Backend API development
- [x] Frontend development
- [x] Monitoring stack
- [ ] ML model improvements
- [ ] SSO/OAuth integration
- [ ] Final integration

### Milkias Kassa
- [ ] Review client/admin sites
- [ ] IAM documentation
- [ ] Presentation updates
- [ ] Procedure documentation

### Isaiah Bernal
- [ ] Wazuh manager deployment
- [ ] Agent installation
- [ ] Bastion host setup
- [ ] IDS/IPS detection rules
- [ ] Security dashboards

### Xavier Nguyen
- [ ] Review client/admin sites
- [ ] Cost analysis updates
- [ ] Timeline documentation
- [ ] Presentation slides
- [ ] References

---

## Success Criteria

### Functional ✅
- [x] Quote request end-to-end workflow
- [x] Admin management capabilities
- [x] API endpoints operational
- [x] Mobile responsive design

### Infrastructure ✅
- [x] Multi-host deployment (Pi cluster)
- [x] Secure access (Cloudflare Zero Trust)
- [x] Monitoring operational (16+ targets)
- [ ] SIEM collecting logs

### Security (In Progress)
- [x] HTTPS everywhere (Cloudflare)
- [x] Auth required for admin
- [x] RBAC implemented
- [ ] SIEM alerts configured
- [ ] Detection rules active

### Performance
- [x] Page load < 3 seconds
- [x] API response < 500ms
- [ ] UAT validation complete

---

## Cost Analysis

### Original (AWS-Based)
| Service | Monthly Cost |
|---------|-------------|
| AWS EC2 | ~$50 |
| AWS RDS | ~$30 |
| AWS ALB | ~$20 |
| MongoDB Atlas | ~$10 |
| **Total** | **~$110/month** |

### Current (Pi Cluster)
| Service | Monthly Cost |
|---------|-------------|
| Cloudflare | $0 (free tier) |
| Tailscale | $0 (free tier) |
| GitHub | $0 (free tier) |
| Pi Cluster | $0 (owned hardware) |
| Electricity | ~$5 |
| **Total** | **~$5/month** |

**Savings: ~$105/month (95% reduction)**

---

## Communication

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Task tracking |
| GitHub Projects | Roadmap, status |
| Team Slack/Discord | Quick questions |
| Saturday Meetings | Major decisions |
| Email | Official communication |

---

## Risk Management

| Risk | Mitigation |
|------|------------|
| Hardware failure | Backup configurations, documentation |
| SIEM delays | Vector backup logging to Loki |
| Presentation gaps | Weekly sync, shared docs |
| UAT issues | Two rounds of testing, bug buffer |

---

## Project Closure

- [ ] Final demo to stakeholders
- [ ] UAT sign-off documented
- [ ] All code in repository
- [ ] Documentation complete
- [ ] Lessons learned captured
- [ ] Handover documentation ready

---

*Last Updated: 2026-02-06*
