# GuardQuote AWS Infrastructure

CloudFormation templates for deploying GuardQuote to AWS with enterprise-grade infrastructure.

## 📁 Directory Structure

```
aws-infrastructure/
├── networking/
│   ├── 01-vpc.yaml                    # VPC, subnets, NAT Gateway, flow logs
│   ├── 02-security-groups.yaml        # Security groups for all components
│   └── 03-vpc-endpoints.yaml          # Private endpoints for AWS services
├── compute/
│   └── 04-alb.yaml                    # Application Load Balancer
├── cdn/
│   └── 05-cloudfront.yaml             # CloudFront CDN distribution
├── api/
│   ├── 06-api-gateway-rest.yaml       # REST API Gateway
│   └── 07-api-gateway-http.yaml       # HTTP API Gateway (v2)
├── database/
│   ├── 08-rds-postgresql.yaml         # RDS PostgreSQL
│   ├── 09-aurora-serverless.yaml      # Aurora Serverless v2
│   ├── 10-elasticache-redis.yaml      # ElastiCache Redis
│   └── 11-dynamodb.yaml               # DynamoDB tables
├── identity/
│   ├── 12-cognito.yaml                # Cognito User Pool & Identity Pool
│   ├── 13-directory-service.yaml      # AWS Managed Microsoft AD
│   └── 14-iam-identity-center.yaml    # IAM Identity Center (SSO)
├── security/
│   ├── 15-bastion-host.yaml           # Bastion host with SSM
│   ├── 16-waf.yaml                    # AWS WAF rules
│   └── 17-secrets-manager.yaml        # Secrets management
├── monitoring/
│   ├── 19-cloudwatch-monitoring.yaml  # Dashboards, alarms, logs
│   └── 20-xray-tracing.yaml           # Distributed tracing
├── automation/
│   └── 18-network-health-check.yaml   # Lambda health checks & host discovery
├── master-stack.yaml                   # Orchestration stack
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate credentials
- S3 bucket for storing templates
- ACM certificate (optional, for HTTPS)

### Deploy Individual Stack

```bash
# Deploy VPC
aws cloudformation create-stack \
  --stack-name guardquote-dev-vpc \
  --template-body file://networking/01-vpc.yaml \
  --parameters \
    ParameterKey=EnvironmentName,ParameterValue=dev \
    ParameterKey=EnableNatGateway,ParameterValue=true \
  --capabilities CAPABILITY_IAM

# Check status
aws cloudformation describe-stacks --stack-name guardquote-dev-vpc
```

### Deploy Full Infrastructure

1. **Upload templates to S3:**
```bash
aws s3 sync . s3://guardquote-cloudformation-templates/ --exclude "README.md"
```

2. **Deploy master stack:**
```bash
aws cloudformation create-stack \
  --stack-name guardquote-prod \
  --template-body file://master-stack.yaml \
  --parameters \
    ParameterKey=EnvironmentName,ParameterValue=prod \
    ParameterKey=DBMasterPassword,ParameterValue=YourSecurePassword123! \
    ParameterKey=RedisAuthToken,ParameterValue=YourRedisToken12345678 \
    ParameterKey=AlertEmail,ParameterValue=alerts@guardquote.com \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND
```

## 📋 Template Reference

### 1. VPC (01-vpc.yaml)

Multi-AZ VPC with:
- Public, private, and database subnets
- NAT Gateway (optional)
- VPC Flow Logs
- Internet Gateway

**Key Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| VpcCIDR | 10.0.0.0/16 | VPC CIDR block |
| EnableNatGateway | true | Enable NAT for private subnets |
| EnableVPCFlowLogs | true | Enable network traffic logging |

### 2. Security Groups (02-security-groups.yaml)

Preconfigured security groups for:
- ALB (HTTP/HTTPS from anywhere)
- App servers (from ALB only)
- Database (from app/bastion only)
- Bastion (SSH from allowed IPs)
- Lambda, ECS, VPN

### 3. ALB (04-alb.yaml)

Application Load Balancer with:
- HTTPS termination
- Path-based routing (/api/*, /ml/*)
- Target groups for backend, ML engine, frontend
- Access logging

### 4. CloudFront (05-cloudfront.yaml)

CDN distribution with:
- S3 origin for static assets
- ALB origin for API
- Cache policies
- Security headers
- Origin Access Control

### 5. API Gateway

**REST API (06-api-gateway-rest.yaml):**
- Lambda proxy integration
- API Keys & Usage Plans
- Throttling
- CORS support

**HTTP API (07-api-gateway-http.yaml):**
- JWT authorization
- Lower latency
- Auto-deploy stages

### 6. RDS PostgreSQL (08-rds-postgresql.yaml)

Features:
- Multi-AZ deployment
- Encrypted storage (KMS)
- Performance Insights
- Enhanced Monitoring
- Automated backups
- Read replica support
- Secrets Manager integration

### 7. Aurora Serverless (09-aurora-serverless.yaml)

Serverless v2 with:
- Auto-scaling (0.5 - 256 ACUs)
- Data API support
- Global database ready

### 8. ElastiCache Redis (10-elasticache-redis.yaml)

Redis cluster with:
- Replication group
- AUTH token
- TLS encryption
- Automatic failover

### 9. DynamoDB (11-dynamodb.yaml)

Tables for:
- Quotes (main data)
- Sessions (auth)
- Audit log
- ML predictions cache

Features:
- On-demand or provisioned capacity
- Auto-scaling
- Point-in-time recovery
- Streams

### 10. Cognito (12-cognito.yaml)

User Pool with:
- MFA (TOTP)
- Custom attributes
- User groups
- Resource server (OAuth scopes)
- Identity Pool for AWS credentials

### 11. Directory Service (13-directory-service.yaml)

AWS Managed Microsoft AD for:
- Enterprise SSO
- LDAP integration
- Domain join for EC2

### 12. Bastion Host (15-bastion-host.yaml)

Secure jump server with:
- SSM Session Manager
- SSH key pair (optional)
- Command logging
- Idle timeout
- CloudWatch Logs

### 13. WAF (16-waf.yaml)

Web Application Firewall with:
- Rate limiting
- AWS Managed Rules (SQLi, XSS, common attacks)
- IP allowlist/blocklist
- Geo-blocking
- Bot control
- Detailed logging

### 14. Network Health Check (18-network-health-check.yaml)

Automated monitoring with:
- Endpoint health checks (Lambda)
- Host discovery
- CloudWatch metrics
- SNS/Slack/PagerDuty alerts

### 15. CloudWatch Monitoring (19-cloudwatch-monitoring.yaml)

Observability with:
- Custom dashboards
- Log groups with retention
- Metric filters
- Alarms
- Anomaly detection
- Insights queries

### 16. X-Ray Tracing (20-xray-tracing.yaml)

Distributed tracing with:
- Sampling rules
- Service groups
- Insights
- Dashboard

## 🔐 Security Best Practices

1. **All secrets in Secrets Manager** - Never hardcode credentials
2. **Encryption everywhere** - KMS keys for RDS, Redis, DynamoDB, S3
3. **Least privilege IAM** - Scoped policies per service
4. **Network isolation** - Private subnets for databases
5. **WAF enabled** - Protection against OWASP Top 10
6. **VPC Flow Logs** - Network traffic visibility
7. **CloudTrail** - API audit logging

## 📊 Estimated Costs (us-east-1, Production)

| Service | Monthly Estimate |
|---------|-----------------|
| VPC (NAT Gateway) | ~$32 |
| ALB | ~$22 + data |
| RDS (db.r5.large, Multi-AZ) | ~$350 |
| ElastiCache (cache.r6g.large, 2 nodes) | ~$200 |
| CloudFront | Pay per use |
| WAF | ~$5 + rules |
| Lambda | Pay per use |
| **Total Base** | **~$600/month** |

*Costs vary by usage, region, and configuration.*

## 🔄 CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Deploy to AWS
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    aws cloudformation deploy \
      --template-file aws-infrastructure/master-stack.yaml \
      --stack-name guardquote-${{ github.ref_name }} \
      --parameter-overrides \
        EnvironmentName=${{ github.ref_name }} \
        DBMasterPassword=${{ secrets.DB_PASSWORD }} \
      --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

## 🆘 Troubleshooting

### Stack Creation Failed
```bash
# View events
aws cloudformation describe-stack-events --stack-name <stack-name>

# View resources
aws cloudformation list-stack-resources --stack-name <stack-name>
```

### Network Connectivity Issues
1. Check security group rules
2. Verify route tables
3. Check NAT Gateway status
4. Review VPC Flow Logs

### Database Connection Issues
1. Verify security group allows traffic
2. Check credentials in Secrets Manager
3. Confirm database is in correct subnet

## 📚 Related Documentation

- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Security Best Practices](https://aws.amazon.com/security/)

## 📝 License

This infrastructure code is part of the GuardQuote project.
