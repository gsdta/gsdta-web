# GSDTA — Architecture Diagrams

This document provides high-level architecture diagrams aligned with the README (2025 stack) and the MVP requirements.
Two diagrams are included:

- Primary (2025 stack): Next.js static on GCS + Cloud CDN, Go API on Cloud Run, PostgreSQL on Cloud SQL, OIDC, CI/CD via
  GitHub Actions OIDC
- MVP alternative (requirements path): Firestore + Firebase Auth

## 1) Primary Architecture — GCS+CDN, Cloud Run, Cloud SQL (OIDC)

```mermaid
flowchart TB
  U[Users: Parents / Teachers / Admin]:::user

  %% Web path (static)
  U -->|HTTPS| DNSW[DNS: dev.gsdta.org / www.gsdta.org]:::dns
  DNSW --> LB[HTTPS Load Balancer + Cloud CDN]:::edge
  LB --> BB[Backend Bucket]:::edge
  BB --> GCSW[(GCS Bucket: Web)]:::storage

  %% API path
  U -->|HTTPS| DNSA[DNS: api.dev.gsdta.org / api.gsdta.org]:::dns
  DNSA --> CRDM[Cloud Run Domain Mapping]:::edge
  CRDM --> API[Cloud Run: gsdta-api]:::compute

  %% API dependencies
  API -->|read secrets| SM[Secret Manager]:::mgmt
  API -->|VPC egress| SVPC[Serverless VPC Access]:::network
  SVPC --> PSC[Private Service Connect]:::network
  PSC --> SQL[(Cloud SQL: PostgreSQL)]:::db
  API -.->|email| SendGrid[SendGrid API]:::ext

  %% Observability
  API --> MON[Cloud Logging / Monitoring]:::obs
  LB --> MON

  %% Backups
  SCH[Cloud Scheduler]:::mgmt --> JOB[Cloud Run Job: pg_dump]:::compute --> BUP[(GCS Bucket: DB Backups)]:::storage

  %% CI/CD
  subgraph CICD["CI/CD"]
    GH[GitHub Actions]:::cicd --> WIF[Workload Identity Federation]:::cicd --> SA[sa-deployer]:::iam
    SA -->|push image| AR[Artifact Registry]:::mgmt
    SA -->|deploy| API
    SA -->|sync web| GCSW
    SA -->|CDN invalidate| LB
  end

  %% Grouping (visual)
  subgraph GCP["GCP Project (dev/prod)"]
    LB
    BB
    GCSW
    API
    SM
    SVPC
    PSC
    SQL
    MON
    SCH
    JOB
    BUP
    AR
  end

  classDef user fill:#fff2df,stroke:#333333,stroke-width:1px;
  classDef dns fill:#eeeeff,stroke:#444466;
  classDef edge fill:#e9f5ff,stroke:#3399ff;
  classDef compute fill:#fef6e4,stroke:#cc7777;
  classDef db fill:#eeffee,stroke:#228822;
  classDef storage fill:#f4f8ff,stroke:#5588aa;
  classDef network fill:#f1fff1,stroke:#338833;
  classDef mgmt fill:#f7f7f7,stroke:#777777;
  classDef obs fill:#fff7e6,stroke:#bb8800;
  classDef cicd fill:#f0f5ff,stroke:#5577ff;
  classDef iam fill:#ffffff,stroke:#444444,stroke-dasharray: 3 2;
  classDef ext fill:#ffffff,stroke:#999999,stroke-dasharray: 5 3;
```

### Data/Control Flows

- Web: Browser → DNS → HTTPS LB + CDN → Backend Bucket → GCS Web Bucket
- API: Browser/UI → DNS api → Cloud Run → Secret Manager + Cloud SQL via VPC (private IP)
- CI/CD: GitHub Actions (OIDC) → impersonate sa-deployer → push image (Artifact Registry), deploy API, sync web,
  invalidate CDN
- Backups: Cloud Scheduler → Cloud Run Job → pg_dump → GCS backups bucket
- Observability: Logs/metrics from LB and API → Cloud Logging/Monitoring

## 2) MVP Alternative — Firestore + Firebase Auth

```mermaid
flowchart TB
  U[Users: Parents / Teachers / Admin]:::user

  %% Web path (static)
  U -->|HTTPS| DNSW[DNS: dev.gsdta.org / www.gsdta.org]:::dns
  DNSW --> LB[HTTPS Load Balancer + Cloud CDN]:::edge
  LB --> BB[Backend Bucket]:::edge
  BB --> GCSW[(GCS Bucket: Web)]:::storage

  %% API path with Firebase Auth & Firestore
  U -->|HTTPS| DNSA[DNS: api.dev.gsdta.org / api.gsdta.org]:::dns
  DNSA --> CRDM[Cloud Run Domain Mapping]:::edge
  CRDM --> API[Cloud Run: gsdta-api]:::compute
  API -->|verify ID token| FAuth[Firebase Auth]:::mgmt
  API --> FStore[(Firestore: Native Mode)]:::db
  API --> Cons[(GCS Bucket: Consent Docs)]:::storage
  API --> Ex[(GCS Bucket: Exports)]:::storage

  %% Backups (Firestore exports)
  SCH[Cloud Scheduler]:::mgmt --> FSExp[Cloud Run Job/Function: Firestore Export]:::compute --> Ex

  %% Observability
  API --> MON[Cloud Logging / Monitoring]:::obs
  LB --> MON

  subgraph GCP["GCP Project (dev/prod)"]
    LB
    BB
    GCSW
    API
    FAuth
    FStore
    Cons
    Ex
    MON
    SCH
    FSExp
  end

  classDef user fill:#fff2df,stroke:#333333,stroke-width:1px;
  classDef dns fill:#eeeeff,stroke:#444466;
  classDef edge fill:#e9f5ff,stroke:#3399ff;
  classDef compute fill:#fef6e4,stroke:#cc7777;
  classDef db fill:#eeffee,stroke:#228822;
  classDef storage fill:#f4f8ff,stroke:#5588aa;
  classDef mgmt fill:#f7f7f7,stroke:#777777;
  classDef obs fill:#fff7e6,stroke:#bb8800;
```

## Legend

- Edge: DNS, HTTPS Load Balancer, Cloud CDN, domain mappings
- Compute: Cloud Run services/jobs
- Storage: GCS buckets (web, backups, consent, exports)
- DB: Cloud SQL (Postgres) or Firestore (alt)
- Network: Serverless VPC Access and Private Service Connect
- Management: Secret Manager, Scheduler, Artifact Registry
- CI/CD: GitHub Actions with Workload Identity Federation and a deploy service account
- External: SendGrid

References

- See `infra.md`, `ui.md`, and `api-db.md` in this folder for detailed steps and acceptance criteria.
