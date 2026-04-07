# GuardQuote Roadmap & UAT Plan

**Last Updated:** 2026-04-07
**Target:** Capstone Presentation (TBD - update date)

---

## What's Done (This Week Alone)

### Infrastructure (Rafa)
- [x] Migrated off AWS entirely → Pi cluster
- [x] Set up Cloudflare Tunnel + Zero Trust Access
- [x] Deployed Node.js + Hono backend (migrated from Deno)
- [x] Integrated Datadog APM with dd-trace (68+ spans/request)
- [x] Set up Prometheus + Grafana + Loki monitoring
- [x] Deployed Datadog agents on all hosts (pi0, pi1, WSL)
- [x] Configured SNMP monitoring (UDM + PA-220)
- [x] Deployed SNMP Exporter on pi1
- [x] All 16+ Prometheus targets UP
- [x] Vector log pipeline on pi0 + Datadog
- [x] Interactive data flow diagram (React Flow)

### Application (Rafa)
- [x] Full admin dashboard with RBAC
- [x] User management with roles (admin/developer/viewer)
- [x] Quote management system (19 quotes)
- [x] ML Engine page with controls (status, training, export)
- [x] Network operations page (4 tabs)
- [x] Blog + Feature requests + Comments
- [x] Services health monitoring + Infrastructure control
- [x] User activity logging
- [x] GitHub Projects integration
- [x] 50 API endpoints (full feature parity)

### Documentation (Rafa)
- [x] Updated README with team + architecture
- [x] CONTRIBUTING.md for onboarding
- [x] TEAM-TASKS.md with roles
- [x] SIEM integration guide
- [x] Quick start for Isaiah

### Project Management
- [x] GitHub Issues created (#8-14)
- [x] Project board updated
- [x] Old AWS issues closed

---

## Roadmap

### Week 1: Feb 3-7, Infrastructure & Integration

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Mon 2/3 | Pi cluster setup, Deno migration | Rafa | Done |
| Tue 2/4 | Monitoring stack, LDAP | Rafa | Done |
| Wed 2/5 | Admin dashboard, RBAC, GitHub sync | Rafa | Done |
| Thu 2/6 | SNMP monitoring, data flow diagram, docs | Rafa | Done |
| Fri 2/7 | Team meeting prep, final integration | Rafa | Done |
| Sat 2/7 | Team Meeting @ 3PM | All | Done |

### Week 1.5: Feb 8-9, Node.js Migration & APM

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Sat 2/8 | GitHub security automation, CI/CD | Rafa | Done |
| Sun 2/9 | Node.js + dd-trace migration | Rafa | Done |
| Sun 2/9 | Datadog APM integration (68+ spans) | Rafa | Done |
| Sun 2/9 | Full API parity (50 endpoints) | Rafa | Done |
| Sun 2/9 | Tech stack page redesign | Rafa | Done |

### Week 2: Feb 10-14 (Current), SIEM & Testing

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Mon 2/10 | Wazuh manager setup | Isaiah | ⏳ |
| Mon 2/10 | Presentation slide updates | Milkias, Xavier | ⏳ |
| Tue 2/11 | Wazuh agent deployment (pi0, pi1) | Isaiah + Rafa | ⏳ |
| Wed 2/12 | Bastion host setup | Isaiah | ⏳ |
| Thu 2/13 | IDS/IPS detection rules | Isaiah | ⏳ |
| Fri 2/14 | **UAT Round 1** | All | ⏳ |

> **Note:** Backend API is ready for UAT. All 50 endpoints functional with Datadog APM tracing.

### Week 3: Feb 17-21, UAT & Documentation

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Mon 2/17 | UAT bug fixes | Rafa | ⏳ |
| Tue 2/18 | Documentation review | Milkias, Xavier | ⏳ |
| Wed 2/19 | **UAT Round 2** | All | ⏳ |
| Thu 2/20 | Final documentation | All | ⏳ |
| Fri 2/21 | **Peer Review** | All | ⏳ |

### Week 4: Feb 24-28, Final Polish

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| Mon 2/24 | Address peer review feedback | All | ⏳ |
| Tue 2/25 | Presentation dry run | All | ⏳ |
| Wed 2/26 | Final testing | All | ⏳ |
| Thu 2/27 | Documentation freeze | All | ⏳ |
| Fri 2/28 | **Presentation Ready** | All | ⏳ |

---

## UAT Checklist

### Round 1: Feb 14 (Functional Testing)

#### Client Portal
- [ ] Landing page loads correctly
- [ ] Quote wizard completes all 4 steps
- [ ] Price calculation returns valid results
- [ ] Mobile responsive on phone/tablet
- [ ] Form validation works
- [ ] Error states display correctly

#### Admin Dashboard
- [ ] Login works with credentials
- [ ] Dashboard shows real stats
- [ ] Quote list displays correctly
- [ ] Can update quote status
- [ ] User management works (CRUD)
- [ ] ML page shows model status
- [ ] Services page shows health
- [ ] Network page loads diagram
- [ ] Blog CRUD works
- [ ] Feature requests work

#### API
- [ ] `/api/health` returns 200
- [ ] `/api/predict` returns valid JSON
- [ ] Auth endpoints work
- [ ] Rate limiting active
- [ ] Error responses formatted correctly

#### Infrastructure
- [ ] All Prometheus targets UP
- [ ] Grafana dashboards load
- [ ] Logs flowing to Loki
- [ ] Cloudflare Tunnel stable
- [ ] SSH access via Tailscale works

### Round 2: Feb 19 (Security & Edge Cases)

#### Security
- [ ] Admin routes require auth
- [ ] Invalid tokens rejected
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CORS configured correctly
- [ ] Cloudflare Access enforced

#### SIEM (Isaiah)
- [ ] Wazuh agents connected
- [ ] Logs flowing to SIEM
- [ ] Detection rules firing
- [ ] Dashboards showing data
- [ ] Alerts configured

#### Edge Cases
- [ ] Empty form submission
- [ ] Very large numbers
- [ ] Special characters in inputs
- [ ] Slow network simulation
- [ ] Session timeout handling
- [ ] Concurrent user access

---

## Documentation Checklist

### Technical Docs
- [ ] Architecture diagram (current)
- [ ] API reference
- [ ] Database schema
- [ ] Deployment guide
- [ ] Monitoring setup

### Presentation Slides
- [ ] Updated architecture (Pi cluster, not AWS)
- [ ] Cost analysis ($0/month)
- [ ] Security model
- [ ] SIEM integration
- [ ] Demo walkthrough
- [ ] Team roles

### User Docs
- [ ] Client portal guide
- [ ] Admin dashboard guide
- [ ] FAQ

---

## Success Criteria

### Functional
- [ ] Client can request quote end-to-end
- [ ] Admin can manage all aspects
- [ ] ML model returns predictions
- [ ] All services healthy

### Non-Functional
- [ ] Page load < 3 seconds
- [ ] API response < 500ms
- [ ] 99% uptime during demo
- [ ] Mobile responsive

### Security
- [ ] Zero critical vulnerabilities
- [ ] Auth working correctly
- [ ] SIEM collecting logs
- [ ] Detection rules active

### Documentation
- [ ] All docs current
- [ ] Presentation ready
- [ ] Demo script prepared

---

## Final Checklist (Before Presentation)

- [ ] All UAT passed
- [ ] All docs reviewed
- [ ] Peer review addressed
- [ ] Presentation rehearsed
- [ ] Demo environment stable
- [ ] Backup plan ready
- [ ] Team roles assigned for presentation

---

*Update this doc as tasks complete. Check off items during UAT sessions.*
