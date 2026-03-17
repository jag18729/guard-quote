# K3s Operations Runbook

> Last updated: 2026-03-17

## Cluster Access

```bash
ssh rafaeljg@100.111.113.35   # Pi2 via Tailscale
kubectl get nodes
# sentinel-node   Ready   control-plane   ...
```

## Namespaces

| Namespace | Workloads |
|-----------|-----------|
| `guardquote` | backend, frontend, ml-engine, soc-dashboard |
| `sentinel` | sentinelnet-api (scaled 0), grafana |
| `nettools` | nettools-api (scaled 0), nettools-db |

## NodePorts (Cloudflare Tunnel Entry Points)

| Service | NodePort | Routes |
|---------|----------|--------|
| guardquote-frontend | **30522** | guardquote.vandine.us, api.vandine.us |
| guardquote-ml | 30521 / 30480 (gRPC) | internal |
| soc-dashboard | 30523 | internal |
| sentinel/grafana | 30300 | internal |
| sentinel/sentinelnet-api | 30800 | internal |
| nettools/nettools-api | 30880 | internal |

**cloudflared config:** `~/.cloudflared/config.yml` on Pi2. If 502s appear, verify NodePort matches `kubectl get svc -n guardquote`.

## Common Operations

### Check pod health

```bash
kubectl get pods -n guardquote
kubectl get pods -n sentinel
kubectl get pods -n nettools
```

### View logs

```bash
kubectl logs -n guardquote deployment/guardquote-backend --since=15m
kubectl logs -n guardquote deployment/guardquote-backend -f  # follow
```

### Restart a deployment

```bash
kubectl rollout restart deployment/guardquote-backend -n guardquote
kubectl rollout status deployment/guardquote-backend -n guardquote
```

### Update a secret

```bash
# Example: update DATABASE_URL
NEW_URL="$(kubectl get secret guardquote-secrets -n guardquote -o jsonpath='{.data.database-url}' | base64 -d)"
# Or set manually — see DATABASE_URL in .env
kubectl patch secret guardquote-secrets -n guardquote \
  --type='json' \
  -p="[{\"op\":\"replace\",\"path\":\"/data/database-url\",\"value\":\"$(echo -n "$NEW_URL" | base64 -w0)\"}]"
kubectl rollout restart deployment/guardquote-backend -n guardquote
```

### Exec into a pod

```bash
kubectl exec -n guardquote deployment/guardquote-backend -- env | grep DATABASE
kubectl exec -n guardquote deployment/guardquote-backend -- sh
```

## Image Management

K3s uses `imagePullPolicy: Never` for local images — they must be built and imported manually.

```bash
# Build locally on Pi2
docker build -t <image>:<tag> .

# Import into K3s containerd
docker save <image>:<tag> | sudo k3s ctr images import -

# Verify
sudo k3s ctr images list | grep <image>

# Scale back up
kubectl scale deployment/<name> -n <namespace> --replicas=1
```

### Images Currently Missing (scaled to 0)

| Image | Namespace | Deployment |
|-------|-----------|------------|
| `sentinelnet:v0.4.0` | sentinel | sentinelnet-api |
| `nettools-api:v2` | nettools | nettools-api |

## Pod Sprawl — Cleanup

When K3s restarts repeatedly (e.g., due to disk pressure), it leaves hundreds of `ContainerStatusUnknown` pods. Clean up with:

```bash
# Delete all non-running pods in a namespace
kubectl delete pods -n <namespace> --field-selector=status.phase!=Running

# Scale to 0 if image is missing (stops the crash loop)
kubectl scale deployment/<name> -n <namespace> --replicas=0
```

## Networking Constraints

**K3s pods have direct internet egress** via Pi2's matrix network USB ethernet adapter (DHCP from UDM, metric 50). Pods masquerade through Pi2's host network and can reach external hosts directly.

**Routing in use:**
- OAuth → direct `fetch()` — no proxy needed (2026-03-17)
- PostgreSQL → Pi1 Tailscale IP (`100.77.26.41:5432`) — PA-220 still blocks direct Pi2→Pi1 cross-zone
- DNS → Pods use CoreDNS; external DNS resolves via UDM

See `docs/runbooks/NETWORKING.md` for full details.

## DATABASE_URL

Stored in the `guardquote-secrets` K8s secret. **Must use Pi1's Tailscale IP** — never the direct LAN IP. PA-220 blocks direct Pi2→Pi1.

```bash
kubectl get secret guardquote-secrets -n guardquote -o jsonpath='{.data.database-url}' | base64 -d
```

Also requires on Pi1:
```bash
# /etc/postgresql/17/main/pg_hba.conf must contain:
hostnossl    all    all    100.64.0.0/10    scram-sha-256
```

## CI/CD

GitHub Actions self-hosted runner on Pi2 auto-deploys on push to `main`.
Runner: `kubectl get pods -A | grep runner`

## Troubleshooting

### 502 Bad Gateway

```bash
# Verify cloudflared is pointing to correct NodePort
ssh rafaeljg@100.111.113.35 "cat ~/.cloudflared/config.yml"
kubectl get svc -n guardquote  # check current NodePort
# Fix if mismatch:
sed -i 's/30XXX/30522/' ~/.cloudflared/config.yml
sudo systemctl restart cloudflared
```

### Pod CrashLoopBackOff / ErrImageNeverPull

```bash
kubectl describe pod -n <ns> <pod>  # check Events section
# If ErrImageNeverPull: image not in local store — build + import (see above)
# If CrashLoopBackOff: check logs
kubectl logs -n <ns> <pod> --previous
```

### Backend 401 on Login

PostgreSQL unreachable. Check:
```bash
kubectl exec -n guardquote deployment/guardquote-backend -- env | grep DATABASE_URL
# Must be 100.77.26.41, not 192.168.20.10
# Also verify pg_hba.conf on Pi1:
ssh johnmarston@100.77.26.41 "sudo grep '100.64' /etc/postgresql/17/main/pg_hba.conf"
```

### OAuth "Failed to complete login"

```bash
# Pods have direct internet — check backend logs for the actual error
kubectl logs -n guardquote deployment/guardquote-backend --since=5m | grep -i oauth
# Verify OAUTH_PROXY_URL is unset (should be empty or absent):
kubectl exec -n guardquote deployment/guardquote-backend -- env | grep OAUTH
```
