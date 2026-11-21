ALTER TABLE policy_findings
    ADD COLUMN IF NOT EXISTS framework TEXT NOT NULL DEFAULT 'cis'
        CHECK (framework IN ('cis', 'soc2', 'hipaa', 'ai_safety', 'iso27001')),
    ADD COLUMN IF NOT EXISTS suppression_reason TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS policy_findings_framework_idx
    ON policy_findings(organisation_id, framework, status);

CREATE UNIQUE INDEX IF NOT EXISTS policy_findings_resource_rule_idx
    ON policy_findings(organisation_id, cloud_resource_id, rule_name)
    WHERE status = 'open';
