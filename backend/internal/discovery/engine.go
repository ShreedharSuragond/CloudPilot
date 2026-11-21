package discovery

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/cloudpilot/internal/audit"
)

type Engine struct {
	pool            *pgxpool.Pool
	scanners        map[string]Scanner
	policyEvaluator func(ctx context.Context, accountID, orgID string) (int, error)
	mu              sync.RWMutex
}

func NewEngine(pool *pgxpool.Pool) *Engine {
	e := &Engine{
		pool:     pool,
		scanners: make(map[string]Scanner),
	}

	e.RegisterScanner(NewAWSScanner())
	e.RegisterScanner(NewGCPScanner())
	e.RegisterScanner(NewAzureScanner())

	return e
}

func (e *Engine) SetPolicyEvaluator(fn func(ctx context.Context, accountID, orgID string) (int, error)) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.policyEvaluator = fn
}

func (e *Engine) RegisterScanner(scanner Scanner) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.scanners[scanner.Provider()] = scanner
}

func (e *Engine) getScanner(provider string) (Scanner, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	s, ok := e.scanners[provider]
	return s, ok
}

func (e *Engine) SyncAccount(ctx context.Context, accountID string) (*SyncResult, error) {
	if e.pool == nil {
		return nil, fmt.Errorf("database pool not configured")
	}

	var acc CloudAccount
	err := e.pool.QueryRow(ctx, `
		SELECT id::text, organisation_id::text, provider, name, account_identifier,
			role_arn, external_id, status, last_sync_at, error_message, created_at
		FROM cloud_accounts
		WHERE id = $1::uuid
	`, accountID).Scan(
		&acc.ID, &acc.OrganisationID, &acc.Provider, &acc.Name, &acc.AccountIdentifier,
		&acc.RoleArn, &acc.ExternalID, &acc.Status, &acc.LastSyncAt, &acc.ErrorMessage, &acc.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}

	// Update status to syncing
	_, _ = e.pool.Exec(ctx, `UPDATE cloud_accounts SET status = 'syncing' WHERE id = $1::uuid`, accountID)

	scanner, ok := e.getScanner(acc.Provider)
	if !ok {
		errStr := fmt.Sprintf("unsupported cloud provider: %s", acc.Provider)
		_, _ = e.pool.Exec(ctx, `UPDATE cloud_accounts SET status = 'error', error_message = $2 WHERE id = $1::uuid`, accountID, errStr)
		return nil, fmt.Errorf("%s", errStr)
	}

	resources, err := scanner.Scan(ctx, acc)
	if err != nil {
		errStr := fmt.Sprintf("scanner error: %v", err)
		_, _ = e.pool.Exec(ctx, `UPDATE cloud_accounts SET status = 'error', error_message = $2 WHERE id = $1::uuid`, accountID, errStr)
		return nil, fmt.Errorf("%s", errStr)
	}

	// Persist discovered resources in transaction
	tx, err := e.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, res := range resources {
		tagsJSON, _ := json.Marshal(res.Tags)
		metaJSON, _ := json.Marshal(res.Metadata)

		_, err = tx.Exec(ctx, `
			INSERT INTO cloud_resources (
				organisation_id, cloud_account_id, provider, service, resource_type,
				resource_id, name, region, status, monthly_cost, tags, metadata, discovered_at
			)
			VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
			ON CONFLICT (organisation_id, cloud_account_id, resource_id)
			DO UPDATE SET
				service = EXCLUDED.service,
				resource_type = EXCLUDED.resource_type,
				name = EXCLUDED.name,
				region = EXCLUDED.region,
				status = EXCLUDED.status,
				monthly_cost = EXCLUDED.monthly_cost,
				tags = EXCLUDED.tags,
				metadata = EXCLUDED.metadata,
				discovered_at = now()
		`, acc.OrganisationID, acc.ID, res.Provider, res.Service, res.ResourceType,
			res.ResourceID, res.Name, res.Region, res.Status, res.MonthlyCost, tagsJSON, metaJSON)
		if err != nil {
			slog.Warn("failed to upsert discovered resource", "resourceId", res.ResourceID, "error", err)
		}
	}

	now := time.Now()
	_, err = tx.Exec(ctx, `
		UPDATE cloud_accounts
		SET status = 'connected', last_sync_at = $2, error_message = NULL
		WHERE id = $1::uuid
	`, accountID, now)
	if err != nil {
		return nil, fmt.Errorf("update account status: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit sync transaction: %w", err)
	}

	e.mu.RLock()
	evalFn := e.policyEvaluator
	e.mu.RUnlock()
	if evalFn != nil {
		_, _ = evalFn(ctx, accountID, acc.OrganisationID)
	}

	audit.Log(ctx, e.pool, acc.OrganisationID, "", "account_synced", "cloud_account", &acc.ID, map[string]any{
		"provider":        acc.Provider,
		"totalDiscovered": len(resources),
	})

	return &SyncResult{
		AccountID:       accountID,
		TotalDiscovered: len(resources),
		SyncedAt:        now,
	}, nil
}

func (e *Engine) SyncAllPending(ctx context.Context) (int, error) {
	if e.pool == nil {
		return 0, nil
	}

	rows, err := e.pool.Query(ctx, `
		SELECT id::text
		FROM cloud_accounts
		WHERE status != 'syncing' AND (last_sync_at IS NULL OR last_sync_at < now() - interval '3 minutes')
		ORDER BY COALESCE(last_sync_at, '1970-01-01') ASC
		LIMIT 10
	`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	accountIDs := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			accountIDs = append(accountIDs, id)
		}
	}

	synced := 0
	for _, id := range accountIDs {
		select {
		case <-ctx.Done():
			return synced, ctx.Err()
		default:
		}

		if _, err := e.SyncAccount(ctx, id); err == nil {
			synced++
		} else {
			slog.Warn("sync account failed in background runner", "accountId", id, "error", err)
		}
	}

	return synced, nil
}
