# GuardQuote Admin Quick Reference

## URLs
- **App**: https://guardquote.vandine.us
- **Login**: https://guardquote.vandine.us/login
- **Admin**: https://guardquote.vandine.us/admin
- **Grafana**: https://grafana.vandine.us

## Default Admin
- Email: admin@guardquote.vandine.us
- Password: [see .env]

## Navigation
| Key | Section |
|-----|---------|
| Dashboard | Overview stats |
| Users | Team management (RBAC) |
| Blog | Posts + comments |
| Features | Feature requests + voting |
| Network | Topology + data pipeline |
| Services | Infrastructure status |

## Quote Status Flow
```
Pending → In Review → Quoted → Closed
```

## Quick Commands (SSH to pi1)

```bash
# Check Deno API status
pgrep -f "deno run" && echo "Running" || echo "Stopped"

# View logs
tail -f /tmp/gq.log

# Restart API
pkill -f "deno run"
cd ~/guardquote-deno && nohup deno run -A server.ts > /tmp/gq.log 2>&1 &

# Check database
PGPASSWORD=$DB_PASSWORD psql -h 127.0.0.1 -U postgres -d guardquote -c "SELECT COUNT(*) FROM quotes;"
```

## Team Contacts
- Rafa (Lead Dev): rafael.garcia.contact.me@gmail.com
- GitHub: https://github.com/jag18729/guard-quote
- Project Board: https://github.com/users/jag18729/projects/1

---
*Print this and keep at your desk*
