# GuardGuote Cloudflare Configuration

> "The typo that became a brand" 🛡️

## Domain Info

| Property | Value |
|----------|-------|
| Domain | `guardguote.com` |
| Zone ID | `eb102164a37376b6d67cdc51da01194a` |
| Account ID | `f05c20eb5ba2358bcaaa727a2a1941df` |
| Nameservers | `curt.ns.cloudflare.com`, `shaz.ns.cloudflare.com` |

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │        guardguote.com               │
                    │        (Cloudflare)                 │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ Cloudflare      │    │ Cloudflare      │    │ Cloudflare      │
    │ Pages           │    │ Worker          │    │ Tunnel          │
    │ ─────────────── │    │ ─────────────── │    │ ─────────────── │
    │ guardguote.com  │    │ api.guardguote  │    │ pi1.guardguote  │
    │ (Frontend)      │    │ .com            │    │ .com            │
    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
             │                      │                      │
             │               ┌──────┴──────┐               │
             │               ▼             ▼               │
             │        ┌───────────┐ ┌───────────┐          │
             │        │ AWS ALB   │ │ Pi1       │◄─────────┘
             │        │ (Primary) │ │ (Backup)  │
             │        └───────────┘ └───────────┘
             │
             ▼
    ┌─────────────────┐
    │ S3 Bucket       │
    │ (Static Assets) │
    └─────────────────┘
```

## DNS Records (Target State)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `guardguote.pages.dev` | ✅ |
| CNAME | `www` | `guardguote.com` | ✅ |
| CNAME | `api` | `guardguote-api.workers.dev` | ✅ |
| CNAME | `pi1` | `<tunnel-id>.cfargotunnel.com` | ✅ |
| CNAME | `ml-pi1` | `<tunnel-id>.cfargotunnel.com` | ✅ |
| CNAME | `aws-alb` | `guardquote-alb-xxx.us-west-2.elb.amazonaws.com` | ✅ |

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler

# Authenticate
wrangler login
```

### 2. Deploy Worker

```bash
cd cloudflare/workers

# Create KV namespaces
wrangler kv:namespace create HEALTH_KV
wrangler kv:namespace create CONFIG_KV

# Update wrangler.toml with the KV IDs from above

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

### 3. Setup Cloudflare Tunnel on Pi1

```bash
# SSH to Pi1
ssh pi1

# Download and run setup script
curl -O https://raw.githubusercontent.com/jag18729/guard-quote/main/cloudflare/tunnel/setup-pi1.sh
chmod +x setup-pi1.sh
./setup-pi1.sh
```

Or manually:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create guardguote-pi1

# Copy config
cp /path/to/tunnel/config.yml ~/.cloudflared/config.yml
# Edit to add your tunnel ID

# Route DNS
cloudflared tunnel route dns guardguote-pi1 pi1.guardguote.com
cloudflared tunnel route dns guardguote-pi1 ml-pi1.guardguote.com

# Install service
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### 4. Deploy Frontend to Pages

```bash
cd frontend

# Build
bun run build

# Deploy via Wrangler
wrangler pages deploy dist --project-name=guardguote

# Or connect to GitHub for auto-deploy
# Go to: Cloudflare Dashboard > Pages > Create > Connect to Git
```

## Files

```
cloudflare/
├── README.md                 # This file
├── workers/
│   ├── wrangler.toml        # Worker configuration
│   ├── src/
│   │   └── index.ts         # API proxy with failover
│   └── package.json
└── tunnel/
    ├── config.yml           # Tunnel config template
    └── setup-pi1.sh         # Automated setup script
```

## Manual Failover

Force all traffic to Pi1 (bypass AWS):

```bash
# Enable
wrangler kv:key put --binding=CONFIG_KV "FORCE_ORIGIN" "pi1" --env production

# Disable (return to normal)
wrangler kv:key delete --binding=CONFIG_KV "FORCE_ORIGIN" --env production
```

## Monitoring

### Worker Analytics
```
Cloudflare Dashboard > Workers & Pages > guardguote-api > Analytics
```

### Tunnel Status
```bash
# On Pi1
sudo systemctl status cloudflared
cloudflared tunnel info guardguote-pi1
```

### Health Check
```bash
# Check worker health
curl https://api.guardguote.com/worker-health

# Check Pi1 via tunnel
curl https://pi1.guardguote.com/health
```

## Costs

| Service | Plan | Cost |
|---------|------|------|
| Cloudflare Pages | Free | $0 |
| Cloudflare Workers | Free (100k req/day) | $0 |
| Cloudflare Tunnel | Free | $0 |
| Domain | 1 year | ~$10 |
| **Total** | | **~$10/year** |

## Troubleshooting

### Worker not routing

1. Check DNS records in Cloudflare dashboard
2. Verify worker routes in `wrangler.toml`
3. Check worker logs: `wrangler tail --env production`

### Tunnel not connecting

```bash
# On Pi1
sudo journalctl -u cloudflared -f

# Test tunnel manually
cloudflared tunnel run guardguote-pi1
```

### 502 Bad Gateway

Usually means the local service isn't running:

```bash
# On Pi1
sudo systemctl status guardquote-backend
# or
cd backend && bun run --watch src/index.ts
```

---

*GuardGuote - "The typo that became a brand"* 🛡️
