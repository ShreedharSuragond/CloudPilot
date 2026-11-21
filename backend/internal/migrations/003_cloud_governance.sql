CREATE TABLE IF NOT EXISTS cloud_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('aws', 'gcp', 'azure')),
    name TEXT NOT NULL,
    account_identifier TEXT NOT NULL,
    role_arn TEXT,
    external_id TEXT,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'syncing', 'degraded', 'error', 'disconnected')),
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, provider, account_identifier)
);

CREATE INDEX IF NOT EXISTS cloud_accounts_org_idx ON cloud_accounts(organisation_id);

CREATE TABLE IF NOT EXISTS cloud_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    cloud_account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('aws', 'gcp', 'azure')),
    service TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('compute', 'storage', 'database', 'network', 'ai_model', 'ai_endpoint')),
    resource_id TEXT NOT NULL,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    monthly_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, cloud_account_id, resource_id)
);

CREATE INDEX IF NOT EXISTS cloud_resources_org_type_idx ON cloud_resources(organisation_id, resource_type);
CREATE INDEX IF NOT EXISTS cloud_resources_account_idx ON cloud_resources(cloud_account_id);
CREATE INDEX IF NOT EXISTS cloud_resources_provider_idx ON cloud_resources(organisation_id, provider);

CREATE TABLE IF NOT EXISTS policy_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    cloud_resource_id UUID REFERENCES cloud_resources(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    rule_name TEXT NOT NULL,
    description TEXT NOT NULL,
    remediation_guidance TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'suppressed', 'resolved')),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_findings_org_severity_idx ON policy_findings(organisation_id, severity, status);

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('cost_optimization', 'security', 'ai_workload', 'architecture')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    estimated_savings NUMERIC(10, 2) DEFAULT 0.00,
    remediation_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_insights_org_idx ON ai_insights(organisation_id, created_at DESC);
