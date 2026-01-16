# GitHub Actions Skill

Use this skill to set up and manage CI/CD workflows for GuardQuote.

## Pi1 Services Available

| Service | Port | Use in CI/CD |
|---------|------|--------------|
| PostgreSQL | 5432 | Integration tests, migrations |
| Redis | 6379 | Cache tests, session tests |
| PgBouncer | 6432 | Connection pool tests |
| Prometheus | 9090 | Push deployment metrics |
| Grafana | 3000 | Dashboard annotations |
| Alertmanager | 9093 | Deployment notifications |
| Loki | 3100 | Log aggregation from CI |
| Node Exporter | 9100 | Resource monitoring |

## Network Requirements

For GitHub Actions to reach Pi1:
1. **Self-hosted runner** on local network (recommended)
2. Or **Tailscale/WireGuard** tunnel
3. Or **Cloudflare Tunnel** for specific services

## Recommended Workflows

### 1. PR Validation (`pr-check.yml`)
Runs on every PR to validate code quality.

```yaml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: |
          cd backend && bun install
          cd ../frontend && bun install

      - name: Lint Backend
        run: cd backend && bun run lint

      - name: Lint Frontend
        run: cd frontend && bun run lint

      - name: Type Check Backend
        run: cd backend && bun run typecheck

      - name: Type Check Frontend
        run: cd frontend && bun run typecheck

  test-ml-engine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install ML dependencies
        run: |
          cd ml-engine
          pip install -r requirements.txt
          pip install pytest pytest-asyncio

      - name: Run ML tests
        run: cd ml-engine && pytest tests/ -v
```

### 2. Integration Tests (`integration.yml`)
Uses self-hosted runner to test against Pi1 services.

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  integration:
    runs-on: self-hosted  # Runner on local network
    env:
      DATABASE_URL: postgresql://guardquote:${{ secrets.PI1_DB_PASSWORD }}@192.168.2.70:5432/guardquote_test
      REDIS_URL: redis://:${{ secrets.PI1_REDIS_PASSWORD }}@192.168.2.70:6379/1

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Verify Pi1 connectivity
        run: |
          nc -zv 192.168.2.70 5432 || exit 1
          nc -zv 192.168.2.70 6379 || exit 1

      - name: Run database migrations
        run: cd backend && bun run db:migrate

      - name: Seed test data
        run: |
          psql $DATABASE_URL -f ml-engine/data/seed_2026.sql

      - name: Run integration tests
        run: cd backend && bun run test:integration

      - name: Cleanup test database
        if: always()
        run: |
          psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### 3. ML Model Training (`train-ml.yml`)
Weekly automated retraining with metrics push to Prometheus.

```yaml
name: ML Model Training

on:
  schedule:
    - cron: '0 3 * * 0'  # Weekly Sunday 3am
  workflow_dispatch:
    inputs:
      record_count:
        description: 'Training records to generate'
        default: '1100'

jobs:
  train:
    runs-on: self-hosted
    env:
      DB_HOST: 192.168.2.70
      DB_PORT: 5432
      DB_USER: guardquote
      DB_PASSWORD: ${{ secrets.PI1_DB_PASSWORD }}
      DB_NAME: guardquote

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd ml-engine
          pip install -r requirements.txt

      - name: Generate training data
        run: |
          cd ml-engine
          RECORD_COUNT=${{ github.event.inputs.record_count || '1100' }} \
          python scripts/generate_training_data_2026.py

      - name: Train models
        id: train
        run: |
          cd ml-engine
          python scripts/train_models.py 2>&1 | tee training.log
          # Extract R2 score
          R2=$(grep "R² Score" training.log | awk '{print $NF}')
          echo "r2_score=$R2" >> $GITHUB_OUTPUT

      - name: Push metrics to Prometheus
        run: |
          curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_ml_training \
            -d "guardquote_model_r2_score ${{ steps.train.outputs.r2_score }}"
          curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_ml_training \
            -d "guardquote_model_trained_timestamp $(date +%s)"

      - name: Upload model artifact
        uses: actions/upload-artifact@v4
        with:
          name: trained-models
          path: ml-engine/models/trained/guardquote_models.pkl

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST http://192.168.2.70:9093/api/v1/alerts \
            -H "Content-Type: application/json" \
            -d '[{"labels":{"alertname":"MLTrainingFailed","severity":"warning"}}]'
```

### 4. Deploy to Production (`deploy.yml`)
Full deployment with Grafana annotations and health checks.

```yaml
name: Deploy

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: self-hosted
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Create Grafana annotation (deploy start)
        run: |
          curl -X POST http://192.168.2.70:3000/api/annotations \
            -H "Authorization: Bearer ${{ secrets.GRAFANA_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "dashboardUID": "guardquote",
              "text": "Deploy started: ${{ github.ref_name }}",
              "tags": ["deploy", "start"]
            }'

      - name: Run database migrations
        run: |
          cd backend
          bun run db:migrate

      - name: Build backend
        run: |
          cd backend
          bun run build

      - name: Build frontend
        run: |
          cd frontend
          bun run build

      - name: Deploy backend
        run: |
          # Example: rsync to server or docker push
          echo "Deploying backend..."

      - name: Deploy frontend
        run: |
          # Example: Upload to CDN or static host
          echo "Deploying frontend..."

      - name: Deploy ML engine
        run: |
          cd ml-engine
          # Restart ML service
          echo "Deploying ML engine..."

      - name: Health checks
        run: |
          # Backend health
          curl -f http://localhost:3000/health || exit 1
          # ML engine health
          curl -f http://localhost:8000/health || exit 1

      - name: Create Grafana annotation (deploy complete)
        run: |
          curl -X POST http://192.168.2.70:3000/api/annotations \
            -H "Authorization: Bearer ${{ secrets.GRAFANA_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "dashboardUID": "guardquote",
              "text": "Deploy complete: ${{ github.ref_name }}",
              "tags": ["deploy", "complete"]
            }'

      - name: Push deployment metric
        run: |
          curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_deploy \
            -d "guardquote_deployment_timestamp $(date +%s)"
          curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_deploy \
            -d "guardquote_deployment_success 1"
```

### 5. Database Backup (`db-backup.yml`)
Daily backup with retention management.

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily 2am
  workflow_dispatch:

jobs:
  backup:
    runs-on: self-hosted

    steps:
      - name: Create backup
        run: |
          BACKUP_FILE="guardquote_$(date +%Y%m%d_%H%M%S).sql.gz"
          ssh pi1 "pg_dump -U guardquote guardquote | gzip > /tmp/$BACKUP_FILE"
          scp pi1:/tmp/$BACKUP_FILE ./backups/

      - name: Upload to cloud storage
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backups/
          retention-days: 30

      - name: Cleanup old backups on Pi1
        run: |
          ssh pi1 "find /tmp -name 'guardquote_*.sql.gz' -mtime +7 -delete"

      - name: Push backup metric
        run: |
          curl -X POST http://192.168.2.70:9091/metrics/job/guardquote_backup \
            -d "guardquote_backup_timestamp $(date +%s)"
```

### 6. Security Scan (`security.yml`)
Weekly security scanning with alerts.

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 4 * * 1'  # Weekly Monday 4am
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Dependency audit (Bun)
        run: |
          cd backend && bun audit
          cd ../frontend && bun audit

      - name: Python dependency check
        run: |
          cd ml-engine
          pip install safety
          safety check -r requirements.txt
```

## Self-Hosted Runner Setup

Install runner on a machine that can reach Pi1:

```bash
# On Mac/Linux machine on same network as Pi1
mkdir actions-runner && cd actions-runner
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.xxx/actions-runner-xxx.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/YOUR_ORG/guard-quote --token YOUR_TOKEN
./run.sh
```

## Required Secrets

Add these secrets in GitHub repo settings:

| Secret | Description |
|--------|-------------|
| `PI1_DB_PASSWORD` | PostgreSQL password: `WPU8bj3nbwFyZFEtHZQz` |
| `PI1_REDIS_PASSWORD` | Redis password |
| `GRAFANA_API_KEY` | Grafana API key for annotations |
| `SSH_PRIVATE_KEY` | SSH key for Pi1 access |

## Monitoring Dashboard

Create Grafana dashboard for CI/CD metrics:

```json
{
  "panels": [
    {
      "title": "Deployments",
      "type": "stat",
      "targets": [{"expr": "guardquote_deployment_success"}]
    },
    {
      "title": "ML Model R² Score",
      "type": "gauge",
      "targets": [{"expr": "guardquote_model_r2_score"}]
    },
    {
      "title": "Last Backup",
      "type": "stat",
      "targets": [{"expr": "time() - guardquote_backup_timestamp"}]
    }
  ]
}
```

---

*Last updated: January 15, 2026*
