# K3s Operations Runbook

> Last updated: 2026-03-12

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
NEW_URL="postgresql://postgres:<pw>@100.77.26.41:5432/guardquote"
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

**K3s pods have NO direct internet egress.** Pi2's internet path goes via Tailscale (`tailscale0`), not `eth1`. Pods use flannel CNI (bridge) and masquerade via `eth1` — PA-220 blocks this for external traffic.

**Workarounds in use:**
- OAuth → ThinkStation OAuth proxy (`http://100.126.232.42:9876`)
- PostgreSQL → Pi1 Tailscale IP (`100.77.26.41:5432`)
- DNS → Pods use `1.1.1.1` via CoreDNS (also blocked, but OAuth proxy bypasses DNS)

See `docs/runbooks/NETWORKING.md` for full details.

## DATABASE_URL

```
postgresql://postgres:<pw>@100.77.26.41:5432/guardquote
```

**Must use Pi1 Tailscale IP** — never `192.168.20.10`. PA-220 blocks direct Pi2→Pi1.

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
# Check OAuth proxy on ThinkStation
sudo systemctl status oauth-proxy
# If stopped:
sudo systemctl start oauth-proxy
```
