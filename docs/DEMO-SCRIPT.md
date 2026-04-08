# GuardQuote Live Demo Script

**Event**: CIT 480 Senior Design Final Presentation
**Date**: April 18, 2026
**Total slot**: 25 minutes presentation + 5 minutes Q&A
**Team**: Rafael Garcia, Milkias Kassa, Isaiah Bernal, Xavier Nguyen

---

## Setup checklist (day-of, before walking on stage)

- [ ] Laptop on stable wifi or hotspot
- [ ] All four browser tabs pre-loaded:
  - https://guardquote.vandine.us/
  - https://guardquote.vandine.us/architecture.html
  - https://guardquote.vandine.us/tech-stack
  - https://soc.vandine.us/
- [ ] DEMO_MODE backup ready in case live infra fails
- [ ] Slide deck open in presenter view, projector connected
- [ ] One team member in the front row watching for time signals
- [ ] Phones on silent

---

## Section-by-section script

### 0:00 to 1:00, Open and team intro (Rafa)

Slide source: Xavier deck slides 1 to 2

> "Hi everyone, we're the GuardQuote team. I'm Rafael, project lead. With me are Milkias, our IAM engineer, Isaiah, our security operations engineer, and Xavier, who owns UX and design. Over the next 25 minutes we'll show you a security service quoting platform we built from scratch on a Raspberry Pi cluster, why we chose every technology in the stack, and a live demo of the running system."

**Hand-off**: "Xavier, take it away with the problem statement."

---

### 1:00 to 3:00, Problem statement (Xavier)

Slide source: Xavier deck slide 3

Key beats:
- Security service pricing today is opaque, manual, and inconsistent across vendors
- Small businesses get quoted by gut feel, not data
- Existing solutions are either enterprise tools at $24k+ per year or spreadsheet-based
- We saw an opportunity to make pricing fast, predictable, and free to host

**Hand-off**: "I'll hand it back to Rafa for the solution overview."

---

### 3:00 to 5:00, Solution overview (Rafa)

Slide source: Xavier deck slide 4 (architecture comparison) + tease the live page

Key beats:
- One-line summary: ML-powered quoting platform that runs on $810 of hardware and free-tier hosting
- Two questions the system answers: how much should this cost, and how risky is the job
- Built on real production patterns: Cloudflare Tunnel, K3s, PostgreSQL, OAuth, SIEM
- Originally planned as AWS hybrid (we'll show that comparison), pivoted to self-hosted in February when the AWS bill started racking up

**Transition**: "Let me show you the actual architecture on the live site."

---

### 5:00 to 8:00, Architecture deep dive (Rafa)

Live page: https://guardquote.vandine.us/architecture.html

Walk path:
1. **Top of page**, point at the System Architecture diagram
2. Trace the request path: Users to Cloudflare to PA-220 to K3s on Pi2 to Postgres on Pi1
3. Scroll to **Network section**, three cards: UDM, PA-220, Tailscale Mesh
4. Scroll to **Bastion Hosts**, three cards: NetEng, Admin, Threat
5. **Spend 30 seconds on Threat Bastion** because the RV2 RISC-V story is the strongest punchline
   - "We host the threat analysis sandbox on a RISC-V board, not ARM or x86. Anything that escapes the sandbox cannot pivot into production hosts because it cannot execute on the wrong CPU architecture. The board also sits on the PA-220 SPAN port, so it sees attack traffic out of band rather than in the production routing path. Two layers of isolation for free."
6. Briefly mention the Application Components and Security Infrastructure cards

**Transition**: "Each technology choice on that page solves a specific problem. Let me show you how we think about it."

---

### 8:00 to 10:30, Tech stack rationale (Rafa)

Live page: https://guardquote.vandine.us/tech-stack

Walk path:
1. **Why Bun section**, point at the four big-number stats: 12ms cold start, 142K req/s, 34MB memory, ARM64 optimized
2. **Why It Matters on Real Hardware** benchmarks: Bun vs Node.js, 7x faster cold starts because we run on a Pi
3. **Supply Chain Security** card: the axios incident from March 31 framing
   - "On March 31, the most popular HTTP client on npm got hijacked. Every Node project that ran npm install in that window got a remote access trojan. We were never at risk because Bun ships HTTP, crypto, password hashing, and bundling as runtime built-ins. Fewer dependencies means a smaller blast radius."
4. **ML-Powered Pricing Engine** big-number panels
   - "93% of quote prices land within striking distance of the real number. 87% of jobs get the correct risk tier. Under 50ms to price a quote, faster than a single page load."

**Hand-off**: "Milkias is going to walk you through how we built the identity and access layer."

---

### 10:30 to 13:00, IAM (Milkias)

Slide source: Milkias deck (5 slides)

Key beats:
- Replaced AWS Managed AD ($125 a month) with self-hosted OpenLDAP on a Raspberry Pi
- OAuth 2.0 with PKCE: GitHub, Google, Microsoft providers
- JWT session management with 24h access + 7d refresh, argon2id password hashing
- K3s on Pi2 hosts the SOC Dashboard and SentinelNet ML detector
- gRPC vs REST: REST for the public API, gRPC for internal backend-to-ML communication

**Hand-off**: "Now Isaiah is going to walk you through what we did on the security ops side."

---

### 13:00 to 15:30, SecOps and audit findings (Isaiah)

Slide source: Isaiah deck (3 slides, v2)

Key beats:
- Wazuh SIEM running on Pi2, agent on Pi0 reporting auth events and FIM
- 35 auth event types defined, full pipeline from rsyslog through Vector through Loki to Wazuh
- **Grey-hat audit**: 4 findings + 1 gap. **Three of the four findings are now fixed and live in production this week**:
  - Timing attack on the S2S secret comparison: replaced with constant-time crypto.timingSafeEqual (PR #203)
  - Rate limiter trusting X-Forwarded-For: now uses Cloudflare-signed CF-Connecting-IP (PR #204)
  - Wildcard CORS: replaced with explicit origin allowlist (PR #205)
- Honest about the gap: a /api/siem/ingest endpoint planned but not built

**Transition**: "Let me hand you back to Rafa for the live demo."

---

### 15:30 to 18:00, Live demo, quote flow and admin (Rafa)

Live site: https://guardquote.vandine.us/

Walk path:
1. **Landing page** (5 seconds): point at the trust signals and "$0 monthly cost" callout
2. **Quote wizard**: fill out a real quote (Concert, 200 attendees, 4 guards, 8 hours, San Diego)
   - Submit, wait for the ML prediction
   - "Backend just called the ML engine over gRPC, ran the GradientBoost model, and returned a price plus a risk tier. End to end under 200ms."
3. **Login** as admin
4. **Admin dashboard**: stats overview, point at the live numbers
5. **User management**: show the IAM role badges, demonstrate the RBAC permission boundaries
6. **ML Engine page**: model status, training data count, R^2 score
7. **Security events page**: show the auth event log

**Hand-off**: "Isaiah will take it from here for the SOC dashboard tour."

---

### 18:00 to 19:30, Live demo, SOC Dashboard (Isaiah)

Live site: https://soc.vandine.us/

Walk path (pick the two strongest tabs to spend time on):
1. **Overview**: live alert stats, threat categories, agent roster
2. **Alert Feed**: split-pane with full event detail, MITRE ATT&CK mapping, risk score
3. **Threat Intel**: donut charts, IP reputation table
4. (Optional, time permitting) **ML Engine** tab and **Zones/FW** tab

**Hand-off**: "Xavier is going to close us out with the cost story and lessons learned."

---

### 19:30 to 21:00, Cost story and lessons learned (Xavier)

Slide source: Xavier deck slides 9, 10, 18

Key beats:
- **Cost**: $810 of hardware + free-tier hosting for year one. Equivalent commercial stack starts at $24,000 a year.
- **Performance wins from ARM64 + Bun**: 7x faster cold starts, 2x throughput, half the memory footprint
- **Lessons learned**:
  - Bun outperformed every Node.js benchmark we ran on Pi hardware
  - PA-220 zone policies caught real attack patterns during Isaiah's audit
  - AWS Managed AD cost ($125/mo) surprised the team and pushed the migration
  - Tailscale zero-config mesh removed an entire category of network problems

**Hand-off**: "Rafa will close us out."

---

### 21:00 to 22:00, Closing (Rafa)

Slide source: Xavier deck slide 20 (Summary)

Key beats:
- "We started planning in September. Built AWS, took it down in January, rebuilt on Pi cluster in February through April."
- "$0 monthly cost. R squared of 0.93 on price prediction. 87% accuracy on risk classification. Three real security findings caught and fixed by our own team this week."
- "What we want you to take away: every technology choice on this site solves a real problem we ran into, not because something was trending."
- "Thanks. Happy to take questions."

---

### 22:00 to 25:00 (or 25:00 to 30:00), Q&A (all four)

**Anticipated questions and short answers**:

| Question | Answer |
|----------|--------|
| Did you actually deploy AWS or just plan it? | Xavier deployed it briefly Dec to Jan; we have the architecture diagrams and the cost data; pulled it when bills started racking up |
| Why GradientBoost instead of deep learning? | 1100 training samples is too small for a neural network. Tree-based ensembles win on small structured datasets. |
| How do you handle a single Pi failure? | No automatic failover; manual cutover with restore-from-backup. K3s does not help with single-node clusters. We accepted that trade-off for simplicity. |
| Is there a Wazuh agent on every Pi? | Manager on Pi2, active agent on Pi0. Pi1, ThinkStation, and the dev box are registered but currently disconnected. |
| Why self-hosted over cloud? | $24k a year is real money. We wanted to learn the underlying systems, not pay AWS to abstract them. |
| What is the threat model? | Internet-facing app behind Cloudflare and PA-220, four firewall zones, OAuth + JWT, SIEM auditing, sandboxed analysis on a different CPU architecture. |
| How would you scale this? | Pi cluster works for the demo footprint. For real production, the same architecture maps to commodity AMD64 hardware in a colo. The Bun + Hono + Postgres stack scales horizontally. |
| What is in production right now? | Everything on https://guardquote.vandine.us right now is the live system you just saw. Nothing was simulated. |

---

## Time budget summary

| Time | Section | Speaker | Source |
|------|---------|---------|--------|
| 0:00 to 1:00 | Open + team | Rafa | slides 1-2 |
| 1:00 to 3:00 | Problem | Xavier | slide 3 |
| 3:00 to 5:00 | Solution overview | Rafa | slide 4 + live |
| 5:00 to 8:00 | Architecture deep dive | Rafa | live arch page |
| 8:00 to 10:30 | Tech stack rationale | Rafa | live tech-stack |
| 10:30 to 13:00 | IAM | Milkias | Milkias deck |
| 13:00 to 15:30 | SecOps + audit | Isaiah | Isaiah deck |
| 15:30 to 18:00 | Demo: quote + admin | Rafa | live site |
| 18:00 to 19:30 | Demo: SOC | Isaiah | live SOC |
| 19:30 to 21:00 | Cost + lessons | Xavier | slides 9, 10, 18 |
| 21:00 to 22:00 | Closing | Rafa | slide 20 |
| 22:00 to 27:00 | Q&A | all | - |

Total: 22 minutes presentation + 5 minutes Q&A = 27 minutes. Two minutes of buffer for transitions and applause.

---

## Things to NOT do during the demo

- Do not click around the architecture page randomly; follow the walk path above
- Do not type passwords on stage; use a saved bookmark with the demo user pre-logged in
- Do not improvise an answer to a question if you do not know; say "good question, I'd want to look at the actual code before answering" and move on
- Do not mention the unfixed audit findings unless asked; the slide carries the story, do not relitigate it
- Do not apologize for missing features (Wazuh agents on every host, /api/siem/ingest endpoint); the prof knows the scope, no need to call attention

---

*Last updated: 2026-04-07*
