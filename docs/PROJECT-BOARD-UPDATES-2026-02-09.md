# Project Board Updates - February 9, 2026

## Items to Mark DONE

### Infrastructure & Backend

| Task | Status | Notes |
|------|--------|-------|
| **Migrate API from Deno to Node.js** | Done | Node.js 22 + Hono, running as `guardquote-node.service` |
| **Integrate Datadog APM** | Done | dd-trace v5 with auto-instrumentation (68+ spans) |
| **Deploy Datadog agents** | Done | All 3 hosts: pi0, pi1, WSL |
| **Fix dashboard stats (zeros)** | Done | API now returns correct field names |
| **Add missing API endpoints** | Done | 50 endpoints now (was 17) |

### API Endpoints Added (Full Parity with Deno)

| Category | Endpoints | Status |
|----------|-----------|--------|
| Users | CRUD + Activity logs | |
| ML Engine | Status, Training data, Stats, Retrain, Rollback | |
| Services | List, System info, Infrastructure, Prometheus health | |
| Blog | Posts + Comments CRUD | |
| Features | CRUD + Voting + Stats | |
| Quotes | Admin list, Public quote, Status updates | |
| Auth | Permissions, Profile, Change password | |
| Infrastructure | Service control (start/stop/restart), Logs | |

### Frontend

| Task | Status | Notes |
|------|--------|-------|
| **Update Tech Stack page** | Done | Reflects Node.js migration, Datadog APM, observability stack |

---

## Metrics (Post-Migration)

| Metric | Before | After |
|--------|--------|-------|
| API Endpoints | 17 | 50 |
| APM Spans/Request | 0 | 68+ |
| Tracing Overhead | N/A | 3% |
| Dashboard Sections Working | 2/8 | 8/8 |

---

## Related Commits

```bash
# Get today's commits
cd ~/workspace/guard-quote-repo
git log --oneline --since="2026-02-09" --until="2026-02-10"
```

---

## Suggested Board Updates

### Move to "Done" Column:
1. Any items related to "Deno API" → Now Node.js
2. Any items related to "Dashboard not showing data"
3. Any items related to "APM/Observability"
4. Any items related to "Tech Stack documentation"

### Add New Items (if tracking):
1. **[Done]** Node.js + dd-trace migration
2. **[Done]** Full API endpoint parity (50 endpoints)
3. **[Done]** Datadog integration (APM + Logs + Metrics)
4. **[Done]** Tech Stack page redesign

### Update Descriptions:
- Update any backend-related items to mention Node.js instead of Deno
- Add Datadog dashboard links where relevant:
  - Vandine Home Lab: https://us5.datadoghq.com/dashboard/ir6-zgj-sij
  - Matrix Network: https://us5.datadoghq.com/dashboard/jbf-987-8db

---

## Suggested Labels

If using GitHub labels:
- `backend` - For Node.js migration work
- `observability` - For Datadog/APM work
- `documentation` - For tech stack updates
- `completed` - For all items above

---

*Generated: 2026-02-09 12:10 PST*
*Project Board: https://github.com/users/jag18729/projects/1*
