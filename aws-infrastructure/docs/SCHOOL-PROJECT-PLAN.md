# GuardQuote School Project - 8-Week Sprint Plan

## Project Parameters

| Parameter | Value |
|-----------|-------|
| **Deadline** | May 4, 2026 (Presentation) |
| **Active Development** | 8 weeks |
| **AWS Region** | us-west-2 (Oregon) |
| **Database Strategy** | Pi1 Primary → Aurora Replica |
| **Budget Target** | < $100/month during active phase |
| **Teardown Date** | May 10, 2026 |

---

## Timeline Overview

```
Jan 26 ──────────────────────────────────────────────────► May 4
   │                                                         │
   │  ┌─────────────────────────────────────────────────┐   │
   │  │         8-WEEK ACTIVE DEVELOPMENT               │   │
   │  │  Feb 3 ──────────────────────────► Mar 31       │   │
   │  └─────────────────────────────────────────────────┘   │
   │                                                         │
   │  Week 1-2: Foundation & Networking                     │
   │  Week 3-4: Database & Replication                      │
   │  Week 5-6: Compute & API                               │
   │  Week 7-8: Cloudflare & Polish                         │
   │                                                         │
   │  Apr 1-30: Testing, Documentation, Presentation Prep   │
   │                                                         │
   └─────────────────────────────────────────────────────────┘
```

---

## Cost-Optimized Architecture (School Project Edition)

```
┌───────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE (FREE TIER)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ Pages       │  │ Workers     │  │ Tunnel                  │   │
│  │ (Frontend)  │  │ (API Proxy) │  │ (Pi1 Backup)            │   │
│  │ FREE        │  │ FREE 100k/d │  │ FREE                    │   │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘   │
└─────────┼────────────────┼─────────────────────┼─────────────────┘
          │                │                     │
          │                ▼                     │
          │     ┌─────────────────────┐          │
          │     │ AWS us-west-2       │          │
          │     │ ┌─────────────────┐ │          │
          │     │ │ ALB             │ │          │
          │     │ │ ~$20/mo         │ │          │
          │     │ └────────┬────────┘ │          │
          │     │          │          │          │
          │     │ ┌────────┴────────┐ │          │
          │     │ │ Lambda/Fargate  │ │          │
          │     │ │ Pay-per-use     │ │          │
          │     │ └────────┬────────┘ │          │
          │     │          │          │          │
          │     │ ┌────────┴────────┐ │          │
          │     │ │ Aurora Sless v2 │ │          │
          │     │ │ 0.5 ACU min     │ │          │
          │     │ │ ~$40/mo idle    │ │          │
          │     │ └─────────────────┘ │          │
          │     └─────────────────────┘          │
          │                                      │
          └──────────────────────────────────────┘
                            │
                            ▼
               ┌─────────────────────────┐
               │ Pi1 (192.168.2.70)      │
               │ PostgreSQL (Primary)    │
               │ Redis                   │
               │ $0 (already running)    │
               └─────────────────────────┘
```

---

## Free Resources to Leverage

### GitHub Student Developer Pack
- **AWS Credits**: Apply for AWS Educate ($100 credits)
- **DigitalOcean**: $200 in credits (backup option)
- **MongoDB Atlas**: $200 credits (if needed)
- **Namecheap**: Free domain for 1 year

### Cloudflare Student Program
**URL**: https://www.cloudflare.com/students/

Requirements:
- US-based student
- Age 18+
- .edu email address

**Benefits** (1 year free):
- Workers (production-grade)
- Pages (unlimited sites)
- D1 Database
- R2 Storage
- Tunnel (unlimited)

### AWS Free Tier (12 months)
- **EC2**: 750 hours t2.micro/month
- **RDS**: 750 hours db.t2.micro/month
- **Lambda**: 1M requests/month
- **S3**: 5GB storage
- **CloudWatch**: 10 custom metrics

---

## Domain Recommendations

Since you have `vandine.us`, consider these options:

| Domain | Est. Cost | Pros |
|--------|-----------|------|
| `guardquote.app` | $14/yr | Modern, app-focused |
| `guardquote.dev` | $12/yr | Developer-friendly |
| `guardquote.io` | $32/yr | Tech/startup vibe |
| `guardquote.co` | $25/yr | Short, professional |
| `gq.vandine.us` | FREE | Use your existing domain |

**Recommendation**: Use `gq.vandine.us` or `guardquote.vandine.us` for FREE since you own vandine.us. Save money for a school project!

---

## 8-Week Sprint Schedule

### Week 1 (Feb 3-9): Foundation
**Goal**: AWS VPC + Cloudflare setup

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy VPC stack (`01-vpc.yaml`) - NO NAT Gateway (save $32/mo) | 2h |
| Tue | Deploy Security Groups (`02-security-groups.yaml`) | 1h |
| Wed | Sign up Cloudflare Student Program | 1h |
| Thu | Add vandine.us to Cloudflare (or buy cheap domain) | 1h |
| Fri | Install Cloudflare Tunnel on Pi1 | 2h |
| Sat | Test: Dev → Tailscale → Pi1 → CF Tunnel → Internet | 2h |

**Cost this week**: $0

### Week 2 (Feb 10-16): Networking Complete
**Goal**: VPC Endpoints + Bastion

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy VPC Endpoints (`03-vpc-endpoints.yaml`) - S3 & DynamoDB only (free) | 1h |
| Tue | Deploy Bastion Host (`15-bastion-host.yaml`) - t3.micro | 2h |
| Wed | Configure SSM Session Manager (no SSH keys needed) | 1h |
| Thu | Test bastion → private subnets | 1h |
| Fri | Document network architecture | 2h |

**Monthly cost so far**: ~$8 (bastion t3.micro)

### Week 3 (Feb 17-23): Database Layer
**Goal**: Aurora Serverless + Replication

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy Aurora Serverless v2 (`09-aurora-serverless.yaml`) - 0.5 ACU min | 3h |
| Tue | Configure Pi1 PostgreSQL for logical replication | 2h |
| Wed | Set up Aurora as subscriber | 3h |
| Thu | Test replication: insert on Pi1 → appears in Aurora | 2h |
| Fri | Deploy Secrets Manager (`17-secrets-manager.yaml`) | 1h |

**Monthly cost so far**: ~$50 (Aurora 0.5 ACU + bastion)

### Week 4 (Feb 24-Mar 2): Cache + DynamoDB
**Goal**: Redis + DynamoDB tables

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy ElastiCache Redis (`10-elasticache-redis.yaml`) - cache.t3.micro | 2h |
| Tue | Sync Redis data from Pi1 | 2h |
| Wed | Deploy DynamoDB tables (`11-dynamodb.yaml`) - on-demand | 2h |
| Thu | Test database connectivity from bastion | 2h |
| Fri | Document database layer, measure replication lag | 2h |

**Monthly cost so far**: ~$65 (+ ElastiCache t3.micro)

### Week 5 (Mar 3-9): Compute Layer
**Goal**: Backend + ML on AWS

| Day | Task | Time |
|-----|------|------|
| Mon | Create Dockerfile for backend | 2h |
| Tue | Create Dockerfile for ML engine | 2h |
| Wed | Push to ECR, deploy to Lambda or Fargate Spot | 3h |
| Thu | Deploy ALB (`04-alb.yaml`) | 2h |
| Fri | Test: ALB → Backend → Aurora | 2h |

**Monthly cost so far**: ~$90 (+ ALB ~$22 + Fargate minimal)

### Week 6 (Mar 10-16): API & Security
**Goal**: API Gateway + WAF

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy API Gateway (`07-api-gateway-http.yaml`) | 2h |
| Tue | Deploy WAF (`16-waf.yaml`) - basic rules only | 2h |
| Wed | Configure rate limiting, CORS | 2h |
| Thu | Deploy CloudWatch monitoring (`19-cloudwatch-monitoring.yaml`) | 2h |
| Fri | End-to-end test: Internet → API GW → ALB → Backend → Aurora | 3h |

**Monthly cost so far**: ~$100 (+ WAF ~$5)

### Week 7 (Mar 17-23): Cloudflare Integration
**Goal**: Frontend + API proxy + Failover

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy frontend to Cloudflare Pages | 2h |
| Tue | Create Cloudflare Worker for API routing | 3h |
| Wed | Implement failover logic (AWS primary, Pi1 backup) | 3h |
| Thu | Configure health checks | 2h |
| Fri | Test failover: kill AWS → verify Pi1 takes over | 3h |

**Monthly cost**: Same (~$100)

### Week 8 (Mar 24-31): Polish & Documentation
**Goal**: Production-ready for demo

| Day | Task | Time |
|-----|------|------|
| Mon | Deploy Cognito (`12-cognito.yaml`) for auth demo | 3h |
| Tue | Create admin dashboard in frontend | 3h |
| Wed | Load testing with k6 or Artillery | 3h |
| Thu | Document everything, create architecture diagrams | 4h |
| Fri | Record demo video, prepare presentation slides | 4h |

---

## April: Testing & Presentation Prep

| Week | Focus |
|------|-------|
| Apr 1-7 | Chaos engineering: test all failover scenarios |
| Apr 8-14 | Documentation polish, README updates |
| Apr 15-21 | Practice presentation, get feedback |
| Apr 22-28 | Final polish, dry run |
| Apr 29-May 4 | **PRESENTATION WEEK** |

---

## Estimated Monthly Costs

### During Development (Feb-Apr)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EC2 Bastion | t3.micro | $8 |
| Aurora Serverless v2 | 0.5-2 ACU | $40-80 |
| ElastiCache | cache.t3.micro | $12 |
| ALB | Standard | $22 |
| WAF | Basic | $5 |
| API Gateway | HTTP API | ~$1 |
| Lambda/Fargate | Minimal | ~$5 |
| CloudWatch | Basic | ~$5 |
| **Cloudflare** | **Student/Free** | **$0** |
| **AWS Total** | | **~$100/mo** |

### After Presentation (Teardown)

```bash
# May 10: Delete everything
aws cloudformation delete-stack --stack-name guardquote-prod-monitoring
aws cloudformation delete-stack --stack-name guardquote-prod-compute
aws cloudformation delete-stack --stack-name guardquote-prod-database
aws cloudformation delete-stack --stack-name guardquote-prod-network

# Keep Cloudflare (free) for portfolio
# Keep Pi1 running (your own hardware)
```

**Total Project Cost**: ~$300-400 (3-4 months)

---

## Auto-Scaling Configuration (Demo-Ready)

### Aurora Serverless v2 Auto-Scaling

```yaml
# In 09-aurora-serverless.yaml
ServerlessV2ScalingConfiguration:
  MinCapacity: 0.5  # Minimum (cheapest)
  MaxCapacity: 8    # Can burst for demo
```

### ECS Fargate Auto-Scaling

```yaml
# Application Auto Scaling
ScalableTarget:
  MinCapacity: 1     # Minimum tasks
  MaxCapacity: 10    # Burst for demo

ScalingPolicy:
  TargetValue: 70    # CPU target
  ScaleInCooldown: 60
  ScaleOutCooldown: 60
```

### Lambda Concurrency

```yaml
# Reserved concurrency for predictable scaling
ReservedConcurrency: 100
ProvisionedConcurrency: 2  # For demo (instant cold starts)
```

---

## Presentation Demo Script (May 4)

### 1. Architecture Overview (5 min)
- Show architecture diagram
- Explain Pi1 → AWS → Cloudflare flow

### 2. Live Demo (15 min)
```bash
# Show the app working
open https://guardquote.vandine.us

# Create a quote
curl -X POST https://api.guardquote.vandine.us/api/quotes \
  -H "Content-Type: application/json" \
  -d '{"event_type": "conference", "guards": 5}'

# Show auto-scaling
# Generate load with k6
k6 run load-test.js

# Show CloudWatch dashboard
open https://console.aws.amazon.com/cloudwatch

# Show Cloudflare analytics
open https://dash.cloudflare.com
```

### 3. Failover Demo (5 min)
```bash
# Kill AWS backend
aws ecs update-service --cluster guardquote --service backend --desired-count 0

# Show traffic failing over to Pi1
curl https://api.guardquote.vandine.us/health
# Response: {"origin": "pi1", "status": "healthy"}

# Bring AWS back
aws ecs update-service --cluster guardquote --service backend --desired-count 2
```

### 4. Q&A (5 min)

---

## Quick Reference Commands

### Deploy Stack
```bash
cd aws-infrastructure

# Deploy foundation
aws cloudformation create-stack \
  --stack-name guardquote-network \
  --template-body file://networking/01-vpc.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=prod \
               ParameterKey=EnableNatGateway,ParameterValue=false \
  --region us-west-2

# Check status
aws cloudformation describe-stacks --stack-name guardquote-network --query 'Stacks[0].StackStatus'
```

### Cloudflare Tunnel Setup
```bash
# On Pi1
ssh pi1
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/
cloudflared tunnel login
cloudflared tunnel create guardquote
```

### Teardown (May 10)
```bash
# Delete all stacks (reverse order)
./scripts/teardown.sh prod

# Or manually
aws cloudformation delete-stack --stack-name guardquote-prod
```

---

## Checklist Before Presentation

- [ ] All services running and healthy
- [ ] Failover tested and working
- [ ] Load test completed successfully
- [ ] Documentation complete
- [ ] Architecture diagrams updated
- [ ] Demo script practiced
- [ ] Backup slides ready (in case of live demo failure)
- [ ] Video recording of working demo (insurance)

---

## Resources

- [Cloudflare Student Program](https://www.cloudflare.com/students/)
- [GitHub Student Developer Pack](https://education.github.com/pack)
- [AWS Educate](https://aws.amazon.com/education/awseducate/)
- [Aurora Serverless v2 Pricing](https://aws.amazon.com/rds/aurora/pricing/)

---

*Plan Version: 1.0 - School Project Edition*
*Created: January 26, 2026*
*Presentation: May 4, 2026*
