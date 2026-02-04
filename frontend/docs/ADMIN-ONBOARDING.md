# GuardQuote Admin Onboarding Guide

Welcome to the GuardQuote admin team! This guide will get you up and running.

---

## 🔐 Getting Access

### 1. Cloudflare Access Authorization
GuardQuote admin pages are protected by Cloudflare Zero Trust. To get access:

1. Contact John (john@vandine.us) with your email address
2. You'll be added to the CF Access policy for `guardquote.vandine.us`
3. When you visit the admin area, you'll receive a one-time code via email

### 2. Admin Account Creation
Once authorized in CF Access, John will create your admin account:
- **URL**: https://guardquote.vandine.us/admin
- Credentials will be provided securely

---

## 🖥️ Admin Dashboard Overview

### Accessing the Dashboard
1. Navigate to https://guardquote.vandine.us/login
2. Enter your credentials
3. You'll be redirected to `/admin`

### Dashboard Sections

| Section | Path | Description |
|---------|------|-------------|
| **Dashboard** | `/admin` | Overview metrics and quick stats |
| **Quote Requests** | `/admin/quotes` | View and manage incoming quote requests |
| **Users** | `/admin/users` | Manage admin user accounts |
| **Services** | `/admin/services` | Configure available service types |
| **Logs** | `/admin/logs` | View system and request logs |

---

## 📋 Common Tasks

### Viewing Quote Requests
1. Navigate to **Quote Requests** in the sidebar
2. Requests are sorted by date (newest first)
3. Click any request to view details
4. Status options: Pending → In Review → Quoted → Closed

### Managing Services
Services are the quote categories clients can choose:
- **Event Security** - Concerts, corporate events, private parties
- **Executive Protection** - Personal security for VIPs
- **Risk Assessment** - Security audits and vulnerability reports
- **Consulting** - General security consulting

To add/edit services:
1. Go to **Services** in sidebar
2. Click **Add Service** or edit existing
3. Set name, description, and base pricing

### User Management
Only the owner (John) can create new admin accounts. To request a new admin:
1. Email john@vandine.us with the person's details
2. Include their role/responsibility
3. Account will be created within 24 hours

---

## 🔧 Technical Reference

### Architecture
```
Client Browser
      │
      ▼
┌─────────────────────────────────────────┐
│         Cloudflare Zero Trust           │
│  (CF Access email authentication)       │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│      guardquote-gateway (Worker)        │
│  - Rate limiting (100 req/min)          │
│  - API key validation                   │
│  - Request logging                      │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│          Cloudflare Tunnel              │
│       (vandine-tunnel → pi1)            │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│       GuardQuote Backend (pi1)          │
│   - Node.js + Hono on port 3002         │
│   - PostgreSQL database                 │
│   - bcrypt authentication               │
└─────────────────────────────────────────┘
```

### Key URLs
| Environment | URL |
|-------------|-----|
| Production | https://guardquote.vandine.us |
| Admin Login | https://guardquote.vandine.us/login |
| Admin Dashboard | https://guardquote.vandine.us/admin |
| API Health | https://guardquote.vandine.us/api/health |

### API Endpoints (for reference)
```
POST /api/auth/login     - Admin login
GET  /api/admin/stats    - Dashboard metrics
GET  /api/admin/quotes   - List quote requests
POST /api/quotes         - Submit new quote (public)
GET  /api/admin/users    - List admin users
GET  /api/admin/logs     - Request logs
```

---

## 🚨 Troubleshooting

### "Access Denied" at login
- Verify you're using the correct email (the one in CF Access)
- Check if your CF Access code has expired (valid 5 minutes)
- Contact John to confirm you're in the access policy

### Dashboard won't load
- Clear browser cache and try again
- Check if https://guardquote.vandine.us/api/health returns OK
- The backend may be restarting - wait 30 seconds

### Quote requests not appearing
- Refresh the page
- Check the **Logs** section for errors
- Database may need attention - escalate to John

---

## 📞 Support Contacts

| Issue | Contact |
|-------|---------|
| Access problems | john@vandine.us |
| Technical issues | john@vandine.us |
| Feature requests | john@vandine.us |

---

## 📚 Additional Resources

- [Cloudflare Zero Trust Docs](https://developers.cloudflare.com/cloudflare-one/)
- Project repo: `~/guardquote-redesign/` on ThinkStation
- Backend code: `~/guard-quote/backend/` on pi1
- Obsidian docs: `matrix/🚀 GuardQuote Deployment.md`

---

*Last updated: 2026-02-03*
