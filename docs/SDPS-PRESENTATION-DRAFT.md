# GuardQuote — SDPS Presentation Draft
## "From Cloud to Bare Metal: Building a Production ML Platform on $200 of Hardware"

> **CIT 480 — Senior Design Project**
> **California State University, Northridge**
> **Team**: Rafael Garcia, Milkias Kassa, Isaiah Bernal, Xavier Nguyen

---

## SLIDE 1: Title

**GuardQuote**
*ML-Powered Security Service Pricing Platform*

- Live at: guardquote.vandine.us
- Running on Raspberry Pi cluster — zero cloud cost
- Real OAuth, real ML, real infrastructure

---

## SLIDE 2: What Is GuardQuote?

**Problem**: Security companies price quotes manually — inconsistent, slow, no data-driven insights.

**Solution**: An intelligent quoting platform that:
- Generates instant, accurate quotes using machine learning
- Enriches pricing with weather, demographics, and local event data
- Provides OAuth SSO (GitHub + Google) for secure access
- Runs entirely on self-hosted infrastructure — $0/month operational cost

**Business value**: Faster quotes → more clients → better pricing accuracy → higher margins.

---

## SLIDE 3: The Original Plan (Semester Start)

```
                    ☁️ AWS Cloud
    ┌──────────────────────────────┐
    │  EC2 instances               │
    │  RDS (PostgreSQL)            │
    │  CloudFront CDN              │
    │  Elastic Stack (ELK)         │
    │  S3 storage                  │
    │                              │
    │  Estimated cost: $50-100/mo  │
    └──────────────────────────────┘
```

- AWS infrastructure with EC2, RDS, CloudFront
- Elastic Stack (ELK) for SIEM/logging
- Deno + Hono framework for backend
- bcrypt + JWT for authentication
- Rule-based pricing formula (not real ML)
- Single server deployment

**Projected monthly cost: $50-100**

---

## SLIDE 4: Why We Changed Everything

### The Honest Truth

1. **AWS costs add up fast** — EC2 + RDS + data transfer = real money for a student project
2. **We had Raspberry Pis** — 3 Pis sitting unused. Why rent servers we already own?
3. **Elastic Stack is heavy** — ELK needs 4GB+ RAM just to run. Our Pi1 only has 8GB.
4. **Hono/Deno was a crutch** — frameworks add complexity. Bun 1.3 does everything natively.
5. **"ML" was a lie** — `price = base × risk × location × hours` is arithmetic, not machine learning.
6. **Professor wanted to see real engineering** — not a tutorial deployment, but actual infrastructure design with trade-offs and constraints.

### What Changed Our Thinking

- **Constraint-driven design** — 2GB-16GB RAM devices force you to think about efficiency
- **Network security** — A Palo Alto PA-220 firewall gave us real enterprise security segmentation
- **Learning depth** — We learned more about networking, security zones, and deployment in one weekend of Pi troubleshooting than a semester of clicking AWS buttons

---

## SLIDE 5: The Revised Architecture

```
Internet → Cloudflare Tunnel (free)
                │
        Pi1 — cloudflared (ingress)
                │
         PA-220 Firewall
         (4 security zones)
                │
    ┌───────────┼───────────┐
    │           │           │
  Pi0         Pi2        Orange Pi
  DNS/Logs   App+ML      Database
  SNMP       K3s         PostgreSQL
  (2GB)      (16GB)      (8GB, RISC-V)
                           500GB NVMe
                │
            WireGuard VPN
                │
              Pi3 (remote)
              Health probe
              (2GB, off-site)
```

**Total hardware cost: ~$250 one-time**
**Monthly cost: $0** (electricity + internet we already pay for)

---

## SLIDE 6: Trade-Offs — What We Gained vs. What We Lost

| Decision | What We Gained | What We Lost |
|----------|---------------|--------------|
| **AWS → Self-hosted** | $0/month, full control, deeper learning | Auto-scaling, managed services, easy deploys |
| **ELK → Prometheus/Grafana/Loki** | 10x less RAM, actually runs on Pi | Elastic's search capabilities, KQL queries |
| **Deno+Hono → Bun 1.3 native** | 55% less memory (20MB vs 44MB), zero deps | Framework ecosystem, middleware plugins |
| **bcrypt → argon2id** | Built-in to Bun, memory-hard (GPU resistant) | Wider library support (bcrypt is everywhere) |
| **Formula → Real XGBoost ML** | Actual predictions with confidence scores | Simplicity, need training data pipeline |
| **Docker → K3s** | Orchestration, rolling updates, self-healing | Simplicity, Docker Compose "just works" |
| **Single server → 4-node cluster** | Fault isolation, security zones, scalability | Complexity, networking challenges |

### The Hard Lesson

> "Every trade-off is a bet. We bet that learning infrastructure deeply was more valuable than shipping features quickly. We were right — but it cost us 3 weeks of debugging firewall rules."

---

## SLIDE 7: Lessons Learned — Infrastructure

### 1. Firewall Zones Change Everything
- PA-220 with 4 security zones (dmz-mgmt, dmz-services, dmz-security, untrust)
- **Lesson**: Traffic between zones is DENIED by default. We spent 2 days debugging "pi2 can't reach the database" before realizing we needed explicit PA-220 rules.
- **Quote**: "In cloud, everything can talk to everything. On bare metal, you earn every packet."

### 2. ARM64 Is Not x86
- Bun runs on ARM64 ✅, but some npm packages don't
- Docker images must be built `--platform linux/arm64`
- Python wheels for XGBoost: need ARM64 builds or compile from source
- **Lesson**: Always verify your stack runs on your target architecture BEFORE committing to it.

### 3. Memory Is the Constraint, Not CPU
- Pi2 (16GB): CPU sits at 3%, but memory matters for K3s + pods
- Bun's `--smol` flag: trades CPU for lower memory — essential on Pi
- PostgreSQL tuning: `shared_buffers=2GB` means 25% of RAM is dedicated to DB cache
- **Lesson**: On constrained hardware, memory budget is your project plan.

### 4. Cross-Zone Networking Is Hard
```
ThinkStation (10.x.x.x)  ←  untrust zone
       ↕ PA-220 rule needed
Pi2 (10.x.x.x)          ←  dmz-security zone
       ↕ PA-220 rule needed
Pi1 (10.x.x.x)          ←  dmz-services zone
```
- Each zone-to-zone hop needs an explicit firewall rule
- Order matters — rules evaluated top-to-bottom, `deny-interzone` at the bottom catches everything
- **Lesson**: Design your network BEFORE deploying services. Retrofitting firewall rules is painful.

---

## SLIDE 8: Lessons Learned — Software Architecture

### 5. Frameworks Are Training Wheels
- Started with Hono (Express-like framework for Bun)
- Realized: our route count is small enough for native `Bun.serve()` routing
- **Result**: Dropped Hono → zero framework dependencies. Only `pg` (database) and `jose` (JWT) remain.
- **MarketPulse proof**: Ported to pure Bun.serve → 20MB memory, 1,577 lines, single binary

### 6. Password Hashing Matters More Than You Think
- Started with bcrypt (SHA-based)
- Moved to argon2id (memory-hard, built into Bun)
- **Why**: bcrypt is fast to crack on GPUs. argon2id requires memory, making GPU attacks impractical.
- **Migration path**: `Bun.password.verify()` auto-detects bcrypt vs argon2id. Old users' passwords upgrade transparently on next login.

### 7. "ML" Means Real ML
- v1: `price = baseRate × riskMultiplier × locationModifier × hours × guards` — this is a formula, not ML
- v2: XGBoost model trained on 500+ historical quotes + weather/demographics/event data
- 3-source ensemble: trained model (60%) + external APIs (25%) + business rules (15%)
- **Lesson**: If you can write the logic in a spreadsheet formula, it's not machine learning.

### 8. OAuth Is Simpler Than You Think
- No passport.js, no auth libraries — just raw HTTP calls
- GitHub: 4 fetch calls (authorize URL → code → token → profile)
- Google: same pattern + JWT id_token with all user data
- **Lesson**: OAuth is just HTTP redirects and JSON. Frameworks add complexity without adding security.

---

## SLIDE 9: Lessons Learned — Operations

### 9. Monitor Everything, Or You're Flying Blind
- Prometheus (metrics) + Loki (logs) + Grafana (dashboards) + Vector (log shipping)
- 34 Prometheus targets all UP, SNMP monitoring on every network device
- 3 Grafana dashboards: Lab Overview, Network & Firewall, App Operations
- **Lesson**: The first thing you deploy should be monitoring. The second thing should be alerting.

### 10. SIEM Is Not Optional
- 35 auth event types logged to `siem_auth_events` table
- Auto-lockout after 5 failed login attempts
- CEF-compatible severity levels for Grafana/Loki dashboards
- **Lesson**: Security logging isn't a feature — it's a responsibility. If you handle user data, log every auth event.

### 11. Document Decisions, Not Just Code
- `guardquote-v2-architecture.md`: 1,462 lines — every decision with rationale
- Section 10: "14 Honest Concerns" — what we know we don't know
- **Lesson**: Future-you (and your teammates) will forget why you chose X over Y. Write it down.

### 12. Git Is Not a Backup Strategy
- OneDrive was syncing `node_modules/` — 50,000+ files churning on cloud storage
- Google OAuth secrets ended up on cloud-synced drive
- **Lesson**: .gitignore and cloud sync exclusions are security controls, not convenience features.

---

## SLIDE 10: Security Posture

### Network Segmentation (PA-220)
| Zone | Subnet | Purpose | Devices |
|------|--------|---------|---------|
| untrust | 10.x.x.x/24 | Main LAN, internet access | ThinkStation, UDM |
| dmz-mgmt | 10.x.x.x/24 | Management plane | Pi0 (DNS, logs, SNMP) |
| dmz-services | 10.x.x.x/24 | Application services | Pi1 (monitoring, ingress) |
| dmz-security | 10.x.x.x/24 | Workloads + security | Pi2 (K3s, Suricata) |

### Auth Security
- OAuth 2.0 with PKCE (prevents code interception)
- httpOnly cookies (prevents XSS token theft)
- argon2id password hashing (GPU-resistant)
- Auto-lockout (5 failures → 15 min lock)
- Session tracking with token hashes (never store raw tokens)

### SIEM Coverage
- Login success/failure, OAuth flows, password changes
- Rate limiting, brute force detection, impossible travel
- Admin actions audited
- All events shipped to Loki via Vector

---

## SLIDE 11: The Numbers

### Performance
| Metric | Value |
|--------|-------|
| Backend memory | 20MB (Bun with `--smol`) |
| API response time | <50ms (quote calculation) |
| K3s pods running | 12 across 3 namespaces |
| Prometheus targets | 34 (all UP) |
| Uptime | 99.5%+ (limited by home internet) |

### Codebase
| Component | Lines | Status |
|-----------|-------|--------|
| Backend (v1) | 6,650 | Production |
| Backend (v2 target) | ~4,000 | In development |
| Frontend | 5,620 | Production |
| ML Engine | TBD | Planned |
| Infrastructure code removed | -2,350 | Replaced by monitoring stack |
| v2 Schema migration | 500+ | Ready |

### Cost Comparison
| | AWS (projected) | Self-Hosted (actual) |
|--|----------------|---------------------|
| Monthly | $50-100 | $0 |
| Annual | $600-1,200 | $0 |
| Hardware (one-time) | $0 | ~$250 |
| **Break-even** | — | **3-5 months** |

---

## SLIDE 12: What's Next

### For SDPS Demo (March 3)
- [ ] Complete Bun 1.3 backend port
- [ ] OAuth SSO working end-to-end
- [ ] Real XGBoost ML predictions with confidence scores
- [ ] DEMO_MODE for offline showcase
- [ ] 3-node distributed demo story

### Beyond SDPS
- Orange Pi RV2 (RISC-V) as dedicated database server
- Pi3 off-site monitoring node at remote location
- Full enrichment pipeline (weather + demographics + events)
- Email workflows (quote delivery, ML reports)

---

## SLIDE 13: Demo

*Live walkthrough of:*
1. Landing page → Quote request
2. OAuth login (GitHub)
3. ML-powered quote with confidence score and enrichment data
4. Admin dashboard → Grafana link to real monitoring
5. Network diagram → 4 physical nodes, 4 security zones

---

## SLIDE 14: Q&A

**Architecture docs**: `docs/plans/guardquote-v2-architecture.md` (1,462 lines)
**Project board**: github.com/users/jag18729/projects/3
**Live site**: guardquote.vandine.us
**Monitoring**: grafana.vandine.us

> "We didn't just build an app — we built the infrastructure to run it, the security to protect it, and the monitoring to keep it alive."

---

## Appendix A: Technology Evolution

```
Semester Start (Sep 2025)        →        Now (Feb 2026)
─────────────────────────────────────────────────────────
AWS EC2                          →  Raspberry Pi cluster
AWS RDS                          →  PostgreSQL on Orange Pi (RISC-V)
Elastic Stack (ELK)              →  Prometheus + Grafana + Loki
Deno + Hono framework            →  Bun 1.3 native Bun.serve()
bcrypt + JWT                     →  OAuth SSO (GitHub+Google) + argon2id
Rule-based formula               →  XGBoost + API enrichment + rules
Docker Compose                   →  K3s (Kubernetes)
Single server                    →  4-node distributed cluster
No firewall                      →  PA-220 with 4 security zones
No monitoring                    →  34 Prometheus targets + 3 dashboards
No SIEM                          →  35 auth event types + auto-lockout
$50-100/month                    →  $0/month
```

## Appendix B: Team Contributions

| Member | Key Contributions |
|--------|-------------------|
| **Rafael** | Full-stack dev, ML engine, infrastructure (Pi fleet, PA-220, K3s), OAuth SSO, monitoring stack, CI/CD |
| **Milkias** | ICAM security review (OWASP), project management, GitHub Projects, documentation |
| **Isaiah** | SIEM research, IDS/IPS concepts, security monitoring planning |
| **Xavier** | UX design, UAT testing, mobile responsiveness, presentation materials |
