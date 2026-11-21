# API Specification & Endpoints

The CloudPilot backend exposes a RESTful HTTP API conforming to the OpenAPI 3.1 specification located in `api/openapi.yaml`.

---

## 1. Global Conventions

- **Base URL**: `http://localhost:8080/cloudpilot/api/v1`
- **Transport**: HTTPS with standard JSON payloads (`Content-Type: application/json`).
- **Authentication**: Authenticated session cookie (`cp_session`), sent automatically via browser requests with `credentials: 'include'`.
- **Tenant Context**: Passed via `X-Organisation-ID` header or derived from the user's active session.
- **Standard Error Response**:
  ```json
  {
    "error": "Descriptive error message"
  }
  ```

---

## 2. Authentication (`/cloudpilot/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/cloudpilot/auth/config` | Returns OIDC configuration status. |
| `GET` | `/cloudpilot/auth/login` | Initiates OIDC Authorization Code Flow with PKCE redirect. |
| `GET` | `/cloudpilot/auth/callback` | Exchanges authorization code for tokens, establishes session, and redirects to dashboard. |
| `GET` | `/cloudpilot/auth/me` | Returns the currently authenticated user profile and active workspace. |
| `POST` | `/cloudpilot/auth/logout` | Clears the session in PostgreSQL and invalidates the `cp_session` cookie. |

---

## 3. Governance & Dashboard (`/cloudpilot/api/v1`)

### 3.1 Summary KPIs
- **`GET /cloudpilot/api/v1/dashboard/summary`**
- Returns top-level metrics for the active workspace:
  ```json
  {
    "totalResources": 14,
    "monthlySpend": 3532.50,
    "activeAiWorkloads": 3,
    "complianceScore": 92.5,
    "criticalFindingsCount": 1,
    "connectedAccounts": 2
  }
  ```

### 3.2 Spend Breakdown
- **`GET /cloudpilot/api/v1/dashboard/spend-breakdown`**
- Returns normalized multi-cloud cost distributions:
  ```json
  {
    "byProvider": [
      { "provider": "aws", "spend": 2410.90, "percent": 68.2 },
      { "provider": "gcp", "spend": 1121.60, "percent": 31.8 }
    ],
    "byCategory": [
      { "category": "Core Infrastructure", "spend": 2862.50, "percent": 81.0 },
      { "category": "AI & ML Workloads", "spend": 670.00, "percent": 19.0 }
    ]
  }
  ```

### 3.3 Recent Policy Findings
- **`GET /cloudpilot/api/v1/dashboard/recent-findings`**
- Lists recent open security findings sorted by severity.

### 3.4 Cloud Accounts
- **`GET /cloudpilot/api/v1/accounts`**: Lists all connected cloud accounts.
- **`POST /cloudpilot/api/v1/accounts`**: Connects a new AWS, GCP, or Azure account:
  ```json
  {
    "provider": "aws",
    "name": "Production AWS Workloads",
    "accountIdentifier": "123456789012",
    "roleArn": "arn:aws:iam::123456789012:role/CloudPilotDiscoveryRole"
  }
  ```
- **`POST /cloudpilot/api/v1/accounts/{id}/sync`**: Triggers an immediate discovery scan.
- **`DELETE /cloudpilot/api/v1/accounts/{id}`**: Disconnects account with cascading cleanup.

### 3.5 Cloud Inventory
- **`GET /cloudpilot/api/v1/inventory?type={type}&provider={provider}`**
- Returns paginated multi-cloud resources with metadata and monthly cost run-rates.

---

## 4. AI Workloads & Copilot (`/cloudpilot/api/v1`)

### 4.1 Copilot Insights & Chat
- **`GET /cloudpilot/api/v1/copilot/insights`**: Returns automated cost, security, and architecture insights.
- **`POST /cloudpilot/api/v1/copilot/chat`**: Conversational AI Copilot interface:
  ```json
  {
    "prompt": "How can I reduce our AWS GPU compute spend?"
  }
  ```
- **`POST /cloudpilot/api/v1/copilot/remediate/apply`**: Applies automated Terraform or CLI remediation blueprints.

---

## 5. FinOps & Cost Center (`/cloudpilot/api/v1/finops`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/cloudpilot/api/v1/finops/trends` | 30-day daily spend time series (Infra vs AI) with projected run rate. |
| `GET` | `/cloudpilot/api/v1/finops/anomalies` | Detected cost spikes exceeding baseline rolling averages. |
| `GET` | `/cloudpilot/api/v1/finops/budgets` | Lists all defined workspace budgets and consumption percentages. |
| `POST` | `/cloudpilot/api/v1/finops/budgets` | Creates a new monthly budget with threshold alerting. |
| `DELETE` | `/cloudpilot/api/v1/finops/budgets/{id}` | Deletes a defined budget. |

---

## 6. Policies & Posture Hub (`/cloudpilot/api/v1/policies`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/cloudpilot/api/v1/policies/findings` | Filterable findings query (`status`, `severity`, `framework`, `search`). |
| `GET` | `/cloudpilot/api/v1/policies/compliance-summary` | Posture percentage scores across CIS, SOC 2, HIPAA, and AI Safety. |
| `POST` | `/cloudpilot/api/v1/policies/findings/{id}/suppress` | Suppresses a false positive with required reason. |
| `POST` | `/cloudpilot/api/v1/policies/findings/{id}/resolve` | Marks a finding as resolved. |
| `POST` | `/cloudpilot/api/v1/policies/evaluate` | Manually triggers policy evaluation across discovered resources. |

---

## 7. Alert Integrations (`/cloudpilot/api/v1/settings/integrations`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/cloudpilot/api/v1/settings/integrations` | Lists all configured notification webhooks (Slack, Teams, Discord). |
| `POST` | `/cloudpilot/api/v1/settings/integrations` | Creates a new webhook integration with topic subscriptions. |
| `DELETE` | `/cloudpilot/api/v1/settings/integrations/{id}` | Deletes a webhook integration. |
| `POST` | `/cloudpilot/api/v1/settings/integrations/{id}/toggle` | Enables or disables an active integration. |
| `POST` | `/cloudpilot/api/v1/settings/integrations/{id}/test` | Dispatches an immediate test ping payload to verify channel connectivity. |

---

## 8. Teams & Multi-Tenancy (`/cloudpilot/api/v1/organisations`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/cloudpilot/api/v1/organisations` | Lists all workspaces the authenticated user belongs to. |
| `POST` | `/cloudpilot/api/v1/organisations` | Creates a new organization workspace. |
| `GET` | `/cloudpilot/api/v1/organisations/current` | Returns details for the active workspace context. |
| `GET` | `/cloudpilot/api/v1/organisations/members` | Lists active team members with assigned roles. |
| `POST` | `/cloudpilot/api/v1/organisations/members/{id}/role` | Updates a team member's role (`owner`, `admin`, `member`). |
| `DELETE` | `/cloudpilot/api/v1/organisations/members/{id}` | Removes a member from the workspace. |
| `GET` | `/cloudpilot/api/v1/organisations/invitations` | Lists pending team email invitations. |
| `POST` | `/cloudpilot/api/v1/organisations/invitations` | Issues a new member invitation. |
| `DELETE` | `/cloudpilot/api/v1/organisations/invitations/{id}` | Revokes a pending invitation. |

---

## 9. Immutable Audit Trail (`/cloudpilot/api/v1/audit`)

- **`GET /cloudpilot/api/v1/audit/events`**
- Returns a chronological stream of administrative and security events for the workspace:
  ```json
  [
    {
      "id": "audit-uuid",
      "action": "account.connect",
      "actorEmail": "admin@example.com",
      "targetType": "cloud_account",
      "targetId": "acc-uuid",
      "metadata": { "provider": "aws", "name": "Prod AWS" },
      "createdAt": "2026-11-22T00:15:30Z"
    }
  ]
  ```

---

## 10. System Health

- **`GET /cloudpilot/healthz`**: Unified operational probe returning system uptime, environment, version, and detailed PostgreSQL connection metrics (status, ping latency, total/idle/active connection counts).
