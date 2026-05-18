# DriftGuard — Architecture Plan

## System Overview

DriftGuard is a **data observability + anomaly detection platform** for internal analyst teams.
Analysts upload CSV datasets daily; the system automatically detects anomalies, trends, and data quality issues.

---

## Architecture Diagram

```mermaid
graph TB
    subgraph Client["🖥️ Frontend (Next.js + TypeScript + Tailwind)"]
        LP[Landing Page]
        Auth[Auth / Login]
        Dashboard[Dataset Dashboard]
        Upload[CSV Upload]
        Details[Dataset Details]
        Alerts[Alert Center]
        Metrics[System Metrics]
    end

    subgraph API["⚙️ Backend (Node.js + Express)"]
        AuthR[/auth routes/]
        DatasetR[/dataset routes/]
        AnomalyR[/anomaly routes/]
        MetricsR[/metrics routes/]
        JobR[/job routes/]
        Services[Service Layer]
        DTOs[DTOs + Validators]
    end

    subgraph Queue["🔄 Queue Layer (BullMQ + Redis)"]
        BullMQ[BullMQ Queue]
        Worker[CSV Worker]
        JobStore[Job Status Store]
    end

    subgraph DB["🗄️ Database (PostgreSQL + Prisma)"]
        Users[(users)]
        Datasets[(datasets)]
        DataRows[(data_rows)]
        Anomalies[(anomalies)]
        Jobs[(processing_jobs)]
        Alerts2[(alerts)]
    end

    subgraph Detection["🧠 Anomaly Engine"]
        ZScore[Z-Score Detector]
        MADev[Moving Avg Deviation]
        Threshold[Threshold Checks]
        DupCheck[Duplicate Detector]
        NullCheck[Missing Value Detector]
    end

    Client -->|REST API calls| API
    API --> Services
    Services --> DB
    Services --> Queue
    Queue --> BullMQ
    BullMQ --> Worker
    Worker --> Detection
    Worker --> DB
    Detection -->|anomaly objects| DB
```

---

## Data Flow

```mermaid
sequenceDiagram
    participant Analyst
    participant Frontend
    participant API
    participant Redis/BullMQ
    participant Worker
    participant Postgres

    Analyst->>Frontend: Upload CSV file
    Frontend->>API: POST /api/datasets/upload
    API->>Postgres: Create dataset record (status: pending)
    API->>Redis/BullMQ: Enqueue "process-csv" job
    API-->>Frontend: Return { datasetId, jobId }

    Redis/BullMQ->>Worker: Dequeue job
    Worker->>Worker: Parse CSV rows
    Worker->>Postgres: INSERT data_rows
    Worker->>Worker: Run anomaly detection
    Worker->>Postgres: INSERT anomalies
    Worker->>Postgres: UPDATE dataset (status: completed)
    Worker-->>Redis/BullMQ: Job complete

    Frontend->>API: GET /api/jobs/:jobId (polling)
    API-->>Frontend: { status: "completed" }
    Frontend->>API: GET /api/datasets/:id
    API-->>Frontend: Dataset + rows + anomalies
```

---

## Database Schema

```mermaid
erDiagram
    users {
        uuid id PK
        string email
        string name
        string role
        string password_hash
        datetime created_at
    }

    datasets {
        uuid id PK
        string name
        string source_name
        int row_count
        string status
        float health_score
        uuid uploaded_by FK
        datetime created_at
        datetime updated_at
    }

    data_rows {
        uuid id PK
        uuid dataset_id FK
        json row_data
        int row_index
        datetime created_at
    }

    anomalies {
        uuid id PK
        uuid dataset_id FK
        string type
        string severity
        string message
        float confidence
        string column_name
        int row_index
        json metadata
        boolean resolved
        datetime detected_at
    }

    processing_jobs {
        uuid id PK
        uuid dataset_id FK
        string bull_job_id
        string status
        string error_message
        int progress
        datetime started_at
        datetime completed_at
    }

    alerts {
        uuid id PK
        uuid anomaly_id FK
        uuid dataset_id FK
        string title
        string severity
        boolean acknowledged
        datetime created_at
    }

    users ||--o{ datasets : uploads
    datasets ||--o{ data_rows : contains
    datasets ||--o{ anomalies : has
    datasets ||--o{ processing_jobs : tracked_by
    anomalies ||--o{ alerts : triggers
```

---

## Anomaly Detection Strategy

| Detector | Method | Trigger |
|----------|--------|---------|
| Z-Score Spike | `(value - mean) / stddev > 2.5` | Numeric columns |
| Moving Avg Drop | `value < 7-day-avg * 0.75` | Revenue/Orders |
| Missing Values | `null/empty cells` | All columns |
| Duplicate Rows | Hash row fingerprint | All rows |
| Threshold Breach | Configurable min/max | Per-column config |
| Growth Anomaly | `delta% > 25%` day-over-day | Time-series cols |

---

## Tech Stack Decisions

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Next.js 14 (App Router) | SSR, file-based routing, DX |
| Styling | Tailwind CSS v3 | Utility-first, rapid dev |
| Charts | Recharts | React-native, composable |
| State | Zustand + React Query | Lightweight, async-aware |
| Backend | Express + TypeScript | Familiar, flexible |
| ORM | Prisma | Type-safe, migrations |
| Queue | BullMQ | Production-grade Redis queue |
| Auth | JWT (demo) | Simple, stateless |
| DB | PostgreSQL | ACID, JSON support |
| Container | Docker + Compose | Reproducible, deploy-ready |

---

## API Contract

### Datasets
```
POST   /api/datasets/upload          - Upload CSV
GET    /api/datasets                  - List datasets (paginated)
GET    /api/datasets/:id              - Dataset detail + rows + anomalies
DELETE /api/datasets/:id              - Delete dataset
GET    /api/datasets/:id/export       - Export anomalies as CSV
```

### Anomalies
```
GET    /api/anomalies                 - List all anomalies (filter, sort, paginate)
GET    /api/anomalies/:id             - Anomaly detail
PATCH  /api/anomalies/:id/resolve     - Mark resolved
```

### Jobs
```
GET    /api/jobs/:id                  - Get job status
GET    /api/jobs                      - List recent jobs
```

### Metrics
```
GET    /api/metrics/summary           - Dashboard summary metrics
GET    /api/metrics/processing        - Processing time metrics
```

### Auth
```
POST   /api/auth/login                - Login
POST   /api/auth/logout               - Logout
GET    /api/auth/me                   - Current user
```
