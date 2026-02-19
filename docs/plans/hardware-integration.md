# Hardware Integration Plan — Orange Pi RV2 + SN580 NVMe + Pi3

> **Status**: Planning
> **Last updated**: 2026-02-18

---

## Hardware Inventory

### Orange Pi RV2 (8GB) — NEW

| Spec | Value |
|------|-------|
| **SoC** | Ky X1 RISC-V, 8 cores @ 1.6GHz |
| **RAM** | 8GB LPDDR4X |
| **Storage** | M.2 2230 slot (PCIe NVMe), microSD, eMMC module support |
| **Network** | Dual Gigabit Ethernet, Wi-Fi 5.0, BT 5.0 (BLE) |
| **AI** | 2 TOPS NPU |
| **USB** | USB 3.0, USB-C power |
| **Display** | Dual HDMI out |
| **OS** | Ubuntu 24.04 (official), headless server image available |
| **Price** | ~$64 USD |
| **Architecture** | RISC-V 64-bit (rv64gc) — **NOT ARM64** |

**Key consideration**: This is RISC-V, not ARM. Most Docker images and binaries we use (Bun, Python wheels, K3s) are built for ARM64 or x86. RISC-V support is growing but not universal. This affects what we can run on it.

### WD Blue SN580 NVMe (500GB) — NEW

| Spec | Value |
|------|-------|
| **Capacity** | 500GB |
| **Interface** | M.2 2230 PCIe Gen 4 NVMe |
| **Read** | Up to 4,150 MB/s |
| **Write** | Up to 4,150 MB/s |
| **Form factor** | M.2 2230 |

**Perfect match**: The Orange Pi RV2 has an M.2 2230 slot. The SN580 is 2230 form factor. This gives the Orange Pi fast NVMe storage — massively better than microSD.

### Pi3 (2GB Raspberry Pi) — EXISTING PLAN

Already planned in `docs/PI3-PLAN.md`. Going to mom's house as off-site monitoring node.

| Spec | Value |
|------|-------|
| **RAM** | 2GB |
| **Architecture** | ARM64 (aarch64) |
| **Storage** | microSD |
| **Location** | Mom's house (remote, behind vandine-fw) |
| **Connectivity** | WireGuard + Tailscale |
| **Constraint** | No Docker — too tight on 2GB. Everything systemd-native. |

---

## What Goes Where

### Current Fleet Layout

```
Studio (Reveal SOHO):
├── ThinkStation (192.168.2.80) — WSL2, OpenClaw gateway
├── PA-220 reveal-fw (192.168.2.20) — firewall
├── UDM (192.168.2.1) — gateway/router
├── pi0 (192.168.21.10) — DNS, identity, log shipping, SNMP
├── pi1 (192.168.20.10) — Grafana, Prometheus, Loki
├── pi2 (192.168.22.10) — K3s workloads, security stack
├── Orange Pi RV2 — ??? (to be planned)
└── PostgreSQL host (192.168.2.70) — ??? (status unclear, needs recovery)

Mom's House (Vandine):
├── PA-220 vandine-fw (192.168.2.14) — unreachable
├── pi3 (2GB) — off-site monitoring (planned)
└── UniFi APs + switch — offline
```

### Proposed Roles

#### Orange Pi RV2 + SN580: **PostgreSQL Database Server**

**The case for this**: The current PostgreSQL host (192.168.2.70) has unclear status — unreachable from pi2, needs recovery from backups, and needs to move onto the matrix network. Instead of fighting with an unstable host, deploy the Orange Pi RV2 as a dedicated database server.

**Why it fits**:
- **8GB RAM** — PostgreSQL loves RAM for shared_buffers and OS cache. 8GB is generous for our DB sizes (GuardQuote + MarketPulse are small).
- **500GB NVMe** — Fast storage for DB I/O. PCIe Gen 4 is wildly overkill for our workload, but it means the DB will never be I/O bound.
- **Dual Gigabit Ethernet** — One for the matrix network, one for management/backup. Or bond for redundancy.
- **Low power** — Always-on DB server that sips power.
- **2 TOPS NPU** — Could potentially accelerate ML inference in the future (experimental, RISC-V ML ecosystem is immature).

**The risk**: RISC-V software compatibility. PostgreSQL itself compiles fine for RISC-V and Ubuntu 24.04 includes it in apt. But:
- Need to verify: `apt install postgresql-16` works on Orange Pi RV2 Ubuntu 24.04
- Need to verify: `pg_dump`/`pg_restore` work for migrating data from backups
- No Bun on RISC-V (Bun only supports x86-64, ARM64, and macOS ARM64)
- No K3s on RISC-V (K3s requires ARM64 or x86-64)

**This is fine** because a dedicated DB server doesn't need Bun or K3s. It just runs PostgreSQL + node_exporter + Vector. All available for RISC-V via apt.

**Proposed network placement**:

```
Option A: On dmz-services (alongside pi1)
  IP: 192.168.20.20 (or .70 if we want to reuse the old DB IP concept)
  Zone: dmz-services (eth1/8)
  Pro: Same zone as Grafana/monitoring, no new firewall rules for Prometheus scraping
  Con: pi1's switch port may already be in use

Option B: On dmz-security (alongside pi2)
  IP: 192.168.22.20
  Zone: dmz-security (eth1/2)
  Pro: Closest to the K3s pods that query it, minimal latency
  Con: Need PA-220 rules for pi1 Prometheus to scrape it

Option C: Dedicated zone (lab)
  IP: 192.168.23.10 or 192.168.24.10
  Zone: lab (eth1/5 or eth1/6)
  Pro: Isolated database zone, cleanest security posture
  Con: Need PA-220 rules for ALL access (pi1 monitoring, pi2 apps)

Option D: On main LAN (192.168.2.x)
  IP: 192.168.2.70 (replace the old host)
  Zone: untrust (via UDM)
  Pro: No PA-220 changes needed — existing allow-guardquote-db rule already targets 192.168.2.70
  Con: DB on the untrust zone is not ideal security-wise
```

**Recommendation: Option B (dmz-security, 192.168.22.20)**

Rationale:
- GuardQuote and MarketPulse pods on pi2 K3s are the primary DB consumers
- Same zone = same switch = sub-millisecond latency, no firewall hop for app→DB traffic
- pi1 (Prometheus/Grafana) already has a pattern for cross-zone scraping
- One new PA-220 rule: `allow-monitoring-db` (dmz-services → dmz-security : TCP 9100 for node_exporter)
- We already proved cross-zone access works (allow-marketpulse-tunnel, allow-guardquote-db)

**Alternative recommendation: Option D (192.168.2.70 replacement)**

If simplicity wins over security posture:
- The `allow-guardquote-db` PA-220 rule we JUST committed points to 192.168.2.70
- Assigning the Orange Pi that same IP means zero firewall changes
- pi1 can already reach 192.168.2.x (untrust zone) for Prometheus
- Trade-off: DB sits on the untrust LAN, reachable from any device on the main network

#### Pi3 (2GB): **Off-Site Node** (plan already exists)

No changes to `PI3-PLAN.md`. Roles:
1. Remote health probe (blackbox exporter)
2. Remote log collector (Vector → Loki via WireGuard)
3. Off-site backup target (encrypted rsync)
4. Secondary DNS (AdGuard Home)
5. Wazuh agent

**SDPS context**: Pi3 could also run a **lightweight GuardQuote demo endpoint** if we build the demo mode correctly. A static demo (pre-rendered quotes, no live DB) could serve from a simple HTTP server on pi3, showing SDPS judges the product works even from a remote location. But this is a stretch goal — the primary demo should run on pi2 K3s.

---

## Orange Pi RV2 — Software Stack

### What it runs

| Service | Purpose | RAM Est. | Package |
|---------|---------|----------|---------|
| PostgreSQL 16 | GuardQuote + MarketPulse databases | ~500MB (with shared_buffers=256MB) | `apt install postgresql-16` |
| node_exporter | Prometheus metrics | ~15MB | Binary or apt |
| Vector | Log shipping to Loki on pi1 | ~50MB | apt or binary |
| pg_basebackup cron | Backup to NVMe | ~0 (runs periodically) | Built into PostgreSQL |
| UFW | Host firewall | ~0 | `apt install ufw` |
| **Total** | | **~565MB** of 8GB | |

That leaves **~7.4GB** for PostgreSQL OS cache, which means the entire database will likely fit in memory. Queries will be fast.

### What it does NOT run

- No Docker (unnecessary overhead for a single-purpose DB server)
- No K3s (RISC-V not supported)
- No Bun (RISC-V not supported)
- No Suricata/Wazuh (that's pi2's job)
- No Grafana/Prometheus (that's pi1's job)

Single purpose: **be the database**.

### PostgreSQL Configuration

Tuned for 8GB RAM, NVMe storage, RISC-V:

```ini
# postgresql.conf (key settings)
shared_buffers = 2GB            # 25% of RAM
effective_cache_size = 6GB      # 75% of RAM
work_mem = 64MB                 # Per-query sort/hash memory
maintenance_work_mem = 512MB    # For VACUUM, CREATE INDEX
wal_buffers = 64MB
max_connections = 50            # We have ~5 apps connecting
checkpoint_completion_target = 0.9
random_page_cost = 1.1          # NVMe is nearly sequential
effective_io_concurrency = 200  # NVMe can handle parallel I/O

# pg_hba.conf — who can connect
# Local
local   all    all    trust
# Studio matrix network
host    all    all    192.168.20.0/24    md5    # pi1 (monitoring)
host    all    all    192.168.22.0/24    md5    # pi2 (K3s apps)
host    all    all    192.168.21.0/24    md5    # pi0 (if needed)
host    all    all    192.168.2.0/24     md5    # Main LAN (ThinkStation dev)
# Remote (via WireGuard)
host    all    all    10.7.7.0/24        md5    # WireGuard tunnel
```

### Data Migration

1. Locate existing backups of GuardQuote + MarketPulse databases
2. Set up Orange Pi RV2 with Ubuntu 24.04 server + NVMe
3. Install PostgreSQL 16
4. Restore from backups: `pg_restore -d guardquote /path/to/backup`
5. Verify data integrity: row counts, schema matches
6. Update K8s secrets on pi2 to point to new DB IP
7. Update PA-220 rules if needed (depends on network placement)
8. Test applications end-to-end

---

## Pi3 (2GB) — Updated Context for SDPS

### Demo Mode Support

For the Senior Design Project Showcase (deadline: March 3, 2026), pi3 could serve as a **proof of distributed architecture**:

"Our security quoting platform runs across three physical nodes — the main application on a Raspberry Pi 5, the database on a RISC-V Orange Pi, and a remote monitoring probe at an off-site location connected via WireGuard VPN."

That's a compelling story for industry judges. To support it:

- Pi3 runs a **lightweight status dashboard** (static HTML served by nginx or python3 http.server)
- Shows: WireGuard tunnel status, last heartbeat from studio, off-site network health
- Total RAM: ~20MB for a static site server + node_exporter + Vector ≈ 85MB

### Memory Budget (Revised for SDPS)

| Service | RAM | Priority |
|---------|-----|----------|
| OS + systemd | 200MB | Required |
| WireGuard | 5MB | Required |
| Tailscale | 50MB | Required |
| node_exporter | 15MB | Required |
| Vector (minimal) | 50MB | Required |
| blackbox exporter | 20MB | Required |
| nginx (static demo) | 5MB | SDPS |
| **Total** | **345MB** | |
| Available for OS cache | ~1.6GB | |

Comfortable fit. No changes to the existing PI3-PLAN needed.

---

## Network Changes Required

### PA-220 Rules

Depending on Orange Pi placement:

**If Option B (dmz-security, 192.168.22.20)**:
- Modify existing `allow-guardquote-db` rule: change destination from `192.168.2.70` to `192.168.22.20`
- Actually — K3s pods on pi2 and the Orange Pi would be on the SAME zone (dmz-security). **No PA-220 rule needed for app→DB traffic** — it stays within the zone.
- New rule needed: `allow-monitoring-db` — pi1 (dmz-services) → Orange Pi (dmz-security) : TCP 9100 (node_exporter), TCP 5432 (postgres-exporter)

**If Option D (main LAN, 192.168.2.70)**:
- Existing `allow-guardquote-db` rule already works (targets 192.168.2.70:5432)
- No new rules needed
- pi1 can reach 192.168.2.70 natively (same route as current)

### Switch/Cabling

**Option B**: Orange Pi connects to the same switch as pi2 on the dmz-security VLAN/port
- Need to verify: is there a spare port on the switch connected to PA-220 eth1/2?
- Or: use one of the Orange Pi's dual GigE ports

**Option D**: Orange Pi connects to any port on the UDM/main switch
- Simplest physical setup

---

## Timeline

| Step | Task | Depends On |
|------|------|-----------|
| 1 | Flash Ubuntu 24.04 server on Orange Pi RV2 | Hardware in hand |
| 2 | Install SN580 NVMe in M.2 slot, partition/format | Step 1 |
| 3 | Install PostgreSQL 16, configure, harden | Step 2 |
| 4 | Network placement decision (Option B vs D) | User decision |
| 5 | Physical cabling + IP assignment | Step 4 |
| 6 | Locate DB backups, restore to new server | Step 3 |
| 7 | Update K8s secrets + test apps | Step 6 |
| 8 | PA-220 rules if needed | Step 4 |
| 9 | Add to Prometheus monitoring | Step 5 |
| 10 | Decommission old DB host (192.168.2.70) | Step 7 verified |

---

## Open Questions

1. **Where are the PostgreSQL backups?** Do they exist? What format (pg_dump, pg_basebackup, file copy)?
2. **Physical switch ports**: What's available on the dmz-security switch for Option B?
3. **RISC-V PostgreSQL performance**: Has anyone benchmarked PostgreSQL on the Ky X1? Phoronix reviewed general compute but not specifically DB workloads. Should be fine for our scale but worth a quick test after setup.
4. **Network placement preference**: Option B (dmz-security, co-located with apps) or Option D (main LAN, simplest setup)?

---

*Reference: `docs/PI3-PLAN.md` for pi3 off-site deployment plan*
*Reference: `docs/plans/guardquote-v2-architecture.md` for GuardQuote v2 deployment architecture*
