# SOC Dashboard — Cloudflare Zero Trust Deployment

**Author:** Isaiah Bernal (@ibernal1815) — Security Operations
**URL:** https://soc.vandine.us
**Status:** Pending deployment

---

## Overview

The SOC dashboard is a standalone React app served by nginx inside a K3s pod on pi2. Access is controlled entirely by Cloudflare Zero Trust — no login UI, no app-level auth. Cloudflare handles identity at the edge before a single byte reaches the container.

```
Browser → Cloudflare Zero Trust Access (soc.vandine.us)
               │
               │  Identity verified (email OTP or GitHub SSO)
               ▼
         Cloudflare Tunnel (vandine-tunnel)
               │
               ▼
         pi2 K3s :30523
               │
               ▼
         soc-dashboard pod (nginx → React SPA)
```

---

## Why Cloudflare Zero Trust (not app-level auth)

The SOC dashboard is a static frontend — all data is currently hardcoded for the capstone showcase. There is no backend to validate sessions against. Adding a login form would be security theater on a static site.

Cloudflare Zero Trust enforces authentication at the network edge before the request ever reaches the pod:

- **No exposed ports** — the container is only reachable via the Cloudflare Tunnel
- **Identity at the edge** — GitHub SSO or one-time email PIN before the page loads
- **Audit log** — Cloudflare logs every access attempt with identity and timestamp
- **Revoke in seconds** — remove a user from the Access policy and they're locked out instantly

This mirrors how `nettools.vandine.us` (bastion) and `grafana.vandine.us` are already protected.

---

## Deployment Steps

### 1. Deploy to K3s

The manifest is at `k8s/soc-dashboard.yaml`. On first deploy, apply it manually:

```bash
# SSH to pi2 or run from any node with cluster access
kubectl apply -f k8s/soc-dashboard.yaml

# Build and load the image (or use the CI pipeline)
docker build -t soc-dashboard:latest ./soc
kubectl set image deployment/soc-dashboard soc-dashboard=soc-dashboard:latest -n guardquote

# Verify
kubectl get pods -n guardquote -l app=soc-dashboard
curl http://localhost:30523/health
```

After this, the CI pipeline (`deploy.yml`) handles all future deploys automatically on push to `main` when `soc/` or `k8s/` changes.

---

### 2. Cloudflare Tunnel — Add Route

In the Cloudflare dashboard (or via `cloudflared` config on pi1):

```yaml
# Add to the vandine-tunnel ingress rules
- hostname: soc.vandine.us
  service: http://100.111.113.35:30523   # pi2 Tailscale IP + NodePort
```

Or via the dashboard: **Zero Trust → Networks → Tunnels → vandine-tunnel → Edit → Public Hostnames → Add**

| Field | Value |
|-------|-------|
| Subdomain | `soc` |
| Domain | `vandine.us` |
| Service type | `HTTP` |
| URL | `100.111.113.35:30523` |

---

### 3. Cloudflare Zero Trust Access — Create Application

**Zero Trust → Access → Applications → Add an application → Self-hosted**

| Setting | Value |
|---------|-------|
| Application name | `SOC Dashboard` |
| Session duration | `4 hours` |
| Application domain | `soc.vandine.us` |

---

### 4. Access Policy

**Add policy → Allow**

| Setting | Value |
|---------|-------|
| Policy name | `Team Only` |
| Action | `Allow` |
| Include rule | Emails matching team list |

**Allowed emails:**
```
rafael.garcia.contact.me@gmail.com
isaiahbernal750@outlook.com
```
Add Milkias and Xavier's emails when confirmed.

**Authentication method:** GitHub SSO or One-time PIN (email)

To configure GitHub SSO as an identity provider: **Zero Trust → Settings → Authentication → Add → GitHub**

---

### 5. DNS

Cloudflare manages DNS for `vandine.us`. The tunnel route in step 2 automatically creates the CNAME record:

```
soc.vandine.us  CNAME  <tunnel-id>.cfargotunnel.com
```

No manual DNS changes needed.

---

## Local Development

```bash
cd soc
npm install
npm run dev
# Opens at http://localhost:5173
```

No environment variables needed — the dashboard is fully self-contained with no backend calls.

---

## Future: Live Data Integration

The dashboard currently uses hardcoded static data. Future integration path:

| Data Source | How |
|-------------|-----|
| Wazuh alerts | `/api/siem/events` endpoint (backend) → fetch in SOCDashboard |
| Suricata EVE | Loki LogQL HTTP API → fetch in SOCDashboard |
| Grafana metrics | Grafana HTTP API with service account token |
| Agent status | Wazuh API (55000/tcp) via backend proxy |

When live data is connected, the backend proxy endpoints should run through Cloudflare Zero Trust Service Auth (service tokens) — not hardcoded credentials.

---

## File Structure

```
soc/
├── src/
│   ├── main.tsx          # React mount point
│   └── SOCDashboard.tsx  # Full dashboard component
├── index.html            # HTML entry, noindex meta
├── package.json          # react, vite only
├── vite.config.ts        # Standard Vite config
├── tsconfig.json         # allowJs, strict: false (JSX compat)
├── Dockerfile            # node:22 build → nginx:alpine serve
└── nginx.conf            # SPA routing, security headers, gzip

k8s/
└── soc-dashboard.yaml    # Deployment (1 replica) + NodePort :30523
```

---

*Last updated: 2026-03-01*
