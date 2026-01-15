# Pi0 Setup Guide

Use this guide to complete Pi0 setup for backup replication.

## Pi0 Info

| Property | Value |
|----------|-------|
| Hostname | pi0 |
| IP | 192.168.2.101 |
| User | rafaeljg |
| Purpose | Backup storage, syslog server |

## SSH Keys to Add

Add these to `/home/rafaeljg/.ssh/authorized_keys` on Pi0:

```
# From MacBook (for direct access)
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJOYICsUyK4b9QcEu5wIdVW6WONAse6fSmRNjckmwu/G ekoe299@gmail.com

# From Pi1 (for automated backups)
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK/ptPW4l0OXtwFf9P8UM281Pow9o7adJpMti7QMTx84 pi1-to-pi0
```

## Setup Steps

### 1. Access Pi0 (Physical or Password)
Connect keyboard/monitor to Pi0, or use password if enabled:
```bash
ssh rafaeljg@192.168.2.101
# Enter password when prompted
```

### 2. Create .ssh Directory
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

### 3. Add SSH Keys
```bash
cat >> ~/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJOYICsUyK4b9QcEu5wIdVW6WONAse6fSmRNjckmwu/G ekoe299@gmail.com
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK/ptPW4l0OXtwFf9P8UM281Pow9o7adJpMti7QMTx84 pi1-to-pi0
EOF
chmod 600 ~/.ssh/authorized_keys
```

### 4. Create Backup Directory
```bash
mkdir -p ~/backups/pi1
```

### 5. Test Access

**From MacBook:**
```bash
ssh -i ~/.ssh/pi0 rafaeljg@192.168.2.101 "hostname && df -h /"
```

**From Pi1:**
```bash
ssh pi1
ssh -i ~/.ssh/pi0_key rafaeljg@192.168.2.101 "hostname"
```

### 6. Test Backup Transfer
```bash
# From Pi1
scp -i ~/.ssh/pi0_key ~/backups/*.dump rafaeljg@192.168.2.101:~/backups/pi1/
```

## Verification Checklist

- [ ] Can SSH from MacBook to Pi0 with key
- [ ] Can SSH from Pi1 to Pi0 with key
- [ ] Backup directory exists on Pi0: `~/backups/pi1/`
- [ ] Manual backup transfer works
- [ ] Wait for 2 AM cron or run `~/backup-guardquote.sh` to test full flow

## Troubleshooting

### Permission denied
```bash
# Check permissions on Pi0
ls -la ~/.ssh/
# Should be: drwx------ .ssh, -rw------- authorized_keys
```

### Key not accepted
```bash
# Check if key is in authorized_keys
cat ~/.ssh/authorized_keys
```

### Connection refused
```bash
# Check SSH service on Pi0
sudo systemctl status ssh
sudo systemctl start ssh
```

## After Setup Complete

Once Pi0 is accessible, the backup script will automatically:
1. Detect Pi0 is reachable
2. Transfer backups (PostgreSQL, Redis, configs)
3. Clean up old remote backups (>7 days)

No code changes needed - the script already handles Pi0 connectivity.

---

*Created: January 15, 2026*
