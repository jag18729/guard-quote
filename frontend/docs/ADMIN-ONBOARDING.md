# GuardQuote Admin Onboarding Guide

Welcome to the GuardQuote admin team! This guide will get you up and running.

---

## Getting Access

### 1. Cloudflare Access Authorization
GuardQuote admin pages are protected by Cloudflare Zero Trust. To get access:

1. Contact Rafa (rafael.garcia.contact.me@gmail.com) with your email address
2. You'll be added to the CF Access policy for `guardquote.vandine.us`
3. When you visit the admin area, you'll receive a one-time code via email

### 2. Admin Account Creation
Once authorized in CF Access, Rafa will create your admin account:
- **URL**: https://guardquote.vandine.us/admin
- Credentials will be provided securely

---

## Dashboard Overview

### Main Sections

| Section | Purpose |
|---------|---------|
| **Dashboard** | Overview stats, quick actions |
| **Users** | Team member management (RBAC) |
| **Blog** | Create/edit blog posts |
| **Features** | Feature requests with voting |
| **Network** | Topology diagram, data pipeline |
| **Services** | Infrastructure health status |

### User Roles

| Role | Permissions |
|------|-------------|
| admin | Full access to all features |
| editor | Blog, features, read-only stats |
| viewer | Read-only access |

---

## Common Tasks

### Creating a Blog Post
1. Navigate to **Blog** section
2. Click "New Post"
3. Enter title and content (Markdown supported)
4. Click "Publish"

### Submitting a Feature Request
1. Navigate to **Features** section
2. Click "New Feature"
3. Fill in title, description, priority
4. Submit - it syncs to GitHub automatically

### Voting on Features
1. Browse feature requests
2. Click thumbs up/down to vote
3. Votes influence priority

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't log in | Check email for CF Access code |
| Page not loading | Try hard refresh (Ctrl+Shift+R) |
| API errors | Check if services are up at `/api/status` |
| Access denied | Contact Rafa to verify CF Access policy |

---

## Support

| Issue Type | Contact |
|------------|---------|
| Access problems | rafael.garcia.contact.me@gmail.com |
| Feature requests | Submit via Features page |
| Bugs | GitHub Issues |

---

## Quick Links

- **Site**: https://guardquote.vandine.us
- **Admin**: https://guardquote.vandine.us/admin
- **Grafana**: https://grafana.vandine.us
- **GitHub**: https://github.com/jag18729/guard-quote
- **Project Board**: https://github.com/users/jag18729/projects/1
