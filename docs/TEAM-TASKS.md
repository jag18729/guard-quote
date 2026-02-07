# GuardQuote Team Tasks

**Meeting:** Saturday 2/7 at 3 PM (Isaiah at 1 PM)

## 🏗️ Stack Overview (Updated)

We moved **off AWS entirely**. New architecture:

| Component | Solution | Cost |
|-----------|----------|------|
| **Runtime** | Deno + Hono (on Pi cluster) | $0 |
| **Frontend** | Cloudflare Pages | $0 |
| **Edge/API** | Cloudflare Workers + Tunnels | $0 |
| **Site-to-Site** | Tailscale (WireGuard) | $0 |
| **SIEM** | Wazuh (self-hosted or Isaiah's) | $0 |
| **Monitoring** | Grafana + Prometheus (self-hosted) | $0 |
| **DNS** | Cloudflare (guardquote.ai) | $0 |

**Total Operational Cost: $0/month** ✨

---

## 👥 Team Roles

### Rafa ([@jag18729](https://github.com/jag18729)) — Infrastructure & Development
- App development (frontend + backend)
- CI/CD pipelines
- ML model integration
- SSO/OAuth implementation
- Networking & infrastructure
- Review and consolidate all deliverables

### Milkias ([@Malachizirgod](https://github.com/Malachizirgod)) — ICAM & Project Management
- **ICAM Review:** Security audit of auth/RBAC implementation
- Verify password hashing, JWT handling, session security
- Certify best practices compliance (OWASP ASVS)
- Documentation updates
- Project management (GitHub Projects)
- IAM procedure writeups

### Isaiah ([@ibernal1815](https://github.com/ibernal1815)) — Security Operations
- SIEM setup (Wazuh)
- Bastion host configuration
- Detection rules & alerts
- Security dashboards
- IDS/IPS integration

### Xavier — User Testing & Customer Liaison
- **User Acceptance Testing (UAT):** End-to-end workflow testing
- **Dataset Acquisition:** Finding new leads, sample datasets
- **Customer Liaison:** Gather feedback, represent end-user perspective
- Test client-facing features (quote flow, form validation)
- Report bugs and UX issues
- Help with presentation/demo from user perspective

---

## ✅ Tasks Before Saturday (2/7)

### Milkias
- [ ] Review client site: https://guardquote.vandine.us/
- [ ] Review admin site: https://guardquote.vandine.us/admin
- [ ] Bring feedback/notes to meeting
- [ ] Set up GitHub Projects board (if not done)

### Xavier
- [ ] Review client site: https://guardquote.vandine.us/
- [ ] Review admin site: https://guardquote.vandine.us/admin
- [ ] Bring feedback/notes to meeting

### Isaiah
- [ ] Set up Wazuh manager (local VM or cloud)
- [ ] Join Tailscale network (ask Rafa for invite)
- [ ] Generate agent registration keys for pi0 + pi1
- [ ] Share manager address + keys with team
- [ ] Prepare bastion host / IDS/IPS plan for Saturday

---

## 🔧 Technical Details

### Sites to Review

| Site | URL | Purpose |
|------|-----|---------|
| Client Landing | https://guardquote.vandine.us/ | Public-facing quote request |
| Get Quote | https://guardquote.vandine.us/quote | Quote form |
| Admin Login | https://guardquote.vandine.us/login | Team login |
| Admin Dashboard | https://guardquote.vandine.us/admin | Management console |
| Network Ops | https://guardquote.vandine.us/admin/network | Infrastructure view |

**Login credentials:** admin@guardquote.com / admin123

### GitHub Repository

- **Repo:** https://github.com/jag18729/guard-quote
- **Projects:** https://github.com/users/jag18729/projects/1
- **Clone:** `git clone https://github.com/jag18729/guard-quote.git`

### Infrastructure Access

| Host | IP | Tailscale IP | Role |
|------|-----|--------------|------|
| pi0 | 192.168.2.101 | 100.114.94.18 | LDAP, Logs, Vector |
| pi1 | 192.168.2.70 | 100.66.167.62 | API, Grafana, Prometheus |
| ThinkStation | 192.168.2.80 | 100.126.232.42 | Development |

### Wazuh SIEM Integration

Isaiah will set up:
1. Wazuh manager (on his infrastructure)
2. Agent registration for pi0 and pi1
3. Security dashboards and detection rules
4. Alert routing (Slack or email)

Data flow:
```
pi0/pi1 → Wazuh Agent → Tailscale → Isaiah's Wazuh Manager
```

---

## 📊 Presentation Updates Needed

The current presentation is AWS-focused. Need to update:

- [ ] Architecture diagrams (Pi cluster, not AWS)
- [ ] Cost analysis ($0/month operational)
- [ ] Security model (Cloudflare Access, Tailscale)
- [ ] SIEM section (Wazuh, not AWS Security Hub)
- [ ] Network diagrams
- [ ] Technology stack slides

---

## 📅 Timeline

| Date | Milestone |
|------|-----------|
| Sat 2/7 | Team meeting, sync on tasks |
| Week of 2/10 | Presentation updates |
| Week of 2/17 | Final review |
| TBD | Capstone presentation |

---

## 💬 Communication

- **GitHub Issues:** For tasks and bugs
- **Slack/Discord:** Quick questions
- **Saturday Meeting:** Major decisions

Questions? Ask Rafa or post in the team channel.
