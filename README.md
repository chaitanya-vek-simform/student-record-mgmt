# Automated CI/CD for Web Application Deployment

A DevSecOps CI/CD pipeline that automates building, testing, security scanning, and deploying a full-stack web application to the cloud using GitHub Actions.

## Pipeline Overview

```
Push / PR → Detect Paths → Build & Test → Security Scan → Docker Build → Cloud Deploy
```

The pipeline is defined in `.github/workflows/ci-cd.yml` and runs on every push or pull request to `main`. It uses **path-based filtering** to trigger only relevant jobs — frontend changes build only the frontend, backend changes build only the backend.

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
│                                                                 │
│  ┌──────────────┐                                               │
│  │ Detect Paths │──► dorny/paths-filter@v3                      │
│  └──────┬───────┘                                               │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│ ┌──────┐ ┌──────────────────────────────────────────────────┐   │
│ │Front │ │ Backend Pipeline                                  │   │
│ │ end  │ │                                                   │   │
│ │      │ │ npm test (32) → SonarCloud → Snyk → Docker Build │   │
│ │ npm  │ │                    → OWASP ZAP + Trivy Scan      │   │
│ │build │ │                    → Docker Push → Azure Deploy   │   │
│ │  +   │ │                                                   │   │
│ │deploy│ └──────────────────────────────────────────────────┘   │
│ │  to  │                                                        │
│ │ CF   │  Artifacts: snyk-report.json, trivy-report.sarif,     │
│ │Pages │              zap-report.html (14-day retention)        │
│ └──────┘                                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Backend | Node.js 20, Express 5 |
| Database | Azure SQL Server |
| Containerization | Docker (Alpine-based) |
| CI/CD | GitHub Actions |
| Frontend Hosting | Cloudflare Pages |
| Backend Hosting | Azure Container Apps |
| Container Registry | Docker Hub |

## Security Tools (Shift-Left DevSecOps)

| Tool | Type | What It Scans | Output |
|---|---|---|---|
| SonarCloud | SAST | Source code | Cloud dashboard |
| Snyk | SCA | npm dependencies | `snyk-report.json` |
| Trivy | Container | Docker image layers | `trivy-report.sarif` |
| OWASP ZAP | DAST | Running application | `zap-report.html` |

All security tools run in **report-only mode** (`continue-on-error: true`). Reports are uploaded as GitHub Actions artifacts with a 14-day retention period.

## Automated Testing

32 tests across 4 suites using **Jest** and **Supertest**:

| Suite | Tests | Coverage |
|---|---|---|
| Health Check | 2 | `/health` endpoint |
| Authentication | 10 | Register, login, JWT, profile |
| Middleware | 7 | Token validation, role-based access |
| Student CRUD | 13 | All CRUD operations with auth |

Tests must pass before security scans and deployment proceed.

## Repository Structure

```
.
├── .github/workflows/
│   ├── ci-cd.yml                 # Main DevSecOps pipeline
│   └── artifact-cleanup.yml      # Daily artifact cleanup (02:00 UTC)
│
├── frontend/                     # React 18 + Vite 5 SPA
│   ├── src/
│   └── package.json
│
├── backend/                      # Node.js 20 + Express 5 API
│   ├── src/
│   │   ├── config/               # Database connection
│   │   ├── controllers/          # Route handlers
│   │   ├── middleware/            # Auth and role middleware
│   │   ├── models/               # Database queries
│   │   └── routes/               # API route definitions
│   ├── __tests__/                # 32 Jest test files
│   ├── Dockerfile                # Alpine-based container image
│   ├── app.js                    # Express app config
│   ├── server.js                 # Entry point
│   └── package.json
│
├── database_setup.sql            # Azure SQL schema + seed data
├── .dockerignore                 # Docker build exclusions
└── README.md                     # This file
```

## Pipeline Configuration

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `AZURE_CREDENTIALS` | Azure Service Principal JSON |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages deployment |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |
| `DOCKER_USERNAME` | Docker Hub authentication |
| `DOCKER_PASSWORD` | Docker Hub authentication |
| `SNYK_TOKEN` | Snyk dependency scanning |
| `SONAR_TOKEN` | SonarCloud code analysis |

### Required GitHub Variables

| Variable | Purpose |
|---|---|
| `ACA_APP_NAME` | Azure Container App name |
| `ACA_RESOURCE_GROUP` | Azure Resource Group |
| `SONAR_ORGANIZATION` | SonarCloud organization |
| `SONAR_PROJECT_KEY` | SonarCloud project key |
| `VITE_API_URL` | Backend API base URL |

> **Note:** The pipeline uses feature flags — each integration checks if its secret exists before running. Missing secrets are skipped gracefully.

## Path-Based Filtering

| Files Changed | Frontend Job | Backend Job |
|---|---|---|
| `frontend/**` only | ✅ Runs | ❌ Skipped |
| `backend/**` only | ❌ Skipped | ✅ Runs |
| Both directories | ✅ Runs | ✅ Runs |
| Other files | ❌ Skipped | ❌ Skipped |

## Local Development

### Backend

```bash
cd backend
npm install
npm test          # Run 32 tests
npm start         # Start server on port 5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # Dev server on port 5173
npm run build     # Production build
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for details.

## License

ISC
