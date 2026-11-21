package integrations

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/cloudpilot/internal/audit"
	"github.com/your-org/cloudpilot/internal/auth"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.listIntegrations)
	r.Post("/", h.createIntegration)
	r.Delete("/{id}", h.deleteIntegration)
	r.Post("/{id}/test", h.testIntegration)
	r.Post("/{id}/toggle", h.toggleIntegration)

	return r
}

func (h *Handler) listIntegrations(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT id::text, organisation_id::text, name, provider, webhook_url,
			events, enabled, last_triggered_at, last_status, created_at, updated_at
		FROM organisation_integrations
		WHERE organisation_id = $1::uuid
		ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to list integrations: " + err.Error()})
		return
	}
	defer rows.Close()

	items := make([]Integration, 0)
	for rows.Next() {
		var item Integration
		if err := rows.Scan(
			&item.ID, &item.OrganisationID, &item.Name, &item.Provider, &item.WebhookURL,
			&item.Events, &item.Enabled, &item.LastTriggeredAt, &item.LastStatus,
			&item.CreatedAt, &item.UpdatedAt,
		); err == nil {
			// Mask webhook URL for security
			if len(item.WebhookURL) > 16 {
				item.WebhookURL = item.WebhookURL[:12] + "..." + item.WebhookURL[len(item.WebhookURL)-4:]
			}
			items = append(items, item)
		}
	}

	writeJSON(w, http.StatusOK, items)
}

func (h *Handler) createIntegration(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	userID := auth.GetUserID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	var req CreateIntegrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.WebhookURL = strings.TrimSpace(req.WebhookURL)
	req.Provider = strings.ToLower(strings.TrimSpace(req.Provider))

	if req.Name == "" || req.WebhookURL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Name and webhook URL are required"})
		return
	}

	if req.Provider != "slack" && req.Provider != "teams" && req.Provider != "discord" && req.Provider != "webhook" {
		req.Provider = "webhook"
	}

	if len(req.Events) == 0 {
		req.Events = []string{"policy.critical", "policy.high", "cost.anomaly"}
	}

	var id string
	var createdAt, updatedAt time.Time
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO organisation_integrations (
			organisation_id, name, provider, webhook_url, events, enabled, created_at, updated_at
		)
		VALUES ($1::uuid, $2, $3, $4, $5, true, now(), now())
		RETURNING id::text, created_at, updated_at
	`, orgID, req.Name, req.Provider, req.WebhookURL, req.Events).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create integration: " + err.Error()})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, userID, "integration.create", "integration", &id, map[string]any{
		"name":     req.Name,
		"provider": req.Provider,
	})

	maskedURL := req.WebhookURL
	if len(maskedURL) > 16 {
		maskedURL = maskedURL[:12] + "..." + maskedURL[len(maskedURL)-4:]
	}

	writeJSON(w, http.StatusCreated, Integration{
		ID:             id,
		OrganisationID: orgID,
		Name:           req.Name,
		Provider:       req.Provider,
		WebhookURL:     maskedURL,
		Events:         req.Events,
		Enabled:        true,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	})
}

func (h *Handler) deleteIntegration(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	userID := auth.GetUserID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Integration ID required"})
		return
	}

	tag, err := h.pool.Exec(r.Context(), `
		DELETE FROM organisation_integrations WHERE id = $1::uuid AND organisation_id = $2::uuid
	`, id, orgID)
	if err != nil || tag.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Integration not found"})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, userID, "integration.delete", "integration", &id, nil)

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) toggleIntegration(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	id := chi.URLParam(r, "id")
	var enabled bool
	err := h.pool.QueryRow(r.Context(), `
		UPDATE organisation_integrations
		SET enabled = NOT enabled, updated_at = now()
		WHERE id = $1::uuid AND organisation_id = $2::uuid
		RETURNING enabled
	`, id, orgID).Scan(&enabled)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Integration not found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "enabled": enabled})
}

func (h *Handler) testIntegration(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	id := chi.URLParam(r, "id")
	var webhookURL, provider string
	err := h.pool.QueryRow(r.Context(), `
		SELECT webhook_url, provider FROM organisation_integrations
		WHERE id = $1::uuid AND organisation_id = $2::uuid
	`, id, orgID).Scan(&webhookURL, &provider)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Integration not found"})
		return
	}

	// Prepare sample alert test payload
	testPayload := map[string]any{
		"text": fmt.Sprintf("[CloudPilot Test Alert] Successfully connected to %s webhook! Security guardrails and FinOps alerting are active.", strings.ToUpper(provider)),
		"cloudpilot": map[string]any{
			"event":     "integration.test",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"status":    "healthy",
		},
	}
	payloadBytes, _ := json.Marshal(testPayload)

	client := &http.Client{Timeout: 5 * time.Second}
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodPost, webhookURL, bytes.NewReader(payloadBytes))
	req.Header.Set("Content-Type", "application/json")

	statusText := "success"
	resp, err := client.Do(req)
	if err != nil || (resp != nil && resp.StatusCode >= 400) {
		statusText = "failed"
	}
	if resp != nil {
		_ = resp.Body.Close()
	}

	_, _ = h.pool.Exec(r.Context(), `
		UPDATE organisation_integrations
		SET last_triggered_at = now(), last_status = $1, updated_at = now()
		WHERE id = $2::uuid
	`, statusText, id)

	writeJSON(w, http.StatusOK, TestIntegrationResponse{
		Success: statusText == "success",
		Message: fmt.Sprintf("Test ping dispatched to %s. Status: %s", provider, statusText),
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
