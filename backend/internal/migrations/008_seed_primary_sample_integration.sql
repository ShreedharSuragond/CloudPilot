-- Migration 008: Seed a sample Slack integration for the primary demo workspace if empty
INSERT INTO organisation_integrations (
    organisation_id, name, provider, webhook_url, events, enabled, created_at, updated_at
)
SELECT 
    o.id,
    'DevOps SecOps Slack Alert',
    'slack',
    'https://hooks.slack.com/services/T00000000/B00000000/sample-secret-token',
    ARRAY['policy.critical', 'policy.high', 'cost.anomaly'],
    true,
    now(),
    now()
FROM organisations o
JOIN memberships m ON m.organisation_id = o.id
WHERE o.id = (
    SELECT o2.id 
    FROM organisations o2 
    JOIN memberships m2 ON m2.organisation_id = o2.id 
    WHERE m2.user_id = m.user_id 
    ORDER BY o2.created_at ASC 
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1 FROM organisation_integrations oi WHERE oi.organisation_id = o.id
);
