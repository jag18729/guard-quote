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
| AWS ECS | Bun 1.3 + Hono on K3s (pi2) | ARM-native, Kubernetes orchestration |
| AWS RDS | PostgreSQL 16 (192.168.20.10) | Self-hosted, dedicated host |
| MongoDB Atlas | PostgreSQL | Single database, simpler |
| FastAPI (backend) | Bun 1.3 + Hono | Native performance, zero framework overhead |
| Rule-based pricing | XGBoost ML + FastAPI + gRPC | Real ML predictions with confidence scores |
| AWS ALB/WAF | Cloudflare Tunnel + Access | Zero Trust, free tier |
| OpenSearch SIEM | Wazuh SIEM + Loki | Self-hosted, more features |
| Monday.com | GitHub Projects | Integrated with repo |
| Email/password only | OAuth SSO (GitHub, Google, Microsoft) | Enterprise-grade identity |
| Manual deploys | GitHub Actions CI/CD | Auto-deploy on push to main |

### System Components

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (nginx on K3s)
- **Backend:** Bun 1.3 + Hono framework (K3s on pi2)
- **ML Engine:** Python FastAPI + XGBoost + gRPC (K3s on pi2)
- **Database:** PostgreSQL 16 (192.168.20.10)
- **Auth:** OAuth 2.0 SSO (GitHub, Google, Microsoft) + argon2id + JWT
- **Identity:** LDAP (pi0) + Bastion CLI + IAM roles
- **Monitoring:** Prometheus + Grafana + Loki (pi1)
- **Logging:** Vector log pipeline
- **SIEM:** Wazuh (agent-based)
- **Edge:** Cloudflare Tunnel + Access
- **VPN:** Tailscale (WireGuard-based mesh)
- **CI/CD:** GitHub Actions self-hosted runner (pi2)

---

## Location

| Component | Location | Notes |
|-----------|----------|-------|
| **Frontend** | Pi2 K3s (nginx) | guardquote.vandine.us via Cloudflare Tunnel |
| **Backend API** | Pi2 K3s (Bun) | Port 30520 |
| **ML Engine** | Pi2 K3s (FastAPI) | Port 30521 (REST) + 50051 (gRPC) |
| **Database** | 192.168.20.10 | PostgreSQL 16 :5432 |
| **Monitoring** | Pi1 | Grafana :3000, Prometheus :9090, Loki :3100 |
| **Ingress** | Pi1 | cloudflared tunnel |
| **LDAP/Bastion** | Pi0 | OpenLDAP + Bastion CLI |
| **Log Collector** | Pi0 | Vector + SNMP |
| **CI/CD Runner** | Pi2 | GitHub Actions self-hosted |
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

### Phase 3: Weeks 3-4 ✅ COMPLETE
- [x] Prometheus + Grafana monitoring
- [x] SNMP monitoring (UDM + PA-220)
- [x] Loki log aggregation
- [x] Wazuh SIEM integration
- [x] Bastion host setup (LDAP + pi0)
- [x] IDS/IPS detection rules (Suricata — 48,687 rules)

### Phase 4: Weeks 4-5 ✅ COMPLETE
- [x] LDAP authentication integration (OpenLDAP on pi0)
- [x] ML engine deployed (XGBoost + FastAPI + gRPC on K3s)
- [x] OAuth SSO — GitHub, Google, Microsoft (all 3 validated by team)
- [x] IAM role system (admin, iam, sec-ops, developer, user)
- [x] Security dashboard creation

### Phase 5: Weeks 5-7 ✅ COMPLETE
- [x] UAT Round 1 — Functional testing
- [x] UAT Round 2 — Security testing (in progress, #55/#56/#57)
- [x] CI/CD auto-deploy pipeline (GitHub Actions → K3s)
- [x] 21 new backend endpoints (Services, ML, Blog, Features)
- [x] Mobile responsive admin panel
- [x] Documentation updates

### Phase 6: Weeks 7-8 🔄 IN PROGRESS
- [x] Final deployment verification
- [x] Demo environment (DEMO_MODE) working
- [ ] Presentation materials complete (#38)
- [ ] Final documentation & peer review (#28)
- [ ] UAT sign-off from all team members

---

## Deliverables

### Completed ✅
- **Infrastructure:** 4-node Pi cluster with PA-220 firewall, 4 security zones
- **Backend API:** Bun 1.3 + Hono, 40+ endpoints, RBAC, deployed on K3s
- **Frontend:** React admin dashboard, responsive design, mobile sidebar
- **ML Engine:** XGBoost + FastAPI + gRPC on K3s (R²=0.93)
- **Database:** PostgreSQL 16, 15 tables, 3NF normalized
- **Auth:** OAuth SSO (GitHub, Google, Microsoft) + argon2id + JWT
- **Identity:** LDAP directory + Bastion CLI + IAM roles
- **CI/CD:** GitHub Actions auto-deploy (push to main → live in ~3 min)
- **Monitoring:** Prometheus + Grafana + Loki (34 targets, 3 dashboards)
- **SIEM:** Auth event logging, auto-lockout, Wazuh integration
- **Documentation:** Architecture docs, deployment runbook, setup guides

### In Progress 🔄
- **UAT Round 2:** Team validation (#55, #56, #57)
- **Presentation:** Final slides & diagrams (#38)
- **Documentation:** SOW updates, peer review (#28)

---

## Milestones

| Milestone | Date | Status |
|-----------|------|--------|
| Infrastructure Complete | Feb 5 | ✅ Done |
| Admin Dashboard Deployed | Feb 6 | ✅ Done |
| Monitoring Stack Live | Feb 6 | ✅ Done |
| Team Meeting | Feb 7 | ✅ Done |
| SIEM Integration | Feb 14 | ✅ Done |
| UAT Round 1 | Feb 14 | ✅ Done |
| v2 Backend (Bun + K3s) | Feb 18 | ✅ Done |
| OAuth SSO Live | Feb 19 | ✅ Done |
| ML Engine Deployed | Feb 25 | ✅ Done |
| UAT Round 2 | Feb 28 | 🔄 In Progress |
| CI/CD Auto-Deploy | Feb 28 | ✅ Done |
| IAM + LDAP + Bastion | Feb 28 | ✅ Done |
| Presentation Ready | Mar 3 | 🔄 In Progress |
| SDPS Demo | Mar 3 | 📅 Scheduled |

---

## Team Tasks

### Rafael Garcia
- [x] Pi cluster setup (4 nodes, PA-220, K3s)
- [x] Backend API development (Bun 1.3 + Hono, 40+ endpoints)
- [x] Frontend development (React, mobile responsive)
- [x] Monitoring stack (Prometheus, Grafana, Loki)
- [x] ML engine (XGBoost + FastAPI + gRPC)
- [x] OAuth SSO (GitHub, Google, Microsoft)
- [x] IAM role system + LDAP + Bastion
- [x] CI/CD auto-deploy pipeline
- [ ] Final presentation review

### Milkias Kassa
- [x] ICAM security review (OWASP audit)
- [x] Google OAuth validation
- [x] Admin dashboard UAT (#55)
- [ ] IAM documentation (#20)
- [ ] Final UAT sign-off

### Isaiah Bernal
- [x] Microsoft OAuth validation
- [x] SIEM research & Wazuh concepts
- [ ] Security testing on new endpoints (#56)
- [ ] Wazuh alert analysis (#110)
- [ ] Security documentation

### Xavier Nguyen
- [x] GitHub OAuth validation
- [x] Mobile UX testing (#39)
- [x] Client pages UAT (#54)
- [ ] Blog, Features, API UAT (#57)
- [ ] Presentation slides & diagrams (#38)
- [ ] Documentation & peer review (#28)

---

## Success Criteria

### Functional ✅
- [x] Quote request end-to-end workflow
- [x] Admin management capabilities (9 pages, all working)
- [x] 40+ API endpoints operational
- [x] Mobile responsive design
- [x] OAuth SSO (3 providers, all validated)
- [x] ML-powered pricing predictions

### Infrastructure ✅
- [x] Multi-host deployment (4-node Pi cluster)
- [x] K3s orchestration with rolling updates
- [x] Secure access (Cloudflare Zero Trust)
- [x] Monitoring operational (34 targets)
- [x] SIEM collecting logs (35 auth event types)
- [x] CI/CD auto-deploy (push to main → live)

### Security ✅
- [x] HTTPS everywhere (Cloudflare)
- [x] OAuth 2.0 with PKCE
- [x] RBAC with IAM roles (admin, iam, sec-ops, developer, user)
- [x] argon2id password hashing
- [x] LDAP directory + Bastion CLI
- [x] Auto-lockout after failed attempts
- [x] PA-220 firewall with 4 security zones

### Performance ✅
- [x] Page load < 3 seconds
- [x] API response < 50ms
- [x] Backend memory: 20MB (Bun --smol)
- [ ] Final UAT sign-off pending

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

- [ ] Final demo to stakeholders (SDPS — Mar 3)
- [ ] UAT sign-off documented (#55, #56, #57)
- [x] All code in repository (GitHub jag18729/guard-quote)
- [ ] Documentation complete (#28)
- [x] Lessons learned captured (SDPS presentation draft)
- [x] Deployment runbook ready (GUARDQUOTE-V2-DEPLOYMENT.md)

---

*Last Updated: 2026-02-28*
