# GuardQuote Roadmap

## Current State (v2.1.0)
- [x] PostgreSQL backend on Raspberry Pi (192.168.2.70)
- [x] ML prediction endpoints
- [x] 500+ training data samples
- [x] Frontend integration
- [x] Webhook system
- [x] Basic CRUD operations
- [x] Service layer (WebSocket, Cache, Monitor, Backup, Logging)
- [x] Infrastructure monitoring support
- [x] Syslog integration (192.168.2.101)

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           192.168.2.0/24 Network                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │    Pi1      │    │   Syslog    │    │    Dev      │    │   Future    │ │
│  │ 192.168.2.70│    │192.168.2.101│    │  (Local)    │    │    .x       │ │
│  │     ●       │    │      ●      │    │      ●      │    │      ◌      │ │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤    ├─────────────┤ │
│  │ PostgreSQL  │◀───│   rsyslog   │◀───│  Bun/Hono   │    │   Nginx     │ │
│  │ Redis       │    │ Prometheus  │    │  API Server │    │   Kong      │ │
│  │ PgBouncer   │    │  Grafana    │    │  WebSocket  │    │   LDAP      │ │
│  │ NodeExport  │    │ Alertmgr    │    │             │    │   SIEM      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
│  Legend: ● = Active   ◌ = Planned                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase -1: Infrastructure Setup (Priority: Critical) ★ IN PROGRESS

### Pi1 Database Server (192.168.2.70)
- [x] PostgreSQL 15 installed and configured
- [ ] Install Redis for caching
- [ ] Configure PgBouncer for connection pooling
- [ ] Install prometheus-node-exporter
- [ ] Install prometheus-postgres-exporter
- [ ] Configure fail2ban
- [ ] Configure UFW firewall

### Syslog Server (192.168.2.101)
- [ ] Configure rsyslog for GuardQuote logs
- [ ] Install Prometheus
- [ ] Install Grafana
- [ ] Install Alertmanager
- [ ] Install prometheus-node-exporter
- [ ] Configure fail2ban
- [ ] Configure UFW firewall

### Package Installation Reference
See: `.continue/PACKAGES.md` for full installation scripts

---

## Phase 0: Client Page Enhancements (Priority: High)

### 0.1 Live Quote Calculator
- [ ] WebSocket connection for real-time price updates
- [ ] Price recalculates instantly as user changes inputs
- [ ] Show "calculating..." state during recalculation
- [ ] Debounced input to prevent excessive API calls

### 0.2 Enhanced Quote Form
- [ ] Multi-step wizard with progress indicator
- [ ] Form validation with clear error messages
- [ ] Save draft quote to localStorage
- [ ] Guest quote vs. account-based quote

### 0.3 Quote Status Tracking
- [ ] Public quote status page (via unique token)
- [ ] Email notifications when status changes
- [ ] SMS notifications (optional)
- [ ] Estimated response time display

### 0.4 Client Page WebSocket Events
```
Client → Server:
- price.calculate: Real-time price recalculation
- availability.check: Check guard availability for date

Server → Client:
- price.update: Updated price and breakdown
- availability.result: Available guards/alternatives
- quote.submitted: Confirmation with queue position
```

---

## Phase 1: Admin Dashboard (Priority: High)

### 1.1 Admin Authentication
- [ ] JWT middleware for admin routes
- [ ] Admin login page
- [ ] Session management
- [ ] Role verification

### 1.2 User Management
- [ ] User list with search/filter
- [ ] Create/Edit user modal
- [ ] Role assignment (admin, sales, viewer)
- [ ] Soft delete users
- [ ] Password reset flow

### 1.3 Quote Management
- [ ] Quote list with filters (status, date, client)
- [ ] Quote detail view
- [ ] Status workflow (draft → sent → accepted/rejected)
- [ ] Duplicate quote function
- [ ] Export to PDF

### 1.4 Client Management
- [ ] Client list with search
- [ ] Client detail with quote history
- [ ] Create/Edit client
- [ ] Merge duplicate clients

### 1.5 ML Data Management
- [ ] Training data viewer
- [ ] Add/Edit training samples
- [ ] Bulk import from CSV
- [ ] Data quality indicators

### 1.6 Dashboard Analytics
- [ ] Quote volume chart
- [ ] Conversion rate metrics
- [ ] Revenue tracking
- [ ] Popular event types
- [ ] Location heatmap

### 1.7 Real-Time Monitoring (WebSocket)
- [ ] Live quote feed (new quotes appear instantly)
- [ ] System health dashboard (API, DB, Cache status)
- [ ] Active user sessions display
- [ ] Webhook delivery status monitor
- [ ] Error rate alerts
- [ ] Queue depth monitoring

### 1.8 Admin WebSocket Events
```
Server → Admin:
- quote.created: New quote submitted
- quote.status_changed: Quote status updated
- client.created: New client added
- user.logged_in: User session started
- system.health: API latency, DB connections, cache hit rate
- webhook.delivered/failed: Webhook delivery status
- alert: Warning/error notifications

Admin → Server:
- subscribe: Subscribe to event channels
- unsubscribe: Unsubscribe from channels
```

---

## Phase 2: Authentication System (Priority: Critical)

### 2.1 Core Auth
- [ ] JWT token generation
- [ ] Refresh token rotation
- [ ] Password hashing (Argon2)
- [ ] Login/Logout endpoints

### 2.2 Security
- [ ] Rate limiting on auth endpoints
- [ ] Failed login lockout
- [ ] Audit logging
- [ ] CSRF protection

### 2.3 OAuth (Optional)
- [ ] Google OAuth2
- [ ] Microsoft Azure AD
- [ ] SSO support

---

## Phase 3: ML Model Improvements (Priority: High)

### 3.1 Feature Engineering
- [ ] Seasonal adjustments
- [ ] Historical client pricing
- [ ] Market rate comparison
- [ ] Competitor pricing data

### 3.2 Model Training
- [ ] Automated retraining pipeline
- [ ] Feature importance analysis
- [ ] A/B testing framework
- [ ] Model versioning

### 3.3 Accuracy Tracking
- [ ] Prediction vs actual tracking
- [ ] Confidence calibration
- [ ] Drift detection

---

## Phase 4: Notifications (Priority: Medium)

### 4.1 Email
- [ ] Sendgrid/Resend integration
- [ ] Quote status templates
- [ ] Client notifications
- [ ] Admin alerts

### 4.2 SMS
- [ ] Twilio integration
- [ ] Quote confirmations
- [ ] Urgent notifications

### 4.3 Webhooks
- [ ] Retry with exponential backoff
- [ ] Delivery status tracking
- [ ] Webhook management UI

---

## Phase 5: Reporting (Priority: Medium)

### 5.1 Reports
- [ ] Quote conversion report
- [ ] Revenue by period
- [ ] Client acquisition
- [ ] Guard utilization

### 5.2 Exports
- [ ] PDF generation
- [ ] Excel export
- [ ] CSV download

---

## Phase 6: Deployment (Priority: High)

### 6.1 Containerization
- [ ] Docker build
- [ ] Docker Compose
- [ ] Health checks

### 6.2 CI/CD
- [ ] GitHub Actions
- [ ] Automated testing
- [ ] Deploy on merge

### 6.3 Infrastructure
- [ ] Production database
- [ ] CDN for frontend
- [ ] SSL certificates
- [ ] Monitoring (uptime, errors)

---

## Phase 7: Bun 1.3 Upgrades (Priority: Medium)

### 7.1 Database Layer Improvements
- [ ] Migrate from postgres.js to Bun.SQL for native PostgreSQL support
- [ ] Implement connection pooling with Bun.SQL
- [ ] Add query caching with Bun's built-in Redis client
- [ ] Benchmark database performance improvements

### 7.2 Caching Layer (Redis)
- [ ] Add Bun.redis() for session management
- [ ] Cache ML predictions with TTL (5-minute cache for same inputs)
- [ ] Cache event types and locations (rarely changing data)
- [ ] Implement cache invalidation on data updates

### 7.3 Real-Time Features (WebSocket)
- [ ] WebSocket server for live quote updates
- [ ] Real-time dashboard metrics
- [ ] Live notification delivery
- [ ] Quote collaboration (multiple editors)

### 7.4 Performance Optimizations
- [ ] Enable Bun's isolated installs for cleaner dependencies
- [ ] Use Bun's catalog feature for shared dependency versions
- [ ] Implement HTTP/2 server push for static assets
- [ ] Add response compression with Bun.serve()

### 7.5 Development Experience
- [ ] Set up Bun's full-stack dev server with HMR
- [ ] Add hot reload for backend changes
- [ ] Configure Bun's built-in test runner
- [ ] Enable source maps for production debugging

---

## Phase 8: Python 3.14 ML Service (Priority: Low - Future)

### 8.1 Dedicated ML Microservice
- [ ] Create Python 3.14 FastAPI service for advanced ML
- [ ] Use template strings (t-strings) for safe SQL queries
- [ ] Implement subinterpreters for parallel model training
- [ ] Enable free-threaded mode for GIL-free inference

### 8.2 Advanced ML Features
- [ ] TensorFlow/PyTorch model training pipeline
- [ ] Automated hyperparameter tuning
- [ ] Model versioning with MLflow
- [ ] A/B testing framework for pricing strategies

### 8.3 Python-Bun Integration
- [ ] gRPC communication between Bun API and Python ML
- [ ] Shared Redis cache for predictions
- [ ] Model serving via TorchServe/TF Serving
- [ ] Health check integration

---

## Recommended Code Refactors

### Immediate (Bun 1.3)
1. **Replace postgres.js with Bun.SQL**
   ```typescript
   // Before (postgres.js)
   import postgres from "postgres";
   const sql = postgres("postgres://...");

   // After (Bun.SQL)
   const sql = Bun.sql("postgres://...");
   ```

2. **Add Redis Caching**
   ```typescript
   const redis = Bun.redis();

   // Cache ML predictions
   const cacheKey = `ml:${eventType}:${zipCode}:${numGuards}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);

   // ... compute prediction ...
   await redis.set(cacheKey, JSON.stringify(result), { ex: 300 });
   ```

3. **WebSocket for Real-Time Updates**
   ```typescript
   Bun.serve({
     fetch(req, server) {
       if (req.url.endsWith("/ws")) {
         server.upgrade(req);
         return;
       }
       return app.fetch(req);
     },
     websocket: {
       message(ws, data) {
         // Handle real-time quote updates
       }
     }
   });
   ```

### Database Connection Improvements
- Add prepared statements for frequently used queries
- Implement query result streaming for large datasets
- Add connection health monitoring with auto-reconnect

### API Structure Improvements
- Add request validation with Zod schemas
- Implement proper error handling middleware
- Add request/response logging with correlation IDs

---

## Future Ideas
- Mobile app for field agents
- Real-time quote collaboration
- Integration with scheduling software
- Automatic guard assignment
- Client portal for quote requests
- AI chatbot for quote inquiries
- Multi-tenant support for franchises
- Geographic expansion beyond California
- Integration with payroll systems
