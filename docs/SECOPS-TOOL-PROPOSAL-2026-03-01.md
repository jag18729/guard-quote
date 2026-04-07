# SecOps Tool Proposal — Security Stack Expansion
**Date:** 2026-03-01
**Author:** Isaiah Bernal (@ibernal1815) — Security Operations
**Status:** Proposed — Pending Team Review
**Scope:** GuardQuote infrastructure (pi0, pi1, pi2, rv2) + future deployments

---

## 1. Context

This proposal evaluates Zeek and six additional security tools against the current GuardQuote security stack. Findings are drawn from the initial vulnerability audit (`SECOPS-FINDINGS-2026-03-01.md`) and a review of existing infrastructure coverage.

The goal is to identify tools that add distinct, non-overlapping security value — not tools that duplicate what Wazuh, Suricata, and the PA-220 already cover.

### Current Stack Coverage

| Layer | Tool | Coverage |
|-------|------|----------|
| Network IDS | Suricata (rv2) | Signature-based alerts, EVE JSON → Loki |
| Host IDS | Wazuh (pi2 manager) | FIM, rootkit detection, log analysis |
| Firewall | PA-220 | Deep packet inspection, App-ID, 4 DMZ zones |
| Log pipeline | Vector → Loki | Aggregation from all hosts |
| Dashboards | Grafana + Prometheus | Metrics, 34 targets |
| Identity | OpenLDAP + OAuth + argon2id | Auth, RBAC |
| Rate limiting | Redis sliding window | Brute force protection |

### Coverage Gaps (Pre-Proposal)

| Gap | Impact |
|-----|--------|
| No container runtime security | K3s pods on pi2 are unmonitored at the syscall level |
| No image vulnerability scanning | Container images deployed without CVE checks |
| No active IP blocking | Wazuh detects but doesn't block |
| No web app scanning | API/frontend not tested for OWASP Top 10 |
| No static analysis in CI | Code vulnerabilities reach production undetected |
| No system hardening baseline | No scored audit of host configuration |

---

## 2. Zeek — Not Recommended

### What It Does

Zeek is a network analysis framework that generates rich protocol-level logs: `conn.log`, `dns.log`, `http.log`, `ssl.log`, `x509.log`, `files.log`. Unlike Suricata's alert-centric model, Zeek logs everything and lets you query it. It's excellent for threat hunting and behavioral analysis.

### Why It Doesn't Fit This Stack

| Reason | Detail |
|--------|--------|
| Suricata overlap | Suricata's EVE JSON already produces connection, HTTP, DNS, and TLS logs. Zeek's primary value add is covered at ~80% |
| PA-220 overlap | The Palo Alto firewall already performs App-ID deep packet inspection at the network edge |
| RISC-V incompatible | rv2 (the designated network sensor) has no official Zeek build for RISC-V. Running Zeek on pi2 would require moving it off the wire |
| Resource cost | Zeek requires a dedicated log pipeline and storage backend. ELK was already dropped for RAM constraints — Zeek has the same problem |
| Complexity-to-value ratio | For a team of four with a March 3 deadline, the setup time doesn't justify the incremental coverage |

**Recommendation:** Do not deploy Zeek. Revisit post-capstone if dedicated network forensics becomes a requirement and a higher-powered sensor is available.

---

## 3. Recommended Tools

### 3.1 Falco

**Category:** Container Runtime Security
**Deployment Target:** pi2 (K3s DaemonSet)
**Priority:** High

#### What It Does

Falco monitors Linux kernel syscalls in real time using eBPF. It detects anomalous behavior inside running containers — shells spawned inside pods, writes to sensitive paths, unexpected network connections, privilege escalation attempts. Suricata watches the wire; Falco watches inside the container. These are complementary, non-overlapping layers.

#### Pros

- Fills the one gap Suricata and Wazuh cannot cover: **in-container runtime behavior**
- Deploys as a Kubernetes DaemonSet — fits naturally into the existing K3s setup on pi2
- ARM64 compatible — official images available for Raspberry Pi
- Ships with 100+ default rules covering MITRE ATT&CK techniques
- Native Grafana/Prometheus integration via Falco exporter
- Alerts can forward to Loki via Vector, keeping the existing log pipeline intact
- Active CNCF project — well maintained, strong community

#### Cons

- Requires kernel headers on pi2 (or eBPF probe compilation) — one-time setup complexity
- eBPF probe may need recompilation after kernel updates
- Default ruleset generates noise; tuning takes time
- Resource overhead is non-trivial on a Pi (see below)
- Alert volume can be high in a busy K3s cluster without rule tuning

#### Resource Usage

| Metric | Estimate |
|--------|----------|
| CPU | 5–15% per core under load (eBPF probe) |
| RAM | ~100–200 MB (Falco daemon + userspace) |
| Disk | Negligible (logs forwarded, not stored locally) |
| Network | Minimal — alert forwarding only |

#### Trade-offs Summary

| | |
|--|--|
| **Adds** | Syscall-level container visibility, MITRE ATT&CK coverage inside K3s |
| **Costs** | ~200 MB RAM on pi2, kernel header dependency, rule tuning time |
| **Replaces** | Nothing — fills a gap no current tool covers |

---

### 3.2 Trivy

**Category:** Container Image Vulnerability Scanning
**Deployment Target:** GitHub Actions CI/CD (pi2 self-hosted runner)
**Priority:** High

#### What It Does

Trivy scans container images, filesystems, and IaC configs for known CVEs, misconfigurations, and exposed secrets before they reach production. It integrates into the CI pipeline — every image build gets scanned before deployment to K3s.

#### Pros

- **Zero runtime overhead** — runs in CI, not on the cluster
- Covers OS packages, language dependencies (npm, pip, bun), and Kubernetes manifests in one tool
- Catches secrets accidentally baked into images (complements Finding #2 from the audit)
- Fast — a typical image scan completes in 15–30 seconds
- ARM64 binary available, runs natively on the pi2 self-hosted runner
- SARIF output integrates with GitHub Security tab for free
- Actively maintained by Aqua Security, part of the CNCF ecosystem
- One GitHub Actions step — minimal integration effort

#### Cons

- Only catches known CVEs (relies on NVD, OS advisories) — zero-days will pass through
- Can produce false positives on vendored or forked packages
- Requires internet access from the CI runner to pull vulnerability databases
- High-severity findings may block deployments until triaged — needs a policy decision on severity thresholds
- Does not scan running containers — only images at build time

#### Resource Usage

| Metric | Estimate |
|--------|----------|
| CPU | Spike during scan (~1–2 cores for 15–30s per image) |
| RAM | ~200–400 MB during scan (vulnerability DB loaded in memory) |
| Disk | ~200 MB for cached vulnerability DB |
| Network | One-time DB download per runner startup |

#### Trade-offs Summary

| | |
|--|--|
| **Adds** | CVE visibility before deployment, secret detection in images |
| **Costs** | Possible pipeline slowdown, false-positive triage burden |
| **Replaces** | Manual image review (which wasn't happening) |

---

### 3.3 CrowdSec

**Category:** Community-Based Intrusion Prevention System (IPS)
**Deployment Target:** pi0, pi1 (agent), pi2 (bouncer)
**Priority:** High

#### What It Does

CrowdSec is a modern IPS that parses logs, detects attack patterns, and shares attacker IPs with a global community blocklist. Unlike Fail2ban, it separates detection (the agent, which reads logs) from enforcement (the bouncer, which blocks). It actively bans IPs that are brute-forcing SSH, hammering the API, or scraping for vulnerabilities — and benefits from crowd-sourced threat intelligence.

#### Pros

- **Active blocking** — fills the gap Wazuh leaves (Wazuh detects; CrowdSec blocks)
- Community threat feed provides real-time blocklists from hundreds of thousands of nodes worldwide — you get threat intel without building it yourself
- Log parsers exist for nginx, sshd, and custom app logs — covers GuardQuote API patterns
- Lightweight agent; bouncer is a simple iptables/nftables rule applier
- ARM64 compatible
- Prometheus metrics exporter built in — plugs directly into existing Grafana dashboards
- Decisions (blocks) are logged and auditable
- Open source, self-hostable — no forced cloud dependency

#### Cons

- Requires a CrowdSec account to access the community blocklist (free tier available)
- Two-component model (agent + bouncer) adds operational complexity vs. Fail2ban's simplicity
- False positive risk — community blocklists occasionally flag legitimate IPs (CDN egress, Cloudflare ranges)
- Sharing your log metadata with the CrowdSec network is opt-in but worth reviewing for a production environment
- Bouncer needs careful integration on hosts behind Cloudflare Tunnel to avoid blocking Cloudflare's own IPs

#### Resource Usage

| Metric | Estimate |
|--------|----------|
| CPU | < 1% steady state |
| RAM | ~50–100 MB (agent + bouncer combined) |
| Disk | ~50 MB (decisions DB, local scenario cache) |
| Network | Periodic pull of community blocklist updates |

#### Trade-offs Summary

| | |
|--|--|
| **Adds** | Active IP blocking, community threat intelligence, Prometheus metrics |
| **Costs** | Two-component setup, false-positive risk on Cloudflare egress IPs, CrowdSec account |
| **Replaces** | The blocking half of what Wazuh active response could do — cleaner separation of concerns |

---

### 3.4 Nuclei

**Category:** Web Application Vulnerability Scanner
**Deployment Target:** Bastion / Kali (external scans against guardquote.vandine.us)
**Priority:** Medium

#### What It Does

Nuclei is a fast, template-driven vulnerability scanner from ProjectDiscovery. It runs over 9,000 community templates covering OWASP Top 10, CVEs, misconfigurations, exposed panels, and subdomain takeover. Point it at `guardquote.vandine.us` and it probes the live application for the classes of vulnerability we identified in the audit (CORS, auth issues, endpoint enumeration).

This tool is central to **issue #124 (Kali pen testing — real attack data for SIEM showcase)**. Running Nuclei against the live app generates real Suricata and Wazuh alerts, which makes the SIEM demo visually compelling.

#### Pros

- 9,000+ templates maintained by the community, updated frequently
- Covers exactly the vulnerabilities found in the audit: CORS misconfig, auth bypass, rate limit evasion
- Fast — full web scan completes in minutes
- SARIF and JSON output integrates with GitHub Security and custom dashboards
- Can run from Kali or the bastion without installing on any Pi
- The scan traffic generates authentic Suricata/Wazuh alerts — real data for the demo
- Template-based: easy to write custom rules for GuardQuote-specific endpoints

#### Cons

- **Must only be run against infrastructure you own** — not a "fire and forget" tool
- Noisy scanner traffic will trigger alerts across the stack — coordinate scans with the team
- Some templates can cause minor service disruption (DOS-adjacent probes) — use `-severity low,medium,high` to exclude destructive checks
- Does not replace manual penetration testing for a thorough security assessment
- Requires rate limiting awareness — may trigger your own CrowdSec/rate limiter if not tuned

#### Resource Usage

| Metric | Estimate |
|--------|----------|
| CPU | High burst on scanner host during scan |
| RAM | ~100–200 MB on scanner host |
| Disk | ~50 MB (templates cache) |
| Target load | Moderate — comparable to normal traffic spike |

#### Trade-offs Summary

| | |
|--|--|
| **Adds** | OWASP Top 10 coverage against live app, real SIEM alert data, feeds issue #124 |
| **Costs** | Requires controlled execution, can generate false-positive alerts in monitoring |
| **Replaces** | Ad-hoc manual testing — not a replacement for a full pentest |

---

### 3.5 Semgrep

**Category:** Static Application Security Testing (SAST) — CI/CD
**Deployment Target:** GitHub Actions
**Priority:** Medium

#### What It Does

Semgrep runs pattern-based static analysis against source code on every pull request. It catches security vulnerabilities at the code level before they reach production — exactly the type of issues found in the audit (timing attack on `s2s-auth.ts`, IP spoofing on `rate-limit.ts`). It supports TypeScript, Python, and every language in the GuardQuote stack.

#### Pros

- Would have caught **three of the four findings** in `SECOPS-FINDINGS-2026-03-01.md` automatically
- Zero runtime footprint — runs in CI only
- Free tier covers open-source and private repos up to a reasonable limit
- Community ruleset (`p/typescript`, `p/python`, `p/owasp-top-ten`) requires no custom rule writing to get started
- Results post directly as PR comments — developers see findings before merge
- Custom rules can be written in YAML to flag GuardQuote-specific anti-patterns
- Integrates with GitHub Advanced Security for free on public repos

#### Cons

- Static analysis only — cannot catch runtime or configuration vulnerabilities
- Can produce false positives, especially on complex type-narrowing patterns in TypeScript
- Free tier has scan rate limits; large repos may hit them
- Requires developer buy-in — findings need to be triaged and acted on, or alert fatigue sets in
- Does not replace code review; supplements it

#### Resource Usage

| Metric | Estimate |
|--------|----------|
| CPU | CI runner spike during scan (~30–90s per PR) |
| RAM | ~500 MB–1 GB during scan on CI runner |
| Disk | Negligible |
| Network | Minimal — results sent to Semgrep cloud (or self-hosted) |

#### Trade-offs Summary

| | |
|--|--|
| **Adds** | Automated code-level vulnerability detection on every PR |
| **Costs** | CI time overhead, false-positive triage, developer workflow change |
| **Replaces** | Manual security code review (which wasn't systematic) |

---

### 3.6 Lynis

**Category:** System Hardening Auditor
**Deployment Target:** pi0, pi1, pi2 (on-demand)
**Priority:** Medium

#### What It Does

Lynis is an open-source system auditing tool that performs a scored hardening assessment of Linux hosts. It checks SSH config, file permissions, kernel parameters, installed packages, cron jobs, PAM configuration, and more. It produces a hardening index score and a prioritized list of remediation items.

#### Pros

- **Zero ongoing overhead** — run on demand, not a daemon
- No installation required on target (can run from a tarball)
- Produces a concrete, scored baseline for each host — good documentation artifact for the capstone
- Finds low-hanging hardening wins (SSH `PermitRootLogin`, `MaxAuthTries`, kernel `net.ipv4.tcp_syncookies`, etc.)
- Output is human-readable and easily converted into a remediation checklist
- ARM64 compatible, pure shell script — runs on any Debian-based host
- Free, open source, widely used in compliance frameworks (CIS Benchmarks alignment)

#### Cons

- Point-in-time snapshot only — needs to be re-run after system changes
- Does not monitor continuously (not a replacement for Wazuh FIM)
- Some suggestions require kernel-level changes that may conflict with K3s requirements on pi2
- Output is verbose — requires interpretation to prioritize findings
- Not automated — relies on someone remembering to run it

#### Resource Usage

| Metric | Estimate |
|--------|----------|
| CPU | Minimal spike during audit (~1–5 minutes) |
| RAM | < 50 MB during scan |
| Disk | ~5 MB (tool) + report output |
| Network | None — runs entirely locally |

#### Trade-offs Summary

| | |
|--|--|
| **Adds** | Scored hardening baseline for all hosts, compliance-aligned audit evidence |
| **Costs** | Manual execution, verbose output needs interpretation |
| **Replaces** | Ad-hoc hardening checks — gives them structure and a score |

---

## 4. Coverage Matrix

How proposed tools map to security layers and current gaps:

| Layer | Current Coverage | Proposed Addition |
|-------|-----------------|-------------------|
| Network (wire) | Suricata, PA-220 | — (covered) |
| Network (blocking) | PA-220 rules only | **CrowdSec** |
| Host (detection) | Wazuh | — (covered) |
| Host (hardening) | None | **Lynis** |
| Container (runtime) | None | **Falco** |
| Container (images) | None | **Trivy** |
| Web app (scanning) | None | **Nuclei** |
| Code (static analysis) | None | **Semgrep** |
| Threat intelligence | None | **CrowdSec** (community feed) |

---

## 5. Resource Budget Summary

Estimated additional load on the Pi cluster if all tools are deployed:

| Tool | Host | RAM | CPU (steady) | Notes |
|------|------|-----|--------------|-------|
| Falco | pi2 | ~200 MB | 5–15% | eBPF DaemonSet |
| CrowdSec agent | pi0, pi1 | ~50 MB each | < 1% | Two agents |
| CrowdSec bouncer | pi2 | ~10 MB | < 1% | iptables enforcer |
| Trivy | CI runner | ~400 MB | Burst only | Scan time only |
| Nuclei | Kali/bastion | ~200 MB | Burst only | Not on Pi cluster |
| Semgrep | CI runner | ~1 GB | Burst only | Scan time only |
| Lynis | pi0/pi1/pi2 | ~50 MB | Burst only | On-demand only |
| **Total (persistent)** | | **~510 MB** | **~7–17%** | Falco + CrowdSec |

pi2 currently has 16GB RAM and runs K3s. The persistent overhead is well within budget. Trivy, Semgrep, and Lynis all run in burst mode only and do not affect steady-state cluster performance.

---

## 6. Implementation Priority

### Phase 1, Immediate
These can be added quickly and directly support open issues:

| Tool | Effort | Rationale |
|------|--------|-----------|
| Lynis | 1–2 hours | Run against all three Pis, document scores — good demo material, zero risk |
| Semgrep | 2–3 hours | One GitHub Actions step, catches the audit findings automatically from now on |
| Nuclei | 2–4 hours | Feeds issue #124 directly — run against guardquote.vandine.us, generate real SIEM data |

### Phase 2 — Sprint 3 (March 3–14)
Core infrastructure additions with moderate setup time:

| Tool | Effort | Rationale |
|------|--------|-----------|
| Trivy | 3–5 hours | CI integration, image scanning before K3s deployment |
| CrowdSec | 4–6 hours | Agent on pi0/pi1, bouncer on pi2, Grafana dashboard |

### Phase 3 — Sprint 4 (March 24 – April 4)
Highest value but most setup complexity:

| Tool | Effort | Rationale |
|------|--------|-----------|
| Falco | 6–10 hours | K3s DaemonSet, eBPF probe, rule tuning, Loki forwarding |

---

## 7. Recommendation

Deploy all six proposed tools across two phases. Skip Zeek — it adds no coverage that Suricata and the PA-220 don't already provide, at significant cost in complexity and RAM.

The highest-priority additions for the capstone demo are:

1. **Nuclei** — generates real attack traffic for the SIEM showcase (issue #124)
2. **Lynis** — produces a hardening report that demonstrates security maturity
3. **Semgrep** — closes the code-level gap found in the audit, effective immediately

The highest-priority additions for long-term infrastructure security are:

1. **Falco** — the only tool that covers container runtime behavior
2. **CrowdSec** — the only tool that actively blocks threats (not just detects them)
3. **Trivy** — prevents vulnerable images from reaching the cluster

---

*This proposal is intended to inform future deployment decisions. No tools have been installed. All resource estimates are based on vendor documentation and community benchmarks on ARM64 hardware.*
