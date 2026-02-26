# Quick Start for Isaiah - SIEM Integration

Hey Isaiah! This doc gets you up and running fast.

## 🚀 Clone & Setup

```bash
# Clone the repo
git clone https://github.com/jag18729/guard-quote.git
cd guard-quote

# Switch to the SIEM feature branch
git checkout feature/wazuh-siem-integration

# Check what's there
ls -la docs/
```

## 📋 Your Checklist

### 1. Set Up Wazuh Manager

Install Wazuh on your system (wherever you're hosting it).

### 2. Join Tailscale

We use Tailscale for secure connectivity. Ask Rafa for an invite to the network.

Once joined, your Wazuh manager gets a hostname like:
```
your-machine.tail12345.ts.net
```

### 3. Generate Agent Keys

On your Wazuh manager:

```bash
/var/ossec/bin/manage_agents
# (A) Add agent
# Name: pi0
# IP: any
# (E) Extract key -> copy this
```

Repeat for `pi1`.

### 4. Share With Us

Send Rafa:
- Your Wazuh manager Tailscale hostname
- Agent key for pi0
- Agent key for pi1

## 📊 What You'll Receive

Once connected, your SIEM will get:

| Data | Source | Format |
|------|--------|--------|
| System logs | pi0, pi1 | syslog |
| Auth events | pi0, pi1 | auth.log |
| Container logs | pi1 | Docker JSON |
| App logs | pi1 | GuardQuote API |
| Kernel messages | pi0, pi1 | kern.log |

### Security Features Enabled

- **File Integrity Monitoring** - /etc, /usr/bin, app directories
- **Rootkit Detection** - Known signatures
- **Vulnerability Scan** - Ubuntu CVE database
- **System Inventory** - packages, ports, processes

## 🗺️ Architecture

```
Your Wazuh Manager
       ▲
       │ (Tailscale encrypted tunnel)
       │
┌──────┴────────────────────────────────┐
│         GuardQuote Infrastructure      │
│                                        │
│   pi0 ([tailscale-ip])                 │
│   └─ Wazuh Agent → logs, FIM, etc.    │
│                                        │
│   pi1 ([tailscale-ip])                 │
│   └─ Wazuh Agent → logs, FIM, etc.    │
│                                        │
│   PA-220, UDM (network devices)       │
│   └─ Syslog/SNMP → Vector → Wazuh    │
└────────────────────────────────────────┘
```

## 🔗 Useful Links

- **Data Pipeline Visualization**: https://guardquote.vandine.us/admin/network
- **Full SIEM Docs**: `docs/SIEM-SETUP-ISAIAH.md`
- **Contributing Guide**: `CONTRIBUTING.md`

## 💬 Questions?

Hit up Rafa in Slack/Discord or create a GitHub issue.

---

Good luck! 🛡️
