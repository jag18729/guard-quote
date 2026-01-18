# Tailscale VPN Access Skill

Team VPN access to GuardQuote infrastructure via Tailscale.

## Tailnet Info

| Property | Value |
|----------|-------|
| Tailnet Name | `jag18729.github` |
| Tailnet ID | `T1mz7GfThV11CNTRL` |
| Admin Console | https://login.tailscale.com/admin |

## Team Access

### Invite Teammates

1. Go to https://login.tailscale.com/admin/users
2. Click **"Invite users"**
3. Enter teammate emails
4. They'll receive invite to join `jag18729.github` tailnet

### Teammate Setup (2 min)

```bash
# macOS
brew install tailscale
# Or download from https://tailscale.com/download/mac

# Linux
curl -fsSL https://tailscale.com/install.sh | sh

# Windows
# Download from https://tailscale.com/download/windows

# Then authenticate
sudo tailscale up
# Opens browser → Login with GitHub → Join jag18729.github
```

## Infrastructure Nodes

Once on the tailnet, these become accessible:

| Node | Tailscale IP | Services |
|------|--------------|----------|
| Pi1 | `100.x.x.x` | PostgreSQL:5432, Redis:6379, Grafana:3000 |
| Pi0 | `100.x.x.x` | GitHub Runner, Backup storage |
| Your Mac | `100.x.x.x` | Development machine |

*Note: Tailscale IPs are assigned dynamically. Check Machines tab for actual IPs.*

## Pi Cluster Setup

### Pi1 (Database Server)
```bash
# SSH to Pi1
ssh johnmarston@192.168.2.70

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate (opens browser or provides link)
sudo tailscale up

# Check status
tailscale status

# Get Tailscale IP
tailscale ip -4
```

### Pi0 (GitHub Runner)
```bash
# SSH to Pi0
ssh rafaeljg@192.168.2.101

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate
sudo tailscale up

# Check status
tailscale status
```

## Using Tailscale IPs

### Update .env for Team
```bash
# Instead of local network IPs (192.168.2.x)
# Use Tailscale IPs (100.x.x.x)

# .env
DB_HOST=100.x.x.x      # Pi1 Tailscale IP
REDIS_HOST=100.x.x.x   # Pi1 Tailscale IP
```

### Direct Database Access
```bash
# Works from anywhere on the tailnet
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@100.x.x.x:5432/guardquote
```

### SSH via Tailscale
```bash
# No need for local network - works from anywhere
ssh johnmarston@100.x.x.x   # Pi1
ssh rafaeljg@100.x.x.x      # Pi0
```

## Access Control (ACLs)

Configure in Tailscale Admin → Access Controls:

```json
{
  "acls": [
    // Admins can access everything
    {"action": "accept", "src": ["group:admin"], "dst": ["*:*"]},

    // Developers can access Pi1 services
    {"action": "accept", "src": ["group:dev"], "dst": ["tag:pi1:5432,6379,3000"]},

    // Everyone can ping
    {"action": "accept", "src": ["*"], "dst": ["*:icmp"]}
  ],
  "groups": {
    "group:admin": ["jag18729@github"],
    "group:dev": ["teammate1@email.com", "teammate2@email.com"]
  },
  "tagOwners": {
    "tag:pi1": ["group:admin"],
    "tag:pi0": ["group:admin"]
  }
}
```

## Troubleshooting

### Can't connect to Pi1
```bash
# Check Tailscale is running
tailscale status

# Check Pi1 is online
tailscale ping pi1   # or use IP

# Check firewall on Pi1
ssh pi1 "sudo ufw status"
# Tailscale traffic bypasses UFW by default
```

### Slow connection
```bash
# Check if using relay or direct
tailscale status
# Should show "direct" for best performance

# Force relay reconnect
sudo tailscale down && sudo tailscale up
```

### teammate can't join
1. Check they received invite email
2. They must use same auth method (GitHub)
3. Check https://login.tailscale.com/admin/users for pending invites

## Quick Reference

```bash
# Status
tailscale status

# Get your IP
tailscale ip -4

# Ping another node
tailscale ping pi1

# List all nodes
tailscale status --json | jq '.Peer | keys'

# SSH to Pi1
tailscale ssh pi1   # If SSH is enabled in Tailscale

# Check connection type (direct vs relay)
tailscale netcheck
```
