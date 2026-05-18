# DriftGuard 🛡️

**Production-quality internal analytics platform for data observability and anomaly detection.**

Built for analyst teams at data-intensive companies — DriftGuard ingests CSV datasets, runs statistical anomaly detection, and surfaces actionable alerts with confidence scores.

> Built to feel like Datadog + Retool — for your data pipelines.

---

## Screenshots

| Dashboard | Dataset Detail | Alert Center |
|-----------|---------------|--------------|
| KPI cards, health trend, severity breakdown | Line charts + 7-day moving average overlay | Severity filter tabs + resolution workflow |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  Login → Dashboard → Datasets → Alerts → Metrics        │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API (Axios + React Query)
┌──────────────────────────▼──────────────────────────────┐
│              Backend API (Express + TypeScript)          │
│  /auth  /datasets  /anomalies  /metrics  /jobs           │
│  Service Layer + DTOs + JWT Middleware                   │
└──────┬──────────────────────────┬───────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│ PostgreSQL  │          │ Redis + BullMQ  │
│  (Prisma)   │          │  CSV Queue      │
└─────────────┘          └────────┬────────┘
                                  │
                        ┌─────────▼─────────┐
                        │    CSV Worker      │
                        │  Parse → Detect    │
                        │  → Store → Alert   │
                        └───────────────────┘
```

---

## Features

### Core
- 📊 **Dataset Dashboard** — health scores, trend charts, anomaly counts
- 📁 **CSV Upload** — drag-drop interface, demo CSV generator
- 🔍 **Anomaly Detection Engine** — Z-score, moving average deviation, missing values, duplicates
- 🚨 **Alert Center** — filter by severity, dataset, date; resolve workflows
- 📈 **System Metrics** — processing time charts, job status breakdown
- ⚙️ **Background Jobs** — BullMQ worker with real-time progress

### Anomaly Detection Methods
| Method | Description |
|--------|-------------|
| Z-Score | Detects values >2.5σ from mean |
| Moving Average | 7-day window deviation >25% |
| Missing Values | Null/empty cell detection |
| Duplicate Rows | JSON fingerprint hashing |
| Growth Anomaly | Day-over-day Δ% >30% |

### Confidence Scores
Every anomaly gets a confidence score (0.0–1.0) based on statistical strength.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 + custom design system |
| Charts | Recharts |
| State | React Query + Zustand |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Queue | BullMQ |
| Cache/Queue | Redis |
| Database | PostgreSQL 15 |
| Auth | JWT (demo) |
| Container | Docker + Docker Compose |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15
- Redis 7

### 1. Clone & Install

```bash
git clone <repo>
cd driftguard

# Install backend
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit DATABASE_URL and REDIS_URL

# Frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > frontend/.env.local
```

### 3. Database Setup

```bash
cd backend
npx prisma db push       # Apply schema
npx prisma generate      # Generate client
npm run db:seed          # Seed demo data
```

### 4. Start Services

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Visit: http://localhost:3000  
Login: `analyst@driftguard.io` / `demo123`

---

## Docker (Production)

```bash
docker compose up -d
```

Then run migrations inside the backend container:
```bash
docker exec driftguard_backend npx prisma db push
docker exec driftguard_backend npm run db:seed
```

---

## API Reference

```
POST   /api/auth/login              Login
GET    /api/auth/me                 Current user

GET    /api/datasets                List datasets (paginated)
POST   /api/datasets/upload         Upload CSV
GET    /api/datasets/:id            Dataset detail + rows + anomalies
DELETE /api/datasets/:id            Delete dataset
GET    /api/datasets/:id/export     Export anomalies CSV

GET    /api/anomalies               List anomalies (filter: severity, dataset, date)
PATCH  /api/anomalies/:id/resolve   Resolve anomaly
GET    /api/anomalies/stats         Severity breakdown

GET    /api/metrics/summary         Dashboard KPIs
GET    /api/metrics/processing      Job processing history

GET    /api/jobs                    Recent jobs
GET    /api/jobs/:id                Job status (with live BullMQ progress)
```

---

## Project Structure

```
driftguard/
├── frontend/
│   ├── app/
│   │   ├── dashboard/page.tsx      KPI + trend + alerts
│   │   ├── datasets/page.tsx       List + search + sort
│   │   ├── datasets/[id]/page.tsx  Charts + data table + anomalies
│   │   ├── alerts/page.tsx         Alert center + filtering
│   │   ├── metrics/page.tsx        Processing metrics
│   │   └── login/page.tsx          Auth
│   ├── components/
│   │   ├── layout/                 Sidebar, AppShell
│   │   ├── ui/                     Badges, skeletons, charts
│   │   └── datasets/               UploadModal
│   └── lib/
│       ├── api.ts                  Typed Axios client
│       └── utils.ts                Formatters, helpers
│
├── backend/
│   └── src/
│       ├── routes/                 auth, dataset, anomaly, metrics, job
│       ├── services/               dataset, anomaly, metrics, auth
│       ├── workers/csv.worker.ts   BullMQ job processor
│       ├── detection/index.ts      Z-score, MA, missing, dup, growth
│       ├── middleware/             JWT auth
│       ├── dto/types.ts            TypeScript interfaces
│       └── prisma/                 Schema + seed
│
└── docker-compose.yml
```

---

## Scaling Discussion

**Current architecture** handles moderate load well. For higher scale:

1. **Horizontal API scaling** — stateless Express servers behind load balancer (JWT-based, no sessions)
2. **Worker scaling** — run multiple CSV workers (`concurrency: N` in BullMQ)
3. **Database** — read replicas for dashboard queries, connection pooling via PgBouncer
4. **Queue** — Redis Cluster for high-throughput job queuing
5. **File storage** — migrate from local disk to S3/GCS for CSV uploads
6. **Caching** — Redis cache for dashboard metrics (invalidate on new uploads)
7. **Monitoring** — instrument with Prometheus/Grafana for job queue depth metrics

---

## Future Improvements

- [ ] Webhook notifications (Slack/PagerDuty on HIGH anomalies)
- [ ] Configurable detection thresholds per dataset
- [ ] Scheduled dataset ingestion (cron-based pipelines)
- [ ] Column-level trend alerts
- [ ] Multi-tenant workspace support
- [ ] Anomaly ML models (isolation forest, LSTM)
- [ ] Data lineage tracking

---

## License

MIT — Built as a portfolio/demo project.
