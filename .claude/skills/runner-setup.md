# Self-Hosted Runner Setup (Pi0)

Use this skill to configure Pi0 as the GitHub Actions self-hosted runner.

## Pi0 Details

| Property | Value |
|----------|-------|
| Hostname | pi0 |
| IP | 192.168.2.101 |
| User | rafaeljg |
| Password | adm1npassw0rD |
| Role | GitHub Actions Runner |

## Pi Infrastructure

```
┌──────────────────────────────────────────────────────────────┐
│  Home Network (192.168.2.0/24)                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Pi0 (192.168.2.101)          Pi1 (192.168.2.70)            │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │ GitHub Actions  │ ──────►  │ PostgreSQL:5432 │           │
│  │ Runner          │          │ Redis:6379      │           │
│  │                 │          │ Prometheus:9090 │           │
│  │ Bun runtime     │          │ Grafana:3000    │           │
│  │ Python 3.12     │          │ Loki:3100       │           │
│  │ Node.js         │          │ Alertmanager    │           │
│  └─────────────────┘          └─────────────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## SSH Setup

### From Dev Machine
```bash
# Add to ~/.ssh/config
Host pi0
    HostName 192.168.2.101
    User rafaeljg

Host pi1
    HostName 192.168.2.70
    User pi
```

### Copy SSH Key to Pi0
```bash
ssh-copy-id rafaeljg@192.168.2.101
# Enter password: adm1npassw0rD
```

### Test Connection
```bash
ssh pi0 "uname -a"
```

## Install GitHub Actions Runner on Pi0

### 1. SSH into Pi0
```bash
ssh rafaeljg@192.168.2.101
# Password: adm1npassw0rD
```

### 2. Create Runner Directory
```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
```

### 3. Download Runner (ARM64 for Raspberry Pi)
```bash
# Check latest version at https://github.com/actions/runner/releases
curl -o actions-runner-linux-arm64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-arm64-2.321.0.tar.gz

tar xzf actions-runner-linux-arm64-2.321.0.tar.gz
```

### 4. Configure Runner
```bash
# Get token from GitHub: Settings → Actions → Runners → New self-hosted runner
./config.sh --url https://github.com/YOUR_ORG/guard-quote --token YOUR_TOKEN

# Configure options:
# - Runner name: pi0-runner
# - Labels: self-hosted,linux,arm64,pi
# - Work folder: _work
```

### 5. Install as Service
```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

### 6. Verify Runner
Check in GitHub: Settings → Actions → Runners
Should show `pi0-runner` as "Idle"

## Install Dependencies on Pi0

### Bun
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Python 3.12
```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip
python3.12 --version
```

### PostgreSQL Client (for psql)
```bash
sudo apt install -y postgresql-client
```

### Node.js (backup)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Git
```bash
sudo apt install -y git
git --version
```

## Test Pi0 → Pi1 Connectivity

```bash
# From Pi0, test all Pi1 services
nc -zv 192.168.2.70 5432   # PostgreSQL
nc -zv 192.168.2.70 6379   # Redis
nc -zv 192.168.2.70 9090   # Prometheus
nc -zv 192.168.2.70 3000   # Grafana

# Test PostgreSQL connection
psql postgresql://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70:5432/guardquote -c "SELECT 1"
```

## Runner Labels

Configure these labels for workflow targeting:
- `self-hosted` - Required for self-hosted runners
- `linux` - OS type
- `arm64` - Architecture
- `pi` - Custom label for Pi runners
- `pi0` - Specific runner

## Workflow Usage

```yaml
jobs:
  build:
    runs-on: [self-hosted, pi]  # Runs on Pi0
    steps:
      - uses: actions/checkout@v4
      # ... rest of job
```

## Maintenance

### Check Runner Status
```bash
ssh pi0 "sudo systemctl status actions.runner.*"
```

### View Runner Logs
```bash
ssh pi0 "journalctl -u actions.runner.* -f"
```

### Restart Runner
```bash
ssh pi0 "sudo systemctl restart actions.runner.*"
```

### Update Runner
```bash
ssh pi0 "cd ~/actions-runner && ./svc.sh stop"
# Download new version
ssh pi0 "cd ~/actions-runner && ./svc.sh start"
```

## Troubleshooting

### Runner Offline
```bash
# Check service
ssh pi0 "sudo systemctl status actions.runner.*"

# Check logs
ssh pi0 "journalctl -u actions.runner.* --since '10 minutes ago'"

# Restart
ssh pi0 "sudo systemctl restart actions.runner.*"
```

### Cannot Reach Pi1
```bash
# From Pi0, check network
ssh pi0 "ping -c 3 192.168.2.70"

# Check firewall on Pi1
ssh pi1 "sudo ufw status"
```

### Job Fails with Permission Error
```bash
# Ensure runner user has correct permissions
ssh pi0 "sudo usermod -aG docker rafaeljg"  # If using Docker
ssh pi0 "chmod +x ~/actions-runner/run.sh"
```

---

*Last updated: January 15, 2026*
