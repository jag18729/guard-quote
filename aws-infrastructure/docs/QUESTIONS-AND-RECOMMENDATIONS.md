# Questions & Recommendations Before Proceeding

## Critical Questions Requiring Your Input

### 1. Cloudflare Account & Domain

| Question | Options | Recommendation |
|----------|---------|----------------|
| **Do you have an existing Cloudflare account?** | Yes / No | If no, create one at cloudflare.com |
| **What domain will you use?** | guardquote.com / subdomain / other | Need domain for DNS, SSL, Cloudflare Tunnel |
| **Cloudflare plan?** | Free / Pro ($20/mo) / Business | **Pro** recommended for Load Balancing |

**Action needed:** Please provide:
- [ ] Cloudflare account email
- [ ] Domain name to use
- [ ] Current DNS provider

---

### 2. AWS Account & Region

| Question | Options | Recommendation |
|----------|---------|----------------|
| **AWS Region?** | us-east-1 / us-west-2 / eu-west-1 / other | **us-east-1** for CloudFront + lowest latency |
| **Existing AWS account or new?** | Existing / New | Use existing if you have one |
| **AWS Organizations?** | Yes / No | Recommended for multi-account |

**Action needed:** Please confirm:
- [ ] AWS account ID
- [ ] Preferred region
- [ ] IAM user/role with CloudFormation permissions

---

### 3. Database Strategy

| Question | Current (Pi1) | AWS Option | Recommendation |
|----------|--------------|------------|----------------|
| **Primary database location?** | Pi1 PostgreSQL | Aurora / RDS | **Pi1 primary, Aurora replica** (Phase 2) → **Aurora primary** (Phase 6) |
| **Replication method?** | - | Logical / Physical / DMS | **Logical replication** for flexibility |
| **Read/write split?** | No | Yes / No | Yes - reads from Aurora, writes to Pi1 initially |

**Critical decision:** Where should writes go during migration?
- [ ] Option A: Pi1 always (safest, requires replication)
- [ ] Option B: AWS always (requires data migration)
- [ ] Option C: Dual-write (complex, risk of conflicts)

**My recommendation:** Option A during phases 1-5, then cutover to B in phase 6.

---

### 4. Application Deployment Strategy

| Question | Options | Recommendation |
|----------|---------|----------------|
| **Backend compute?** | ECS Fargate / Lambda / EC2 | **ECS Fargate** - best balance of control/cost |
| **ML Engine compute?** | ECS / SageMaker / Lambda | **SageMaker** for model management, or **ECS** for simplicity |
| **Container registry?** | ECR / Docker Hub | **ECR** - integrates with ECS |

**Action needed:**
- [ ] Do you have Dockerfiles for backend and ML engine?
- [ ] Any specific runtime requirements?

---

### 5. Identity & Authentication

| Question | Current | AWS Options | Recommendation |
|----------|---------|-------------|----------------|
| **User auth?** | JWT + Argon2 (custom) | Cognito / Auth0 / Keep current | **Cognito** - native AWS integration |
| **Admin SSO?** | None | IAM Identity Center / Okta / AD | **IAM Identity Center** if team > 3 people |
| **MFA?** | Not required | Required / Optional | **Required for admins**, optional for users |

**Questions:**
- [ ] How many admin users?
- [ ] Do you need LDAP/AD integration for enterprise clients?
- [ ] Any existing identity provider (Google, Microsoft, etc.)?

---

### 6. Cloudflare Tunnel vs Tailscale

You currently have **Tailscale** for team access. For Cloudflare integration:

| Scenario | Tailscale | Cloudflare Tunnel | Both |
|----------|-----------|-------------------|------|
| Team dev access | ✅ | ❌ | ✅ |
| Production failover | ❌ | ✅ | ✅ |
| Public API exposure | ❌ | ✅ | ✅ |
| Zero Trust access | ❌ | ✅ | ✅ |

**Recommendation:** Use **both**:
- **Tailscale:** Team development access (keep current setup)
- **Cloudflare Tunnel:** Production failover path to Pi1

**Question:**
- [ ] Acceptable to run both Tailscale and Cloudflare Tunnel on Pi1?

---

### 7. Failover Behavior

| Scenario | Preferred Behavior | Notes |
|----------|-------------------|-------|
| AWS API slow (>5s) | Failover to Pi1 | Threshold configurable |
| AWS API down | Failover to Pi1 | Immediate |
| Pi1 down | Stay on AWS | AWS becomes sole source |
| Both slow | Route to faster | Requires health checks |
| Database out of sync | ? | **Need your input** |

**Critical question:** If databases are out of sync:
- [ ] Option A: Block writes, serve stale reads
- [ ] Option B: Accept potential data conflicts
- [ ] Option C: Fail completely until sync restored

---

### 8. Budget Constraints

| Tier | Monthly Budget | What You Get |
|------|----------------|--------------|
| **Minimal** | $100-150 | RDS t3.micro, no NAT, Lambda only |
| **Standard** | $250-350 | Aurora Serverless, NAT, ECS Fargate |
| **Production** | $400-600 | Multi-AZ, WAF, full monitoring |
| **Enterprise** | $800+ | Reserved capacity, premium support |

**Question:**
- [ ] What's your target monthly AWS budget?
- [ ] Any cost optimization priorities?

---

### 9. Timeline Preferences

| Approach | Duration | Risk Level | Cost |
|----------|----------|------------|------|
| **Aggressive** | 4-6 weeks | High | Lower (faster) |
| **Standard** | 8-10 weeks | Medium | Medium |
| **Conservative** | 12-16 weeks | Low | Higher (slower) |

**Question:**
- [ ] Any hard deadline for AWS migration?
- [ ] Preferred approach?

---

### 10. Existing Cloudflare Apps

You mentioned existing Cloudflare apps. Please clarify:

- [ ] What Cloudflare apps/workers exist?
- [ ] What domains are they on?
- [ ] Should they be integrated or kept separate?
- [ ] Any existing Cloudflare Pages deployments?

---

## Recommendations Summary

### Immediate Actions (Before Phase 1)

1. **Create/verify Cloudflare account** with your domain
2. **Confirm AWS account** and set up billing alerts
3. **Document current Pi1 PostgreSQL** schema and data size
4. **Decide on database write strategy** (Question #3)
5. **Set budget limits** in AWS

### Architecture Recommendations

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| Frontend | Cloudflare Pages | Free, global CDN, instant deploys |
| API Gateway | Cloudflare Workers → AWS ALB | Edge routing, failover |
| Backend | ECS Fargate | Right-sized, auto-scaling |
| Database | Aurora Serverless v2 | Scale to zero, pay-per-use |
| Cache | ElastiCache Redis | Managed, Multi-AZ |
| Auth | Cognito | Native AWS, MFA built-in |
| Failover | CF Workers + Tunnel | Automatic, global |

### Security Recommendations

1. **Enable WAF** from day 1 (Phase 3)
2. **Use Secrets Manager** for all credentials
3. **Enable MFA** on AWS root and IAM users
4. **Configure VPC Flow Logs** for audit
5. **Set up CloudTrail** for API logging

### Cost Optimization Recommendations

1. **Use Aurora Serverless v2** - scales to 0.5 ACU when idle
2. **Reserved capacity** for predictable workloads after 3 months
3. **Spot instances** for non-production ECS tasks
4. **CloudFront caching** to reduce origin requests
5. **Set AWS Budgets** with alerts at 50%, 80%, 100%

---

## Next Steps After Your Answers

Once you provide answers to the questions above, I will:

1. **Customize the CloudFormation parameters** for your environment
2. **Create deployment scripts** with your specific values
3. **Set up Cloudflare Tunnel** configuration for Pi1
4. **Create Cloudflare Worker** for failover routing
5. **Document the exact commands** for each phase

---

## Quick Response Template

Copy and fill in:

```markdown
## My Answers

### Cloudflare
- Account email: _______________
- Domain: _______________
- Plan: Free / Pro / Business

### AWS
- Account ID: _______________
- Region: _______________
- Budget: $_____ /month

### Database
- Write location during migration: Pi1 / AWS / Dual
- Out-of-sync behavior: Block / Accept conflicts / Fail

### Identity
- Number of admins: _____
- MFA required: Yes / No
- External IdP: None / Google / Microsoft / Other

### Cloudflare Apps
- Existing apps: _______________
- Integrate or separate: _______________

### Timeline
- Deadline: _______________
- Approach: Aggressive / Standard / Conservative

### Other Notes
_______________
```

---

*Please answer the questions above so I can proceed with customized implementation.*
