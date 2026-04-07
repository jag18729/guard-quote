# Contributing to GuardQuote

Welcome to the GuardQuote project! This guide will help you get set up and start contributing.

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote
```

### 2. Create a Feature Branch

```bash
# Always branch from main
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/wazuh-siem-integration
git checkout -b feature/ml-model-improvements
git checkout -b fix/api-authentication-bug
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 4. Backend Setup

The backend runs on Hono. Local development uses Node + tsx for hot reload; production builds with Bun and ships to K3s on Pi2 via CI/CD on every push to main.

```bash
cd backend
npm install
npm run dev
# API at http://localhost:3002
```

Type-check before committing:

```bash
npm run typecheck
```

You do not need to deploy by hand. Pushing to `main` triggers the GitHub Actions self-hosted runner on Pi2, which builds the Bun container image and rolls the K3s deployment.

## 📁 Project Structure

```
guard-quote/
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   │   └── admin/      # Admin dashboard pages
│   │   ├── layouts/        # Layout wrappers
│   │   └── lib/            # Utilities
│   └── package.json
├── docs/                   # Documentation
├── scripts/                # Automation scripts
└── README.md
```

## 🔧 Development Workflow

### Making Changes

1. **Write code** in your feature branch
2. **Test locally** with `npm run dev`
3. **Build** to check for errors: `npm run build`
4. **Commit** with descriptive messages:
   ```bash
   git add .
   git commit -m "feat: add SIEM data flow visualization"
   ```

### Commit Message Format

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

### Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 🌐 Architecture Overview

### Data Pipeline (SIEM Integration)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sources   │ ──► │  Collectors │ ──► │   Storage   │
│  PA-220     │     │   Vector    │     │   Loki      │
│  UDM        │     │  Prometheus │     │  Prometheus │
│  pi0/pi1    │     │  SNMP Exp.  │     │   Wazuh     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ Visualization│
                                        │   Grafana   │
                                        │  GuardQuote │
                                        └─────────────┘
```

### Key Services

| Service | Host | Port | Purpose |
|---------|------|------|---------|
| GuardQuote API (dev) | localhost | 3002 | Backend API for local dev |
| GuardQuote API (prod) | Pi2 K3s | internal | Bun container, ingressed via cloudflared |
| Grafana | pi1 | 3000 | Metrics dashboards |
| Prometheus | pi1 | 9090 | Metrics storage |
| Loki | pi1 | 3100 | Log aggregation |
| Vector | pi0 | - | Log collection |
| LDAP | pi0 | 389 | Authentication |

## 🔐 Access & Credentials

Contact the team lead (Rafa) for:
- SSH access to pi0/pi1
- Tailscale network invite
- Database credentials
- API keys

### SSH Access

```bash
# From Tailscale network
ssh rafaeljg@[tailscale-ip]    # pi0
ssh johnmarston@[tailscale-ip]  # pi1
```

## 📋 Current Tasks

Check the [GitHub Project Board](https://github.com/users/jag18729/projects/1) for:
- Open issues
- Feature requests
- Assigned tasks

### Priority Areas

1. **SIEM Integration** - Wazuh agent deployment, log forwarding
2. **ML Engine** - Model training, prediction improvements
3. **Network Visualization** - Interactive data flow diagrams
4. **API Improvements** - New endpoints, optimization

## 🧪 Testing

```bash
# Frontend type checking
npm run typecheck

# Build test
npm run build
```

## 📖 Documentation

- **Network Topology**: `/admin/network` in the dashboard
- **Data Pipeline**: `/admin/network` → Data Pipeline tab
- **API Docs**: See `docs/` folder
- **SIEM Setup**: See `docs/WAZUH-INTEGRATION.md`

## ❓ Getting Help

- **Slack/Discord**: Team channel
- **GitHub Issues**: For bugs and features
- **Direct**: Contact Rafa or team leads

---

Happy coding! 🚀
