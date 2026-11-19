# CloudPilot workspace guidance

- Keep the backend a Go modular monolith. API and worker entry points are separate and share internal domain packages.
- Treat PostgreSQL as the system of record; use pgx with direct SQL in feature repositories. Keep tenant IDs and authorization boundaries explicit.
- Keep API contracts in `api/openapi.yaml`; generate frontend API types from the contract.
- Keep server data in TanStack Query, shared UI state in focused Zustand stores, route-shareable filters in TanStack Router, and form state in React Hook Form + Zod.
- Do not add cloud write operations, credentials, or tenant data endpoints until authentication, least privilege, deny-by-default authorization, audit, and isolation tests are implemented.
- Keep local secrets in `.env`, never in source control. Avoid Redis, Kafka, microservices, and Kubernetes deployment until a measured requirement justifies them.
