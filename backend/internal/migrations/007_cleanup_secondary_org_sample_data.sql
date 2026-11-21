-- Migration 007: Clean up duplicate sample data from secondary workspaces so each workspace is isolated and distinct
DELETE FROM cloud_accounts
WHERE (account_identifier = '123456789012' OR account_identifier = 'cloudpilot-ai-research-prod')
  AND organisation_id IN (
    SELECT o.id
    FROM organisations o
    JOIN memberships m ON m.organisation_id = o.id
    WHERE o.id != (
      SELECT o2.id
      FROM organisations o2
      JOIN memberships m2 ON m2.organisation_id = o2.id
      WHERE m2.user_id = m.user_id
      ORDER BY o2.created_at ASC
      LIMIT 1
    )
  );
