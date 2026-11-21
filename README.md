# CloudPilot

Autonomous Multi-Cloud Governance, FinOps, and AI Workload Observability Platform.

CloudPilot unifies multi-cloud infrastructure (AWS, GCP, Azure), foundation models (Amazon Bedrock, AWS SageMaker, Google Vertex AI, Azure OpenAI), continuous compliance guardrails (CIS Benchmarks, SOC 2, HIPAA, AI Safety), and FinOps cost telemetry into a single, high-performance operational cockpit.

---

## Key Highlights

- **100% Database-Backed Telemetry**: Every KPI, spend metric, inventory record, policy finding, and Copilot insight is queried directly from PostgreSQL. Zero hardcoded mock arrays or static fixture fallbacks in frontend or backend.
- **Strict Multi-Tenant Workspace Isolation**: Full workspace tenancy (`organisation_id` foreign keys, React Query cache isolation, scoped RBAC, and clean zero-states for newly created workspaces).
- **Pure OIDC & Host-Only Cookie Security**: Enterprise Authorization Code Flow with PKCE, secure Host-Only `HttpOnly` sessions, and zero sensitive JWTs stored in `localStorage`.
- **Modular Monolith Architecture**: Go 1.26 HTTP API (`cmd/api`), autonomous background discovery worker (`cmd/worker`), embedded database migrations, and React 19 frontend with TanStack Query and TanStack Router.

---

## Documentation Library (`docs/`)

Explore comprehensive documentation covering all technical dimensions of CloudPilot:

- **[Architecture & System Design](docs/architecture.md)**: Modular monolith structure, background worker loop, React 19 client, and cross-origin security model.
- **[Database Schema & Multi-Tenancy](docs/database.md)**: PostgreSQL schema, entity relationships (ERD), embedded migrations (`001`-`008`), and workspace isolation.
- **[API Specification & Endpoints](docs/api.md)**: Comprehensive REST API reference across all 9 domain modules with request/response schemas.
- **[Discovery & FinOps Engine](docs/discovery-and-finops.md)**: Multi-cloud scanners (AWS, GCP, Azure), 30-day time-series cost aggregation, and budget alert mechanisms.
- **[Security & Policy Guardrails](docs/security-and-policies.md)**: CIS Benchmarks, SOC 2, HIPAA, AI Safety rules, finding resolution lifecycle, and OIDC PKCE security.
- **[AI Workloads & Copilot](docs/ai-workloads-and-copilot.md)**: Foundation models observability (Bedrock, SageMaker, Vertex AI, Azure OpenAI), token velocity metrics, and pluggable AI Copilot.
- **[Deployment & Operations Guide](docs/deployment-and-operations.md)**: Docker Compose setup, environment variable reference, operational runbooks, and health probes.

---

## High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 19 + TypeScript + Vite + Tailwind CSS)"]
        UI_Dash["Overview Dashboard (/dashboard)"]
        UI_Inv["Cloud Inventory (/inventory)"]
        UI_AI["AI Workloads Hub (/ai-workloads)"]
        UI_Costs["FinOps & Cost Management (/costs)"]
        UI_Policies["Policies & Posture Hub (/policies)"]
        UI_Teams["Teams & RBAC (/teams)"]
        UI_Integrations["Alert Integrations (/integrations)"]
        UI_Settings["Workspace & Cloud Settings (/settings)"]
        UI_Copilot["AI Copilot Drawer & Modal (⌘K)"]
    end

    subgraph BackendMonolith["Go Modular Monolith (backend/)"]
        API["API Gateway Router (cmd/api - :8080)"]
        Worker["Autonomous Discovery Worker (cmd/worker)"]

        subgraph CoreModules["Internal Domain Modules"]
            AuthModule["internal/auth (OIDC, Sessions & Cookies)"]
            OrgModule["internal/organisations (Workspaces, Members & RBAC)"]
            GovModule["internal/governance (Dashboard, Spend, Inventory & AI)"]
            DiscoveryModule["internal/discovery (AWS, GCP, Azure Scanners)"]
            PolicyModule["internal/policy (CIS, SOC2 & AI Guardrails Engine)"]
            FinOpsModule["internal/finops (Cost Trends, Anomalies & Budgets)"]
            IntegrationsModule["internal/integrations (Slack, Teams, Discord Webhooks)"]
            AIModule["internal/ai (Gemini, Claude, OpenAI & Dynamic Engine)"]
            AuditModule["internal/audit (Immutable Security Audit Events)"]
        end
    end

    subgraph DataStore["PostgreSQL 16 Multi-Tenant Database"]
        DB_Users["users & sessions"]
        DB_Orgs["organisations & organisation_members"]
        DB_Accounts["cloud_accounts"]
        DB_Resources["cloud_resources"]
        DB_Findings["policy_findings"]
        DB_Budgets["organisation_budgets"]
        DB_Integrations["organisation_integrations"]
        DB_Audit["audit_events"]
    end

    UI_Dash & UI_Inv & UI_AI & UI_Costs & UI_Policies & UI_Teams & UI_Integrations & UI_Settings & UI_Copilot -->|Direct Cross-Origin HTTPS (credentials: include)| API
    API --> AuthModule & OrgModule & GovModule & FinOpsModule & PolicyModule & IntegrationsModule & AIModule & AuditModule
    Worker --> DiscoveryModule & PolicyModule
    DiscoveryModule & PolicyModule --> DataStore
    AuthModule & OrgModule & GovModule & FinOpsModule & IntegrationsModule & AuditModule --> DataStore
```

---

## Core Platform Capabilities

### 1. Overview Dashboard (`/dashboard`)
- Multi-cloud normalized spend distribution across AWS, GCP, and Azure with responsive progress indicators and percentage calculations.
- Executive summary KPIs: Total cloud resources, monthly run rate, active AI workloads, and continuous compliance posture score.
- Active policy findings triage table with severity badges (Critical, High, Medium, Low) and direct "Ask Copilot" remediation buttons.
- Dynamic Copilot insights card synthesized from the active workspace's database state.

### 2. Multi-Cloud Inventory Catalog (`/inventory`)
- Unified multi-cloud resource visibility covering compute instances, object storage buckets, managed databases, and AI model deployments.
- Instant search filter by resource name, cloud provider, service, or region.
- Tabbed categorization: **All**, **AI Workloads**, **Compute**, **Storage & DB**, **AWS**, **GCP**, and **Azure**.
- One-click CSV export with detailed resource identifiers, monthly costs, and tags.

### 3. AI Workloads Hub (`/ai-workloads`)
- Dedicated observability for foundation models and inference endpoints (Bedrock Claude 3.5 Sonnet, Titan, SageMaker Mistral, Vertex AI Gemini 1.5 Pro, Azure OpenAI GPT-4o).
- Live daily token velocity estimation and monthly AI cost attribution.
- Security & compliance guardrail indicators:
  - **PII Masking & Filtering**
  - **Model Audit & Invocation Logging**
  - **Customer-Managed KMS Encryption (CMK)**
- One-click remediation modal generating validated **Terraform (HCL)** and **Cloud CLI** deployment blueprints.

### 4. FinOps & Cost Intelligence (`/costs`)
- 30-day interactive time-series burn rate chart powered by Apache ECharts, isolating Infrastructure vs AI model spend.
- Automated cost anomaly detection flagging resource-level spending spikes exceeding 7-day baselines.
- Corporate budget cards with visual progress bars, warning thresholds, and creation/deletion modals.

### 5. Policies & Governance Hub (`/policies`)
- Continuous baseline evaluation against **CIS AWS Benchmark**, **SOC 2 Type II**, **HIPAA Security Rule**, and **AI Safety Guardrails**.
- Findings classification by severity and status: **Open**, **Suppressed**, and **Resolved**.
- Justified finding suppression modal and instant one-click finding resolution with audit logging.

### 6. Teams, RBAC & Workspace Tenancy (`/teams`)
- Multi-tenant role-based access control supporting **Owner**, **Admin**, and **Member** roles.
- Team member invitations by email with assigned role grants and revocation capability.
- Workspace switcher allowing instant switching between independent team tenants.
- Chronological security audit event stream capturing membership changes and administrative actions.

### 7. Alert & Notification Integrations (`/integrations`)
- Dedicated webhook dispatch for **Slack**, **Microsoft Teams**, **Discord**, and **Custom Webhooks**.
- One-click active/disabled toggle switch and live test ping dispatch.
- Monitored event topics: `policy.critical`, `policy.high`, `cost.anomaly`, and `account.sync`.
- Cryptographic masking of sensitive webhook endpoint URLs in API responses.

### 8. Cloud Connectors & Workspace Settings (`/settings`)
- Cloud connector onboarding wizard for AWS (Cross-account IAM Role ARN with external trust ID), GCP (Service Account JSON), and Azure (Service Principal).
- On-demand "Sync Now" account trigger with real-time loading spinners.
- Cloud account disconnection with cascading resource and finding cleanup.
- Full compliance audit trail with expandable JSON metadata inspector.

### 9. Autonomous AI Copilot (`⌘K` / Global Drawer)
- Multi-provider inference support:
  - **Google Gemini** (`gemini-1.5-flash`, `gemini-1.5-pro`)
  - **Anthropic Claude** (`claude-3-5-sonnet-20241022`)
  - **OpenAI** (`gpt-4o-mini`, `gpt-4o`, Ollama / local OpenAI-compatible endpoints)
  - **Dynamic Local Engine**: Synthesizes intelligent remediation scripts directly from the workspace's PostgreSQL snapshot.
- Context-aware explanations for security findings, cost drivers, and architecture hardening.

---

## Database Architecture & Migrations

Database setup uses an embedded Go migration runner in `backend/internal/migrations`. Numbered SQL files run in sequence during API startup within a single transaction:

| Migration File | Description |
| :--- | :--- |
| `001_initial.sql` | Base schema: `users`, `sessions`, `organisations`, `organisation_members`, `audit_events`. |
| `002_auth.sql` | Authentication extensions, refresh token rotation, and OIDC state storage. |
| `003_cloud_governance.sql` | Core governance tables: `cloud_accounts`, `cloud_resources`, `policy_findings`. |
| `004_finops_budgets.sql` | FinOps tracking: `organisation_budgets` with alert threshold percentages. |
| `005_fix_auth_sessions.sql` | Host-Only cookie session indexes and expiry cleanup. |
| `006_integrations.sql` | Alert integrations table: `organisation_integrations` (Slack, Teams, Discord). |
| `007_cleanup_secondary_org_sample_data.sql` | Multi-tenancy enforcement: purges duplicate sample records from secondary workspaces. |
| `008_seed_primary_sample_integration.sql` | Seeds initial webhook integration for primary onboarding workspace. |

---

## Local Development & Quickstart

### Prerequisites
- **Go**: 1.26 or newer
- **Node.js**: 20.19+ or 22.12+
- **PostgreSQL**: 16+ (or Docker Desktop)
- **npm** or **pnpm**

### 1. Start with Docker Compose
From the repository root:

```bash
# 1. Prepare environment configuration
cp .env.example .env

# 2. Spin up PostgreSQL, API, Worker, and Caddy Gateway
docker compose -f deployments/docker/docker-compose.yml --env-file .env up --build -d
```

The services will be reachable at:
- **CloudPilot Web App**: `http://localhost:5173` (Frontend UI)
- **Backend API**: `http://localhost:8080/cloudpilot` (Detailed Health: `http://localhost:8080/cloudpilot/healthz`)
- **PostgreSQL**: `localhost:5432` (`cloudpilot` database)

---

### 2. Run Manually (Local Host Development)

#### Terminal 1: Backend API
```bash
cd backend
go run ./cmd/api
```

#### Terminal 2: Background Discovery Worker
```bash
cd backend
go run ./cmd/worker
```

#### Terminal 3: Frontend Vite Server
```bash
cd frontend
npm install
npm run dev
```

---

## Configuration Reference (`.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `APP_ENV` | Application environment (`development`, `production`) | `development` |
| `HTTP_ADDR` | Go API server HTTP listening host & port | `:8080` |
| `POSTGRES_DB` | PostgreSQL database name | `cloudpilot` |
| `POSTGRES_USER` | PostgreSQL database user | `cloudpilot` |
| `POSTGRES_PASSWORD` | PostgreSQL user password | `replace-with-a-local-development-password` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://cloudpilot:password@localhost:5432/cloudpilot?sslmode=disable` |
| `VITE_API_URL` | Frontend API connectivity base URL | `http://localhost:8080/cloudpilot` |
| `CORS_ALLOWED_ORIGINS` | Permitted cross-origin frontend origins | `http://localhost:5173,http://127.0.0.1:5173,https://app.cloudpilot.io` |
| `COOKIE_SECURE` | Set `true` in production (HTTPS) or `false` for local HTTP | `false` |
| `OIDC_ISSUER_URL` | OpenID Connect identity provider URL | `https://accounts.google.com` |
| `OIDC_CLIENT_ID` | OAuth2 / OIDC client application ID | Configured from GCP / IdP |
| `OIDC_CLIENT_SECRET` | OAuth2 / OIDC client application secret | Configured from GCP / IdP |
| `OIDC_CALLBACK_URL` | OAuth2 redirect callback URL | `http://localhost:8080/cloudpilot/auth/callback` |
| `AI_PROVIDER` | AI Copilot inference provider (`gemini`, `claude`, `openai`, `mock`) | `gemini` or `mock` |
| `AI_API_KEY` | API key for Gemini, Anthropic, or OpenAI | Secret key from provider |
| `AI_MODEL` | Target foundation model name | `gemini-1.5-flash`, `claude-3-5-sonnet-20241022`, or `gpt-4o-mini` |

---

## Code Quality & Verification Commands

All changes in the project are continuously verified against strict compiler and lint standards:

```bash
# 1. Run all Go backend unit & integration tests
cd backend
go test -v ./...

# 2. Run Go static analysis
go vet ./...

# 3. Verify TypeScript types (Zero errors required)
cd ../frontend
npx tsc --noEmit

# 4. Run Oxlint (Zero errors required)
npm run lint

# 5. Regenerate TypeScript schema types from OpenAPI contract
npm run api:types

# 6. Verify production frontend bundle build
npm run build
```
