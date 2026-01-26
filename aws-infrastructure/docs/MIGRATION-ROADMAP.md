# GuardQuote Multi-Phase Migration Roadmap

## Overview

This document outlines a phased approach to migrating GuardQuote from the Pi cluster to AWS while maintaining Pi1 as the primary data source and enabling Cloudflare failover.

## Current State

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Development Machine                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │ Frontend    │  │ Backend     │  │ ML Engine   │                      │
│  │ React 19    │  │ Bun + Hono  │  │ FastAPI     │                      │
│  │ :5173       │  │ :3000       │  │ :8000       │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
└─────────┼────────────────┼────────────────┼─────────────────────────────┘
          │                │                │
          └────────────────┴─── Tailscale ──┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────┐
│ Pi0 (192.168.2.101) │         │ Pi1 (192.168.2.70)  │
│ ┌─────────────────┐ │         │ Tailscale: 100.66.167.62
│ │ GitHub Actions  │ │         │ ┌─────────────────┐ │
│ │ Runner          │ │────────►│ │ PostgreSQL:5432 │ │
│ │                 │ │         │ │ Redis:6379      │ │
│ │ User: rafaeljg  │ │         │ │ Prometheus:9090 │ │
│ └─────────────────┘ │         │ │ Grafana:3000    │ │
└─────────────────────┘         └─────────────────────┘
```

---

## Target State (Phase 4)

```
                              ┌─────────────────────────────────┐
                              │      Cloudflare Edge            │
                              │  ┌───────────┐ ┌──────────────┐ │
                              │  │ Pages     │ │ Workers      │ │
                              │  │ (Frontend)│ │ (API Proxy)  │ │
                              │  └─────┬─────┘ └──────┬───────┘ │
                              │        │              │         │
                              │  ┌─────┴──────────────┴─────┐   │
                              │  │   Cloudflare Tunnel       │   │
                              │  │   (Failover Routing)     │   │
                              │  └─────┬──────────────┬─────┘   │
                              └────────┼──────────────┼─────────┘
                                       │              │
              ┌────────────────────────┘              └────────────────────────┐
              ▼                                                                ▼
┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│            AWS (Primary Cloud)           │     │          Pi Cluster (Origin/Backup)      │
│  ┌─────────────────────────────────────┐ │     │  ┌─────────────────┐  ┌───────────────┐ │
│  │         CloudFront CDN              │ │     │  │ Pi1             │  │ Pi0           │ │
│  └──────────────┬──────────────────────┘ │     │  │ ┌─────────────┐ │  │ GitHub Runner │ │
│                 │                        │     │  │ │ PostgreSQL  │ │  │ Backups       │ │
│  ┌──────────────┴──────────────────────┐ │     │  │ │ (Primary)   │ │  └───────────────┘ │
│  │              ALB                     │ │     │  │ ├─────────────┤ │                    │
│  └──────────────┬──────────────────────┘ │     │  │ │ Redis       │ │                    │
│                 │                        │     │  │ ├─────────────┤ │                    │
│  ┌──────────────┼──────────────────────┐ │     │  │ │ Prometheus  │ │                    │
│  │  ┌───────────┴───────────┐          │ │     │  │ │ Grafana     │ │                    │
│  │  │ ECS/Lambda Backend    │          │ │     │  │ └─────────────┘ │                    │
│  │  │ ML Engine             │          │ │     │  └────────┬────────┘                    │
│  │  └───────────┬───────────┘          │ │     └───────────┼────────────────────────────┘
│  │              │                      │ │                 │
│  │  ┌───────────┴───────────┐          │ │                 │
│  │  │ Aurora Serverless     │◄─────────┼─┼─── Replication ─┘
│  │  │ ElastiCache Redis     │          │ │
│  │  └───────────────────────┘          │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Weeks 1-2)

### Objectives
- Deploy core AWS networking infrastructure
- Set up Cloudflare account and tunnel
- Establish secure connectivity between all environments

### Tasks

| # | Task | Owner | Effort | Dependency |
|---|------|-------|--------|------------|
| 1.1 | Deploy VPC stack (`01-vpc.yaml`) | DevOps | 2h | - |
| 1.2 | Deploy Security Groups (`02-security-groups.yaml`) | DevOps | 1h | 1.1 |
| 1.3 | Deploy VPC Endpoints (`03-vpc-endpoints.yaml`) | DevOps | 1h | 1.2 |
| 1.4 | Set up Cloudflare account + domain | DevOps | 2h | - |
| 1.5 | Install Cloudflare Tunnel on Pi1 | DevOps | 1h | 1.4 |
| 1.6 | Configure Tailscale on AWS bastion | DevOps | 1h | 1.1 |
| 1.7 | Validate cross-environment connectivity | DevOps | 2h | 1.5, 1.6 |

### Deliverables
- [ ] AWS VPC with public/private/database subnets
- [ ] Cloudflare Tunnel exposing Pi1 services
- [ ] Tailscale mesh: Dev → AWS → Pi1
- [ ] Network connectivity test report

### Architecture After Phase 1
```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Dev Machine   │────►│  AWS VPC       │────►│  Pi1           │
│  (Tailscale)   │     │  (Bastion)     │     │  (Tailscale +  │
│                │     │  (Tailscale)   │     │   CF Tunnel)   │
└────────────────┘     └────────────────┘     └────────────────┘
                              │
                              ▼
                       ┌────────────────┐
                       │  Cloudflare    │
                       │  Tunnel        │
                       └────────────────┘
```

---

## Phase 2: AWS Data Layer (Weeks 3-4)

### Objectives
- Deploy AWS database infrastructure
- Set up PostgreSQL replication from Pi1 to Aurora
- Configure Redis replication

### Tasks

| # | Task | Owner | Effort | Dependency |
|---|------|-------|--------|------------|
| 2.1 | Deploy Aurora Serverless (`09-aurora-serverless.yaml`) | DBA | 3h | Phase 1 |
| 2.2 | Deploy ElastiCache Redis (`10-elasticache-redis.yaml`) | DBA | 2h | Phase 1 |
| 2.3 | Deploy Secrets Manager (`17-secrets-manager.yaml`) | DevOps | 1h | Phase 1 |
| 2.4 | Configure logical replication on Pi1 PostgreSQL | DBA | 4h | 2.1 |
| 2.5 | Set up Aurora as replication subscriber | DBA | 4h | 2.4 |
| 2.6 | Configure Redis data sync (SLAVEOF or backup/restore) | DBA | 2h | 2.2 |
| 2.7 | Create DynamoDB tables for caching (`11-dynamodb.yaml`) | DBA | 2h | Phase 1 |
| 2.8 | Validate data consistency | DBA | 4h | 2.5, 2.6 |

### PostgreSQL Replication Setup

```bash
# On Pi1 (Publisher)
sudo -u postgres psql -c "
  ALTER SYSTEM SET wal_level = logical;
  ALTER SYSTEM SET max_replication_slots = 4;
  ALTER SYSTEM SET max_wal_senders = 4;
"
sudo systemctl restart postgresql

# Create publication
sudo -u postgres psql -d guardquote -c "
  CREATE PUBLICATION guardquote_pub FOR ALL TABLES;
"

# On Aurora (Subscriber) - via Lambda or bastion
psql -h aurora-endpoint -c "
  CREATE SUBSCRIPTION guardquote_sub
  CONNECTION 'host=pi1-tailscale-ip port=5432 dbname=guardquote user=replication password=...'
  PUBLICATION guardquote_pub;
"
```

### Deliverables
- [ ] Aurora Serverless v2 running with replicated data
- [ ] ElastiCache Redis cluster with synced data
- [ ] Secrets stored in AWS Secrets Manager
- [ ] Data consistency validation report
- [ ] RPO/RTO measurements documented

---

## Phase 3: AWS Compute & API (Weeks 5-6)

### Objectives
- Deploy application load balancer
- Deploy backend and ML services
- Configure API Gateway
- Set up monitoring

### Tasks

| # | Task | Owner | Effort | Dependency |
|---|------|-------|--------|------------|
| 3.1 | Deploy ALB (`04-alb.yaml`) | DevOps | 2h | Phase 2 |
| 3.2 | Deploy WAF (`16-waf.yaml`) | Security | 2h | 3.1 |
| 3.3 | Containerize backend (Dockerfile) | Backend | 4h | - |
| 3.4 | Containerize ML engine (Dockerfile) | ML | 4h | - |
| 3.5 | Deploy ECS/Fargate or Lambda for backend | DevOps | 4h | 3.3, 3.1 |
| 3.6 | Deploy ML engine to ECS/SageMaker | DevOps | 4h | 3.4 |
| 3.7 | Deploy API Gateway (`06-api-gateway-rest.yaml`) | DevOps | 2h | 3.5 |
| 3.8 | Deploy CloudWatch monitoring (`19-cloudwatch-monitoring.yaml`) | DevOps | 2h | 3.5 |
| 3.9 | Deploy X-Ray tracing (`20-xray-tracing.yaml`) | DevOps | 1h | 3.5 |
| 3.10 | Configure health checks (`18-network-health-check.yaml`) | DevOps | 2h | 3.5 |
| 3.11 | End-to-end testing | QA | 8h | All above |

### Deliverables
- [ ] Backend running on AWS (ECS/Lambda)
- [ ] ML engine running on AWS
- [ ] API Gateway with rate limiting
- [ ] WAF protecting all endpoints
- [ ] Monitoring dashboards operational
- [ ] All health checks passing

---

## Phase 4: Cloudflare Integration & Failover (Weeks 7-8)

### Objectives
- Deploy frontend to Cloudflare Pages
- Configure Cloudflare Workers for API routing
- Implement active-passive failover
- Set up DNS-based traffic management

### Tasks

| # | Task | Owner | Effort | Dependency |
|---|------|-------|--------|------------|
| 4.1 | Deploy frontend to Cloudflare Pages | Frontend | 2h | - |
| 4.2 | Create Cloudflare Worker for API proxy | Backend | 4h | Phase 3 |
| 4.3 | Configure origin health checks | DevOps | 2h | 4.2 |
| 4.4 | Implement failover logic in Worker | Backend | 4h | 4.2, 4.3 |
| 4.5 | Set up Cloudflare Load Balancing (Pro required) | DevOps | 2h | 4.2 |
| 4.6 | Configure Cloudflare Tunnel for Pi1 backup | DevOps | 2h | Phase 1 |
| 4.7 | DNS configuration (AWS primary, Pi1 secondary) | DevOps | 2h | 4.5 |
| 4.8 | Failover testing (chaos engineering) | QA | 8h | All above |
| 4.9 | Documentation and runbooks | All | 4h | All above |

### Cloudflare Worker (API Proxy with Failover)

```javascript
// workers/api-proxy.js
const ORIGINS = {
  primary: 'https://api.guardquote.aws.example.com',
  secondary: 'https://api.guardquote.pi1.example.com', // via CF Tunnel
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Try primary (AWS) first
    try {
      const response = await fetchWithTimeout(
        `${ORIGINS.primary}${url.pathname}${url.search}`,
        request,
        5000 // 5s timeout
      );

      if (response.ok) {
        return addCorsHeaders(response);
      }
    } catch (e) {
      console.log('Primary failed, trying secondary:', e.message);
    }

    // Fallback to secondary (Pi1 via Tunnel)
    try {
      const response = await fetchWithTimeout(
        `${ORIGINS.secondary}${url.pathname}${url.search}`,
        request,
        10000 // 10s timeout for Pi1
      );

      return addCorsHeaders(response);
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Service temporarily unavailable',
        code: 'ALL_ORIGINS_DOWN'
      }), { status: 503 });
    }
  }
};
```

### Failover Matrix

| Scenario | Primary (AWS) | Secondary (Pi1) | Result |
|----------|---------------|-----------------|--------|
| Normal operation | ✅ Healthy | ✅ Healthy | Route to AWS |
| AWS degraded | ⚠️ Slow/Errors | ✅ Healthy | Route to Pi1 |
| AWS down | ❌ Down | ✅ Healthy | Route to Pi1 |
| Pi1 down | ✅ Healthy | ❌ Down | Route to AWS |
| Both degraded | ⚠️ Slow | ⚠️ Slow | Route to fastest |
| Both down | ❌ Down | ❌ Down | 503 error page |

### Deliverables
- [ ] Cloudflare Pages hosting frontend
- [ ] Cloudflare Worker routing API traffic
- [ ] Health check monitoring all origins
- [ ] Automatic failover working
- [ ] DNS configured for optimal routing
- [ ] Failover runbook documented

---

## Phase 5: Identity & Security Hardening (Week 9)

### Objectives
- Deploy Cognito for user authentication
- Integrate with existing LDAP (if needed)
- Implement SSO for admin access

### Tasks

| # | Task | Owner | Effort | Dependency |
|---|------|-------|--------|------------|
| 5.1 | Deploy Cognito (`12-cognito.yaml`) | Security | 3h | Phase 3 |
| 5.2 | Migrate users from Pi1 PostgreSQL to Cognito | Backend | 4h | 5.1 |
| 5.3 | Update backend auth to use Cognito JWT | Backend | 4h | 5.1 |
| 5.4 | Deploy Directory Service (optional) (`13-directory-service.yaml`) | Security | 4h | Phase 2 |
| 5.5 | Configure IAM Identity Center (`14-iam-identity-center.yaml`) | Security | 2h | 5.4 |
| 5.6 | Update frontend auth flow | Frontend | 4h | 5.3 |
| 5.7 | Security audit and penetration testing | Security | 8h | All above |

### Deliverables
- [ ] Cognito User Pool with MFA enabled
- [ ] All API endpoints using Cognito JWT
- [ ] Admin SSO via IAM Identity Center
- [ ] Security audit report

---

## Phase 6: Production Cutover (Week 10)

### Objectives
- Final validation and performance testing
- DNS cutover to production
- Monitoring and 24/7 support readiness

### Cutover Checklist

```markdown
## Pre-Cutover (T-24h)
- [ ] All CloudFormation stacks deployed and stable
- [ ] Data replication lag < 1 minute
- [ ] All health checks green for 24 hours
- [ ] Rollback plan documented and tested
- [ ] On-call rotation scheduled

## Cutover (T-0)
- [ ] Enable Cloudflare proxy (orange cloud)
- [ ] Update DNS TTL to 60 seconds
- [ ] Switch DNS to Cloudflare nameservers
- [ ] Monitor error rates for 1 hour
- [ ] Confirm all traffic routing through Cloudflare

## Post-Cutover (T+24h)
- [ ] Review CloudWatch dashboards
- [ ] Check Cloudflare analytics
- [ ] Validate data consistency
- [ ] Team retrospective
- [ ] Update documentation
```

---

## Estimated Timeline Summary

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| Phase 1: Foundation | 2 weeks | VPC + Connectivity |
| Phase 2: Data Layer | 2 weeks | Replication Running |
| Phase 3: Compute | 2 weeks | Backend on AWS |
| Phase 4: Cloudflare | 2 weeks | Failover Working |
| Phase 5: Identity | 1 week | Cognito Live |
| Phase 6: Cutover | 1 week | Production Launch |
| **Total** | **10 weeks** | |

---

## Cost Projections

### AWS Monthly Costs (Production)

| Service | Configuration | Est. Monthly |
|---------|--------------|--------------|
| VPC | NAT Gateway | $32 |
| ALB | Standard | $22 |
| Aurora Serverless v2 | 2-8 ACU | $50-200 |
| ElastiCache | cache.t3.medium x2 | $50 |
| ECS Fargate | 2 vCPU, 4GB x2 | $70 |
| CloudFront | 100GB transfer | $10 |
| WAF | Standard rules | $10 |
| Secrets Manager | 10 secrets | $5 |
| CloudWatch | Logs + Metrics | $20 |
| **AWS Total** | | **$270-420/mo** |

### Cloudflare Monthly Costs

| Service | Plan | Est. Monthly |
|---------|------|--------------|
| Pages | Free | $0 |
| Workers | Free tier (100k/day) | $0 |
| Tunnel | Free | $0 |
| Load Balancing | Pro plan | $20 |
| **Cloudflare Total** | | **$0-20/mo** |

### Pi Cluster (Existing)

| Item | Cost |
|------|------|
| Electricity | ~$10/mo |
| Internet | (existing) |
| **Pi Total** | **$10/mo** |

### Grand Total: **$280-450/month**

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during replication | Low | High | Test restore from Pi1 backups |
| Latency increase | Medium | Medium | Use Cloudflare caching, edge compute |
| Cost overrun | Medium | Low | Set AWS budgets, use serverless |
| Connectivity failure | Low | High | Multiple failover paths (Tailscale + CF Tunnel) |
| Security breach | Low | High | WAF, Cognito MFA, security audit |

---

## Success Metrics

| Metric | Current (Pi1) | Target (AWS) |
|--------|---------------|--------------|
| Availability | 99% | 99.9% |
| API Latency (p95) | 200ms | 100ms |
| Time to Recovery | 30 min | 5 min |
| RPO (data loss) | 24 hours | 1 minute |
| RTO (downtime) | 1 hour | 5 minutes |

---

*Document Version: 1.0*
*Last Updated: January 26, 2026*
