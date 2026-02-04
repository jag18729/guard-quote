# GuardQuote Admin Quick Reference

## URLs
- **App**: https://guardquote.vandine.us
- **Login**: https://guardquote.vandine.us/login
- **Admin**: https://guardquote.vandine.us/admin

## Default Admin
- Email: johnmarston@vandine.us
- Password: (ask John)

## Navigation
| Key | Section |
|-----|---------|
| `D` | Dashboard |
| `Q` | Quote Requests |
| `U` | Users |
| `S` | Services |
| `L` | Logs |

## Quote Status Flow
```
Pending → In Review → Quoted → Closed
```

## Quick Commands (SSH to pi1)
```bash
# Check backend status
sudo systemctl status guardquote

# View logs
sudo journalctl -u guardquote -f

# Restart backend
sudo systemctl restart guardquote

# Check database
psql -U guardquote -d guardquote -c "SELECT COUNT(*) FROM quotes;"
```

## Emergency Contacts
- John: john@vandine.us
- Slack: #guardquote-ops

---
*Print this and keep at your desk*
