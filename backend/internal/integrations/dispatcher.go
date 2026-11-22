package integrations

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Dispatch sends real-time alert notifications to all active webhook integrations for an organisation.
func Dispatch(ctx context.Context, pool *pgxpool.Pool, orgID, eventType, message string, payload any) {
	if pool == nil || orgID == "" {
		return
	}

	rows, err := pool.Query(ctx, `
		SELECT id::text, webhook_url, provider
		FROM organisation_integrations
		WHERE organisation_id = $1::uuid AND enabled = true AND $2 = ANY(events)
	`, orgID, eventType)
	if err != nil {
		return
	}
	defer rows.Close()

	type target struct {
		id       string
		url      string
		provider string
	}
	var targets []target
	for rows.Next() {
		var t target
		if err := rows.Scan(&t.id, &t.url, &t.provider); err == nil {
			targets = append(targets, t)
		}
	}

	if len(targets) == 0 {
		return
	}

	bodyMap := map[string]any{
		"text": fmt.Sprintf("[CloudPilot %s] %s", eventType, message),
		"cloudpilot": map[string]any{
			"event":     eventType,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"payload":   payload,
		},
	}
	bodyBytes, _ := json.Marshal(bodyMap)

	client := &http.Client{Timeout: 5 * time.Second}
	for _, t := range targets {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.url, bytes.NewReader(bodyBytes))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		statusText := "success"
		resp, err := client.Do(req)
		if err != nil || (resp != nil && resp.StatusCode >= 400) {
			statusText = "failed"
		}
		if resp != nil {
			_ = resp.Body.Close()
		}

		_, _ = pool.Exec(ctx, `
			UPDATE organisation_integrations
			SET last_triggered_at = now(), last_status = $1, updated_at = now()
			WHERE id = $2::uuid
		`, statusText, t.id)
	}
}
