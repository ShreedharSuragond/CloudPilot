CREATE TABLE IF NOT EXISTS organisation_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'quarterly', 'annual')),
    alert_threshold_percent INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
    cloud_account_id UUID REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organisation_budgets_org_idx ON organisation_budgets(organisation_id);

CREATE TABLE IF NOT EXISTS cost_daily_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    cloud_account_id UUID REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('aws', 'gcp', 'azure')),
    infra_spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ai_spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, cloud_account_id, date, provider)
);

CREATE INDEX IF NOT EXISTS cost_daily_snapshots_org_date_idx ON cost_daily_snapshots(organisation_id, date DESC);
