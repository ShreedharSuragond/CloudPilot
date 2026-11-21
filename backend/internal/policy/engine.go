package policy

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Engine struct {
	pool  *pgxpool.Pool
	rules []Rule
	mu    sync.RWMutex
}

func NewEngine(pool *pgxpool.Pool) *Engine {
	return &Engine{
		pool:  pool,
		rules: DefaultRules(),
	}
}

func (e *Engine) Rules() []Rule {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.rules
}

func (e *Engine) EvaluateAccount(ctx context.Context, accountID, orgID string) (int, error) {
	if e.pool == nil {
		return 0, fmt.Errorf("database pool is not configured")
	}

	rows, err := e.pool.Query(ctx, `
		SELECT id::text, organisation_id::text, cloud_account_id::text, provider, service,
			resource_type, resource_id, name, region, status, monthly_cost, tags, metadata
		FROM cloud_resources
		WHERE cloud_account_id = $1::uuid AND organisation_id = $2::uuid
	`, accountID, orgID)
	if err != nil {
		return 0, fmt.Errorf("query resources for evaluation: %w", err)
	}
	defer rows.Close()

	targets := make([]ResourceTarget, 0)
	for rows.Next() {
		var t ResourceTarget
		var tagsJSON, metaJSON []byte
		if err := rows.Scan(
			&t.ID, &t.OrganisationID, &t.CloudAccountID, &t.Provider, &t.Service,
			&t.ResourceType, &t.ResourceID, &t.Name, &t.Region, &t.Status, &t.MonthlyCost,
			&tagsJSON, &metaJSON,
		); err == nil {
			if len(tagsJSON) > 0 {
				_ = json.Unmarshal(tagsJSON, &t.Tags)
			}
			if len(metaJSON) > 0 {
				_ = json.Unmarshal(metaJSON, &t.Metadata)
			}
			targets = append(targets, t)
		}
	}

	rules := e.Rules()
	violationsCount := 0

	for _, target := range targets {
		for _, rule := range rules {
			violated, reason := rule.Check(target)
			if !violated {
				continue
			}

			violationsCount++
			desc := rule.Description
			if reason != "" {
				desc = fmt.Sprintf("%s (%s)", desc, reason)
			}

			_, err := e.pool.Exec(ctx, `
				INSERT INTO policy_findings (
					organisation_id, cloud_resource_id, severity, rule_name,
					framework, description, remediation_guidance, status, detected_at
				)
				VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'open', now())
				ON CONFLICT (organisation_id, cloud_resource_id, rule_name) WHERE status = 'open'
				DO UPDATE SET
					description = EXCLUDED.description,
					remediation_guidance = EXCLUDED.remediation_guidance,
					severity = EXCLUDED.severity,
					framework = EXCLUDED.framework,
					detected_at = now()
			`, orgID, target.ID, rule.Severity, rule.Name, rule.Framework, desc, rule.RemediationGuidance)
			if err != nil {
				slog.Warn("failed to upsert policy finding", "rule", rule.Name, "resourceId", target.ID, "error", err)
			}
		}
	}

	return violationsCount, nil
}

func (e *Engine) EvaluateOrg(ctx context.Context, orgID string) (int, error) {
	if e.pool == nil {
		return 0, fmt.Errorf("database pool is not configured")
	}

	rows, err := e.pool.Query(ctx, `
		SELECT id::text
		FROM cloud_accounts
		WHERE organisation_id = $1::uuid
	`, orgID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var accountIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			accountIDs = append(accountIDs, id)
		}
	}

	totalViolations := 0
	for _, id := range accountIDs {
		count, err := e.EvaluateAccount(ctx, id, orgID)
		if err == nil {
			totalViolations += count
		}
	}

	return totalViolations, nil
}

func (e *Engine) GetComplianceSummary(ctx context.Context, orgID string) (*ComplianceSummary, error) {
	if e.pool == nil {
		return nil, fmt.Errorf("database pool is not configured")
	}

	var summary ComplianceSummary
	summary.FrameworkScores = make(map[string]float64)

	err := e.pool.QueryRow(ctx, `
		SELECT 
			count(*),
			count(*) FILTER (WHERE severity = 'critical'),
			count(*) FILTER (WHERE severity = 'high'),
			count(*) FILTER (WHERE severity = 'medium'),
			count(*) FILTER (WHERE severity = 'low')
		FROM policy_findings
		WHERE organisation_id = $1::uuid AND status = 'open'
	`, orgID).Scan(
		&summary.TotalOpenFindings,
		&summary.CriticalCount,
		&summary.HighCount,
		&summary.MediumCount,
		&summary.LowCount,
	)
	if err != nil {
		return nil, err
	}

	// Overall score
	penalty := float64(summary.CriticalCount)*15.0 + float64(summary.HighCount)*8.0 + float64(summary.MediumCount)*3.0 + float64(summary.LowCount)*1.0
	score := 100.0 - penalty
	if score < 0 {
		score = 0
	}
	summary.OverallScore = score

	// Per-framework scores
	frameworks := []string{"cis", "soc2", "hipaa", "ai_safety", "iso27001"}
	for _, fw := range frameworks {
		var crit, hi, med, low int
		_ = e.pool.QueryRow(ctx, `
			SELECT 
				count(*) FILTER (WHERE severity = 'critical'),
				count(*) FILTER (WHERE severity = 'high'),
				count(*) FILTER (WHERE severity = 'medium'),
				count(*) FILTER (WHERE severity = 'low')
			FROM policy_findings
			WHERE organisation_id = $1::uuid AND status = 'open' AND framework = $2
		`, orgID, fw).Scan(&crit, &hi, &med, &low)

		fwPenalty := float64(crit)*20.0 + float64(hi)*10.0 + float64(med)*5.0 + float64(low)*2.0
		fwScore := 100.0 - fwPenalty
		if fwScore < 0 {
			fwScore = 0
		}
		summary.FrameworkScores[fw] = fwScore
	}

	return &summary, nil
}

func (e *Engine) SuppressFinding(ctx context.Context, orgID, findingID, reason string) error {
	_, err := e.pool.Exec(ctx, `
		UPDATE policy_findings
		SET status = 'suppressed', suppression_reason = $1
		WHERE id = $2::uuid AND organisation_id = $3::uuid
	`, reason, findingID, orgID)
	return err
}

func (e *Engine) ResolveFinding(ctx context.Context, orgID, findingID string) error {
	_, err := e.pool.Exec(ctx, `
		UPDATE policy_findings
		SET status = 'resolved', resolved_at = now()
		WHERE id = $1::uuid AND organisation_id = $2::uuid
	`, findingID, orgID)
	return err
}
