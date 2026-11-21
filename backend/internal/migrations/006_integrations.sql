CREATE TABLE IF NOT EXISTS organisation_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('slack', 'teams', 'discord', 'webhook')),
    webhook_url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['policy.critical', 'policy.high', 'cost.anomaly'],
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    last_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organisation_integrations_org_idx ON organisation_integrations(organisation_id);
