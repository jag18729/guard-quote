# Team Access Matrix

> Who can access what, and how.

## Quick Reference

| Resource | Isaiah | Milkias | Xavier | Rafa |
|----------|--------|---------|--------|------|
| GuardQuote Dashboard | | | | |
| GuardQuote Admin | | | | |
| Grafana | | | | |
| Prometheus | | | | |
| Loki | | | | |
| GitHub Repo | | | | |
| GitHub Projects | | | | |
| SSH to Servers | | | | |
| Database Direct | | | | |
| Tailscale VPN | SIEM Only | | | |

**Legend:** Full Access | Restricted | No Access

---

## Team Members

### Rafael Garcia (Admin)
- **Email:** rafael.garcia.contact.me@gmail.com, admin@guardquote.vandine.us
- **Role:** Admin
- **Access Level:** Full

| Access Type | Method | Credentials |
|-------------|--------|-------------|
| GuardQuote Admin | Email login | admin@guardquote.vandine.us |
| Monitoring (Grafana, etc.) | CF Access | Email OTP |
| SSH to Pi0 | Tailscale + Key | `ssh rafaeljg@pi0` |
| SSH to Pi1 | Tailscale + Key | `ssh johnmarston@pi1` |
| Database | Tailscale + psql | `psql -h pi1 -U postgres` |
| Tailscale Admin | Web console | Owner |

### Isaiah Bernal (Developer + SIEM)
- **Email:** isaiah@guardquote.com
- **Role:** Developer
- **Access Level:** Standard + SIEM Integration

| Access Type | Method | Credentials |
|-------------|--------|-------------|
| GuardQuote Admin | Email login | isaiah@guardquote.com |
| Monitoring | CF Access | Email OTP |
| GitHub | GitHub account | Collaborator |
| Tailscale | Mesh VPN | Restricted to pi0:514 |
| Syslog (pi0) | Via Tailscale | UDP 514 only |

**Special Access:** Isaiah has Tailscale access restricted to pi0:514 for SIEM integration.

### Milkias Kassa (Developer)
- **Email:** milkias@guardquote.com
- **Role:** Developer
- **Access Level:** Standard

| Access Type | Method | Credentials |
|-------------|--------|-------------|
| GuardQuote Admin | Email login | milkias@guardquote.com |
| Monitoring | CF Access | Email OTP |
| GitHub | GitHub account | Collaborator |

### Xavier Nguyen (Developer)
- **Email:** xavier@guardquote.com
- **Role:** Developer
- **Access Level:** Standard

| Access Type | Method | Credentials |
|-------------|--------|-------------|
| GuardQuote Admin | Email login | xavier@guardquote.com |
| Monitoring | CF Access | Email OTP |
| GitHub | GitHub account | Collaborator |

---

## Access Methods

### 1. Cloudflare Access (Email OTP)
- Used for: Grafana, Prometheus, Loki, LDAP Admin
- How: Enter @guardquote.com email → receive OTP → enter code
- Token validity: 24 hours

### 2. GuardQuote Login
- Used for: Admin dashboard
- How: Email + password
- Default password: `Welcome123!` (change on first login)

### 3. Tailscale VPN
- Used for: Direct server access, SIEM integration
- How: Install Tailscale → request invite → connect
- Required for: SSH, database, syslog forwarding

### 4. GitHub
- Used for: Code repository, project board
- How: GitHub account + collaborator invite
- Repo: https://github.com/jag18729/guard-quote

---

## Requesting Access

### Standard Access (Dashboard + Monitoring)
1. Request from Rafa via Discord/email
2. Receive @guardquote.com account credentials
3. Log in and change password

### Elevated Access (SSH/Database)
1. Provide justification for access
2. Provide SSH public key
3. Rafa adds to Tailscale + authorized_keys
4. Access granted with audit logging

### SIEM Integration Access
1. Request Tailscale invite
2. Provide SIEM details (type, purpose)
3. Rafa configures ACL for restricted access
4. Only syslog port (514) accessible

---

## Revoking Access

### Off-boarding Checklist
- [ ] Remove from Tailscale network
- [ ] Disable GuardQuote account
- [ ] Remove from Cloudflare Access policies
- [ ] Remove from GitHub collaborators
- [ ] Remove SSH keys from authorized_keys
- [ ] Rotate any shared secrets

---

## Audit Trail

All access is logged:
- **Cloudflare Access:** CF dashboard → Access → Logs
- **SSH:** `/var/log/auth.log` on target host
- **GuardQuote:** `/api/admin/users/:id/activity` (user activity log)
- **Tailscale:** Admin console → Machines → Logs

---

*Last updated: 2026-04-07*
