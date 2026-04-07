# SIEM Sample Logs for Isaiah

## Quick Start

These sample logs represent 24 hours of activity from the Vandine home lab.
Use them to test your SIEM ingest pipeline before connecting to live logs.

## Files

| File | Format | Description |
|------|--------|-------------|
| `auth.log.sample` | Syslog | SSH, sudo, LDAP authentication events |
| `guardquote-api.log.sample` | Custom | Application API logs |
| `logs-export.json` | JSON | Parsed & normalized logs (SIEM-ready) |

## Importing to Elastic

### Option 1: Filebeat (Recommended)
```yaml
filebeat.inputs:
  - type: log
    paths:
      - /path/to/auth.log.sample
    fields:
      log_type: auth
  - type: log
    paths:
      - /path/to/guardquote-api.log.sample
    fields:
      log_type: application
```

### Option 2: Direct Upload
```bash
# Upload JSON directly to Elasticsearch
curl -X POST "localhost:9200/vandine-logs/_bulk" \
  -H "Content-Type: application/json" \
  --data-binary @logs-export.json
```

## Detection Rules to Test

### 1. Brute Force Detection
```
source:auth AND message:"Failed password" | stats count by source_ip | where count > 3
```

### 2. Invalid User Attempts
```
source:auth AND message:"Invalid user"
```

### 3. API Authentication Failures
```
source:guardquote-api AND status_code:401
```

### 4. Privilege Escalation
```
source:auth AND message:"sudo" AND message:"COMMAND="
```

### 5. Service Restart
```
event_type:service_restart
```

### 6. Database Errors
```
event_type:database_error OR message:"connection timeout"
```

## Expected Alerts from Sample Data

When you ingest these samples, your SIEM should trigger:

- **3 brute force alerts** (multiple failed SSH from same IP)
- **4 API auth failures** (invalid credentials)
- **1 permission denied** (developer trying to delete user)
- **1 database error** (connection timeout)
- ℹ **3 sudo commands** (privileged actions)

## Live Log Connection

Once your SIEM is working with samples, contact Rafa for:
1. Syslog forwarding config (give us your SIEM IP)
2. Tailscale invite (for direct access)
3. Elastic Cloud credentials (for Filebeat)

---

**Contact:** rafael.garcia.contact.me@gmail.com | Discord: openSourced
