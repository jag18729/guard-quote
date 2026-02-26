# GuardQuote v2.0 — Production Deployment

**Status:** ✅ LIVE  
**Date:** 2026-02-25  
**URL:** https://guardquote.vandine.us

---

## Architecture

```
Internet
    │
    ▼
Cloudflare Tunnel (vandine-tunnel)
    │
    ▼ guardquote.vandine.us
┌─────────────────────────────────────────────────────────────────┐
│ pi1 (192.168.20.10) — Tunnel Ingress                           │
│                                                                 │
│  cloudflared → Tailscale (100.111.113.35:30522)                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼ Tailscale mesh
┌─────────────────────────────────────────────────────────────────┐
│ pi2 (192.168.22.10 / 100.111.113.35) — K3s                     │
│                                                                 │
│  ┌─────────────────────┐   ┌─────────────────────┐             │
│  │ guardquote-frontend │   │ guardquote-backend  │             │
│  │ nginx + React SPA   │──►│ Bun + Hono API      │             │
│  │ :30522              │   │ :30520              │             │
│  │ /api/* → backend    │   │                     │             │
│  └─────────────────────┘   └──────────┬──────────┘             │
│                                       │                         │
│                            ┌──────────▼──────────┐             │
│                            │ guardquote-ml       │             │
│                            │ FastAPI + sklearn   │             │
│                            │ :30521              │             │
│                            │ gRPC :50051         │             │
│                            └──────────┬──────────┘             │
└────────────────────────────────────────┼────────────────────────┘
                                         │
                                         ▼
                              PostgreSQL (192.168.2.70:5432)
```

---

## Components

### Frontend (`guardquote-frontend:v3.3`)
- **Image:** nginx:alpine + React SPA
- **Port:** 30522 (NodePort)
- **Features:**
  - OAuth buttons (Google, GitHub, Microsoft)
  - `/api/*` reverse proxied to backend:3000
  - Static SPA served from nginx

### Backend (`guardquote-backend:v2-oauth`)
- **Image:** oven/bun:1-alpine + Hono
- **Port:** 30520 (NodePort)
- **Features:**
  - OAuth SSO (PKCE flow)
  - JWT authentication
  - ML-powered pricing via gRPC
  - DEMO_MODE for showcase
- **Routes:**
  - `/api/auth/login/:provider` — OAuth initiation
  - `/api/auth/callback/:provider` — OAuth callback
  - `/api/auth/providers` — List available providers
  - `/api/quotes/*` — Quote CRUD
  - `/api/pricing/predict` — ML prediction
  - `/health`, `/api/health` — Health checks

### ML Engine (`guardquote-ml:v2.1`)
- **Image:** python:3.12 + FastAPI + sklearn
- **Ports:** 30521 (REST), 50051 (gRPC internal)
- **Models:**
  - Price prediction: GradientBoost (R² = 0.93)
  - Risk classification: RandomForest (81%)
- **Endpoints:**
  - `/health`, `/api/v1/health` — Health checks
  - `/api/v1/model-info` — Model metadata
  - `/api/v1/predict` — REST prediction

---

## Secrets

```bash
# guardquote-secrets (2 keys)
- database-url: postgresql://guardquote:***@192.168.2.70:5432/guardquote
- jwt-secret: (32-byte hex)

# guardquote-oauth (4 keys)
- github-client-id
- github-client-secret
- google-client-id
- google-client-secret
```

---

## Network Flow

| Source | Destination | Port | Purpose |
|--------|-------------|------|---------|
| Cloudflare | pi1 cloudflared | 7844 | Tunnel |
| pi1 cloudflared | pi2 (Tailscale) | 30522 | Frontend |
| Frontend nginx | Backend | 3000 | API proxy |
| Backend | ML Engine | 50051 | gRPC predictions |
| Backend | PostgreSQL | 5432 | Database |

### Why Tailscale?
- PA-220 blocks QUIC (port 7844) from dmz-security zone
- kube-router has issues with physical network source IPs
- Tailscale provides reliable mesh connectivity

---

## Commands

### Check Status
```bash
ssh rafaeljg@192.168.22.10 "sudo kubectl get pods -n guardquote -o wide"
ssh rafaeljg@192.168.22.10 "sudo kubectl logs -n guardquote deployment/guardquote-backend --tail=50"
ssh rafaeljg@192.168.22.10 "sudo kubectl logs -n guardquote deployment/guardquote-frontend --tail=50"
```

### Restart Pods
```bash
ssh rafaeljg@192.168.22.10 "sudo kubectl rollout restart deployment/guardquote-backend -n guardquote"
ssh rafaeljg@192.168.22.10 "sudo kubectl rollout restart deployment/guardquote-frontend -n guardquote"
```

### Update Image
```bash
# On pi2
cd /tmp/guard-quote
git pull

# Backend
cd backend
sudo docker build -t guardquote-backend:v2-oauth .
sudo docker save guardquote-backend:v2-oauth | \
  sudo ctr --address /run/containerd/containerd.sock -n k8s.io images import -
sudo kubectl rollout restart deployment/guardquote-backend -n guardquote

# Frontend
cd ../frontend
sudo docker build -t guardquote-frontend:v3.3 .
sudo docker save guardquote-frontend:v3.3 | \
  sudo ctr --address /run/containerd/containerd.sock -n k8s.io images import -
sudo kubectl rollout restart deployment/guardquote-frontend -n guardquote

# ML Engine
cd ../ml-engine
sudo docker build -t guardquote-ml:v2.1 .
sudo docker save guardquote-ml:v2.1 | \
  sudo ctr --address /run/containerd/containerd.sock -n k8s.io images import -
sudo kubectl rollout restart deployment/guardquote-ml -n guardquote
```

### Check OAuth Config
```bash
ssh rafaeljg@192.168.22.10 "sudo kubectl get secret guardquote-oauth -n guardquote -o yaml"
curl -s https://guardquote.vandine.us/api/auth/providers | jq
```

---

## OAuth Provider Setup

### GitHub
- App: https://github.com/settings/developers
- Callback URL: `https://guardquote.vandine.us/api/auth/callback/github`

### Google
- Console: https://console.cloud.google.com/apis/credentials
- Callback URL: `https://guardquote.vandine.us/api/auth/callback/google`

### Microsoft (if enabled)
- Portal: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
- Callback URL: `https://guardquote.vandine.us/api/auth/callback/microsoft`

---

## Monitoring

### Prometheus Targets
- `guardquote-backend`: 192.168.22.10:30520
- `guardquote-ml`: 192.168.22.10:30521

### Health Checks
```bash
# Backend
curl -s https://guardquote.vandine.us/api/health | jq

# ML Engine (internal)
curl -s http://192.168.22.10:30521/health | jq
```

### Grafana Dashboard
- Dashboard: "GuardQuote Operations" (`guardquote-ops`)
- Panels: Backend health, ML health, response times, OAuth logins

---

## Rollback

### Quick Rollback to pi1
Edit `/home/johnmarston/.cloudflared/config.yml` on pi1:
```yaml
- hostname: guardquote.vandine.us
  service: http://localhost:3002  # Old v3 backend
```
Then: `sudo systemctl restart cloudflared`

### ML Engine Fallback
Backend automatically uses rule-based pricing if ML engine is down.

---

## Repository

- **GitHub:** https://github.com/jag18729/guard-quote
- **Branch:** `dev` (default, production)
- **Structure:**
  ```
  guard-quote/
  ├── backend/      # Bun + Hono API
  ├── frontend/     # React + Vite SPA
  ├── ml-engine/    # FastAPI + sklearn
  ├── docs/
  ├── scripts/
  └── docker-compose.yml
  ```

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-02-25 | v3.3 | OAuth URL fix, production deployment |
| 2026-02-24 | v2-oauth | OAuth SSO, ML integration |
| 2026-02-20 | v2.1 | DEMO_MODE, trained ML models |
