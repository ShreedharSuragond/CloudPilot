package governance

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-org/cloudpilot/internal/ai"
	"github.com/your-org/cloudpilot/internal/audit"
	"github.com/your-org/cloudpilot/internal/auth"
	"github.com/your-org/cloudpilot/internal/discovery"
)

type Handler struct {
	pool            *pgxpool.Pool
	authHandler     *auth.Handler
	aiProvider      ai.Provider
	discoveryEngine *discovery.Engine
}

func New(pool *pgxpool.Pool, authHandler *auth.Handler, aiProvider ai.Provider, discoveryEngine *discovery.Engine) *Handler {
	return &Handler{
		pool:            pool,
		authHandler:     authHandler,
		aiProvider:      aiProvider,
		discoveryEngine: discoveryEngine,
	}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()

	r.Use(h.requireAuthMiddleware)

	// Dashboard metrics
	r.Get("/dashboard/summary", h.getDashboardSummary)
	r.Get("/dashboard/spend-breakdown", h.getSpendBreakdown)
	r.Get("/dashboard/recent-findings", h.getRecentFindings)

	// Cloud accounts
	r.Get("/accounts", h.listAccounts)
	r.Post("/accounts", h.connectAccount)
	r.Post("/accounts/{id}/sync", h.syncAccount)
	r.Delete("/accounts/{id}", h.disconnectAccount)

	// Inventory
	r.Get("/inventory", h.listInventory)

	// AI Copilot
	r.Get("/copilot/insights", h.getCopilotInsights)
	r.Post("/copilot/chat", h.chatWithCopilot)
	r.Post("/copilot/remediate", h.remediateFinding)
	r.Post("/copilot/remediate/apply", h.applyRemediationBlueprint)

	// AI Workloads Governance
	r.Get("/ai/workloads", h.getAIWorkloads)

	return r
}

func (h *Handler) requireAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, orgID, ok := h.authHandler.Authenticate(r)
		if !ok || userID == "" || orgID == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
			return
		}

		ctx := auth.WithUser(r.Context(), userID)
		ctx = auth.WithOrg(ctx, orgID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getOrgID(ctx context.Context) string {
	return auth.GetOrgID(ctx)
}

// 1. Dashboard Summary
type DashboardSummary struct {
	TotalResources        int     `json:"totalResources"`
	MonthlySpend          float64 `json:"monthlySpend"`
	ActiveAIWorkloads     int     `json:"activeAiWorkloads"`
	ComplianceScore       float64 `json:"complianceScore"`
	CriticalFindingsCount int     `json:"criticalFindingsCount"`
	ConnectedAccounts     int     `json:"connectedAccounts"`
}

func (h *Handler) getDashboardSummary(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	var summary DashboardSummary
	err := h.pool.QueryRow(r.Context(), `
		SELECT 
			COALESCE(count(r.id), 0),
			COALESCE(sum(r.monthly_cost), 0.00),
			COALESCE(count(r.id) FILTER (WHERE r.resource_type IN ('ai_model', 'ai_endpoint')), 0)
		FROM cloud_resources r
		WHERE r.organisation_id = $1::uuid
	`, orgID).Scan(&summary.TotalResources, &summary.MonthlySpend, &summary.ActiveAIWorkloads)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to calculate resource summary"})
		return
	}

	err = h.pool.QueryRow(r.Context(), `
		SELECT count(*) FROM cloud_accounts WHERE organisation_id = $1::uuid
	`, orgID).Scan(&summary.ConnectedAccounts)
	if err != nil {
		summary.ConnectedAccounts = 0
	}

	score, criticalCount := h.calculateComplianceScore(r.Context(), orgID)
	summary.CriticalFindingsCount = criticalCount
	summary.ComplianceScore = score

	writeJSON(w, http.StatusOK, summary)
}

func (h *Handler) calculateComplianceScore(ctx context.Context, orgID string) (float64, int) {
	var totalFindings, criticalFindings int
	err := h.pool.QueryRow(ctx, `
		SELECT 
			count(*),
			count(*) FILTER (WHERE severity = 'critical' AND status = 'open')
		FROM policy_findings
		WHERE organisation_id = $1::uuid AND status = 'open'
	`, orgID).Scan(&totalFindings, &criticalFindings)
	if err != nil || totalFindings == 0 {
		return 100.0, criticalFindings
	}

	score := 100.0 - (float64(criticalFindings)*15.0 + float64(totalFindings-criticalFindings)*5.0)
	if score < 0 {
		score = 0
	}
	return score, criticalFindings
}

// 2. Spend Breakdown
type SpendBreakdown struct {
	ByProvider []ProviderSpend `json:"byProvider"`
	ByCategory []CategorySpend `json:"byCategory"`
}

type ProviderSpend struct {
	Provider string  `json:"provider"`
	Spend    float64 `json:"spend"`
	Percent  float64 `json:"percent"`
}

type CategorySpend struct {
	Category string  `json:"category"`
	Spend    float64 `json:"spend"`
	Percent  float64 `json:"percent"`
}

func (h *Handler) getSpendBreakdown(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	// Total spend for percentages
	var totalSpend float64
	_ = h.pool.QueryRow(r.Context(), `
		SELECT COALESCE(sum(monthly_cost), 0.00) FROM cloud_resources WHERE organisation_id = $1::uuid
	`, orgID).Scan(&totalSpend)

	// By Provider
	provRows, err := h.pool.Query(r.Context(), `
		SELECT provider, COALESCE(sum(monthly_cost), 0.00)
		FROM cloud_resources
		WHERE organisation_id = $1::uuid
		GROUP BY provider
		ORDER BY sum(monthly_cost) DESC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to calculate provider spend"})
		return
	}
	defer provRows.Close()

	byProvider := make([]ProviderSpend, 0)
	for provRows.Next() {
		var p ProviderSpend
		if err := provRows.Scan(&p.Provider, &p.Spend); err == nil {
			if totalSpend > 0 {
				p.Percent = math.Round((p.Spend/totalSpend)*1000) / 10
			}
			byProvider = append(byProvider, p)
		}
	}

	// By Category (Infra vs AI)
	catRows, err := h.pool.Query(r.Context(), `
		SELECT 
			CASE 
				WHEN resource_type IN ('ai_model', 'ai_endpoint') THEN 'AI & ML Workloads'
				ELSE 'Core Infrastructure'
			END as category,
			COALESCE(sum(monthly_cost), 0.00)
		FROM cloud_resources
		WHERE organisation_id = $1::uuid
		GROUP BY 1
		ORDER BY 2 DESC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to calculate category spend"})
		return
	}
	defer catRows.Close()

	byCategory := make([]CategorySpend, 0)
	for catRows.Next() {
		var c CategorySpend
		if err := catRows.Scan(&c.Category, &c.Spend); err == nil {
			if totalSpend > 0 {
				c.Percent = math.Round((c.Spend/totalSpend)*1000) / 10
			}
			byCategory = append(byCategory, c)
		}
	}

	writeJSON(w, http.StatusOK, SpendBreakdown{ByProvider: byProvider, ByCategory: byCategory})
}

// 3. Recent Findings
type FindingItem struct {
	ID                  string    `json:"id"`
	Severity            string    `json:"severity"`
	RuleName            string    `json:"ruleName"`
	Description         string    `json:"description"`
	RemediationGuidance string    `json:"remediationGuidance"`
	ResourceName        string    `json:"resourceName"`
	Provider            string    `json:"provider"`
	Service             string    `json:"service"`
	DetectedAt          time.Time `json:"detectedAt"`
}

func (h *Handler) getRecentFindings(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	rows, err := h.pool.Query(r.Context(), `
		SELECT 
			f.id::text, f.severity, f.rule_name, f.description, f.remediation_guidance,
			COALESCE(r.name, 'Unknown Resource'), COALESCE(r.provider, 'cloud'), COALESCE(r.service, 'Infrastructure'),
			f.detected_at
		FROM policy_findings f
		LEFT JOIN cloud_resources r ON r.id = f.cloud_resource_id
		WHERE f.organisation_id = $1::uuid AND f.status = 'open'
		ORDER BY 
			CASE f.severity 
				WHEN 'critical' THEN 1 
				WHEN 'high' THEN 2 
				WHEN 'medium' THEN 3 
				ELSE 4 
			END,
			f.detected_at DESC
		LIMIT 10
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load findings"})
		return
	}
	defer rows.Close()

	findings := make([]FindingItem, 0)
	for rows.Next() {
		var item FindingItem
		if err := rows.Scan(
			&item.ID, &item.Severity, &item.RuleName, &item.Description, &item.RemediationGuidance,
			&item.ResourceName, &item.Provider, &item.Service, &item.DetectedAt,
		); err == nil {
			findings = append(findings, item)
		}
	}

	writeJSON(w, http.StatusOK, findings)
}

// 4. Accounts Management
type AccountItem struct {
	ID                string     `json:"id"`
	Provider          string     `json:"provider"`
	Name              string     `json:"name"`
	AccountIdentifier string     `json:"accountIdentifier"`
	RoleArn           *string    `json:"roleArn"`
	ExternalID        *string    `json:"externalId"`
	Status            string     `json:"status"`
	LastSyncAt        *time.Time `json:"lastSyncAt"`
	CreatedAt         time.Time  `json:"createdAt"`
}

func (h *Handler) listAccounts(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	rows, err := h.pool.Query(r.Context(), `
		SELECT id::text, provider, name, account_identifier, role_arn, external_id, status, last_sync_at, created_at
		FROM cloud_accounts
		WHERE organisation_id = $1::uuid
		ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load accounts"})
		return
	}
	defer rows.Close()

	accounts := make([]AccountItem, 0)
	for rows.Next() {
		var a AccountItem
		if err := rows.Scan(
			&a.ID, &a.Provider, &a.Name, &a.AccountIdentifier,
			&a.RoleArn, &a.ExternalID, &a.Status, &a.LastSyncAt, &a.CreatedAt,
		); err == nil {
			accounts = append(accounts, a)
		}
	}

	writeJSON(w, http.StatusOK, accounts)
}

type ConnectAccountRequest struct {
	Provider          string `json:"provider"`
	Name              string `json:"name"`
	AccountIdentifier string `json:"accountIdentifier"`
	RoleArn           string `json:"roleArn"`
}

func (h *Handler) connectAccount(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	var req ConnectAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	req.Provider = strings.ToLower(strings.TrimSpace(req.Provider))
	req.Name = strings.TrimSpace(req.Name)
	req.AccountIdentifier = strings.TrimSpace(req.AccountIdentifier)

	if req.Provider != "aws" && req.Provider != "gcp" && req.Provider != "azure" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Provider must be aws, gcp, or azure"})
		return
	}
	if req.Name == "" || req.AccountIdentifier == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Name and account identifier are required"})
		return
	}

	// Generate a secure external ID for AWS cross-account trust
	extBytes := make([]byte, 16)
	_, _ = rand.Read(extBytes)
	externalID := "cp-ext-" + hex.EncodeToString(extBytes)

	var id string
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO cloud_accounts (
			organisation_id, provider, name, account_identifier, role_arn, external_id, status, last_sync_at
		)
		VALUES ($1::uuid, $2, $3, $4, NULLIF($5, ''), $6, 'connected', now())
		RETURNING id::text
	`, orgID, req.Provider, req.Name, req.AccountIdentifier, req.RoleArn, externalID).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Account identifier already registered for this organisation"})
		return
	}

	if h.discoveryEngine != nil {
		_, _ = h.discoveryEngine.SyncAccount(r.Context(), id)
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":         id,
		"externalId": externalID,
		"status":     "connected",
	})
}

func (h *Handler) syncAccount(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())
	accountID := chi.URLParam(r, "id")

	var id string
	err := h.pool.QueryRow(r.Context(), `
		SELECT id::text FROM cloud_accounts WHERE id = $1::uuid AND organisation_id = $2::uuid
	`, accountID, orgID).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Account not found"})
		return
	}

	if h.discoveryEngine != nil {
		res, err := h.discoveryEngine.SyncAccount(r.Context(), accountID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"status":          "sync_completed",
			"totalDiscovered": res.TotalDiscovered,
			"syncedAt":        res.SyncedAt,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sync_completed"})
}

func (h *Handler) disconnectAccount(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())
	userID := auth.GetUserID(r.Context())
	accountID := chi.URLParam(r, "id")

	var name, provider string
	err := h.pool.QueryRow(r.Context(), `
		SELECT name, provider FROM cloud_accounts WHERE id = $1::uuid AND organisation_id = $2::uuid
	`, accountID, orgID).Scan(&name, &provider)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Account not found"})
		return
	}

	_, err = h.pool.Exec(r.Context(), `
		DELETE FROM cloud_accounts WHERE id = $1::uuid AND organisation_id = $2::uuid
	`, accountID, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to disconnect account: " + err.Error()})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, userID, "account.disconnect", "cloud_account", &accountID, map[string]any{
		"name":     name,
		"provider": provider,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}

// 5. Inventory
type InventoryItem struct {
	ID           string                 `json:"id"`
	AccountID    string                 `json:"accountId"`
	Provider     string                 `json:"provider"`
	Service      string                 `json:"service"`
	ResourceType string                 `json:"resourceType"`
	ResourceID   string                 `json:"resourceId"`
	Name         string                 `json:"name"`
	Region       string                 `json:"region"`
	Status       string                 `json:"status"`
	MonthlyCost  float64                `json:"monthlyCost"`
	Tags         map[string]interface{} `json:"tags"`
	DiscoveredAt time.Time              `json:"discoveredAt"`
}

func (h *Handler) listInventory(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())
	filterType := r.URL.Query().Get("type")
	filterProvider := r.URL.Query().Get("provider")

	query := `
		SELECT id::text, cloud_account_id::text, provider, service, resource_type,
			resource_id, name, region, status, monthly_cost, tags, discovered_at
		FROM cloud_resources
		WHERE organisation_id = $1::uuid
	`
	args := []any{orgID}
	argIdx := 2

	if filterType != "" {
		query += fmt.Sprintf(" AND resource_type = $%d", argIdx)
		args = append(args, filterType)
		argIdx++
	}
	if filterProvider != "" {
		query += fmt.Sprintf(" AND provider = $%d", argIdx)
		args = append(args, filterProvider)
		argIdx++
	}
	query += " ORDER BY monthly_cost DESC, name ASC LIMIT 50"

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load inventory"})
		return
	}
	defer rows.Close()

	items := make([]InventoryItem, 0)
	for rows.Next() {
		var item InventoryItem
		var tagsJSON []byte
		if err := rows.Scan(
			&item.ID, &item.AccountID, &item.Provider, &item.Service, &item.ResourceType,
			&item.ResourceID, &item.Name, &item.Region, &item.Status, &item.MonthlyCost, &tagsJSON, &item.DiscoveredAt,
		); err == nil {
			if len(tagsJSON) > 0 {
				_ = json.Unmarshal(tagsJSON, &item.Tags)
			}
			items = append(items, item)
		}
	}

	writeJSON(w, http.StatusOK, items)
}

// 6. AI Copilot Insights & Chat
func (h *Handler) buildCloudSnapshot(ctx context.Context, orgID string) (ai.CloudSnapshot, error) {
	var snapshot ai.CloudSnapshot

	err := h.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(count(r.id), 0),
			COALESCE(sum(r.monthly_cost), 0.00),
			COALESCE(count(r.id) FILTER (WHERE r.resource_type IN ('ai_model', 'ai_endpoint')), 0)
		FROM cloud_resources r
		WHERE r.organisation_id = $1::uuid
	`, orgID).Scan(&snapshot.TotalResources, &snapshot.MonthlySpend, &snapshot.ActiveAIWorkloads)
	if err != nil {
		return snapshot, err
	}

	score, _ := h.calculateComplianceScore(ctx, orgID)
	snapshot.ComplianceScore = score

	if snapshot.TotalResources == 0 {
		return snapshot, nil
	}

	// 1. Fetch top open findings
	findingRows, err := h.pool.Query(ctx, `
		SELECT 
			f.rule_name, f.severity, COALESCE(r.name, 'Resource'), COALESCE(r.resource_id, ''),
			COALESCE(r.provider, 'cloud'), COALESCE(r.service, 'Security'), f.description
		FROM policy_findings f
		LEFT JOIN cloud_resources r ON r.id = f.cloud_resource_id
		WHERE f.organisation_id = $1::uuid AND f.status = 'open'
		ORDER BY 
			CASE f.severity 
				WHEN 'critical' THEN 1 
				WHEN 'high' THEN 2 
				WHEN 'medium' THEN 3 
				ELSE 4 
			END,
			f.detected_at DESC
		LIMIT 5
	`, orgID)
	if err == nil {
		defer findingRows.Close()
		for findingRows.Next() {
			var fc ai.FindingContext
			if err := findingRows.Scan(&fc.RuleName, &fc.Severity, &fc.ResourceName, &fc.ResourceID, &fc.Provider, &fc.Service, &fc.Description); err == nil {
				snapshot.TopFindings = append(snapshot.TopFindings, fc)
			}
		}
	}

	// 2. Fetch sample resources (ordered by monthly spend)
	resRows, err := h.pool.Query(ctx, `
		SELECT name, provider, service, resource_type, monthly_cost, status
		FROM cloud_resources
		WHERE organisation_id = $1::uuid
		ORDER BY monthly_cost DESC
		LIMIT 10
	`, orgID)
	if err == nil {
		defer resRows.Close()
		for resRows.Next() {
			var rs ai.ResourceSummary
			if err := resRows.Scan(&rs.Name, &rs.Provider, &rs.Service, &rs.Type, &rs.Cost, &rs.Status); err == nil {
				snapshot.SampleResources = append(snapshot.SampleResources, rs)
			}
		}
	}

	// 3. Fetch top providers spend
	provRows, err := h.pool.Query(ctx, `
		SELECT provider, COALESCE(sum(monthly_cost), 0.00)
		FROM cloud_resources
		WHERE organisation_id = $1::uuid
		GROUP BY provider
		ORDER BY sum(monthly_cost) DESC
	`, orgID)
	if err == nil {
		defer provRows.Close()
		for provRows.Next() {
			var ps ai.ProviderSpend
			if err := provRows.Scan(&ps.Provider, &ps.Spend); err == nil {
				snapshot.TopProviders = append(snapshot.TopProviders, ps)
			}
		}
	}

	return snapshot, nil
}

func (h *Handler) getCopilotInsights(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	snapshot, err := h.buildCloudSnapshot(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to assemble cloud telemetry"})
		return
	}

	if snapshot.TotalResources == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"provider": h.aiProvider.Name(),
			"insights": []ai.Insight{},
		})
		return
	}

	insights, err := h.aiProvider.GenerateInsights(r.Context(), snapshot)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate AI insights"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"provider": h.aiProvider.Name(),
		"insights": insights,
	})
}

type ChatRequest struct {
	Messages []ai.ChatMessage `json:"messages"`
}

func (h *Handler) chatWithCopilot(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid messages payload"})
		return
	}

	snapshot, err := h.buildCloudSnapshot(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to assemble cloud telemetry"})
		return
	}

	reply, err := h.aiProvider.Chat(r.Context(), req.Messages, snapshot)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI copilot error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"provider": h.aiProvider.Name(),
		"message":  reply,
	})
}

type RemediateRequest struct {
	FindingID string `json:"findingId"`
}

func (h *Handler) remediateFinding(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())

	var req RemediateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Finding ID is required"})
		return
	}

	var finding ai.FindingContext
	err := h.pool.QueryRow(r.Context(), `
		SELECT f.rule_name, f.severity, COALESCE(r.name, 'Resource'), COALESCE(r.resource_id, ''),
			COALESCE(r.provider, 'aws'), COALESCE(r.service, 'Cloud'), f.description
		FROM policy_findings f
		LEFT JOIN cloud_resources r ON r.id = f.cloud_resource_id
		WHERE f.id = $1::uuid AND f.organisation_id = $2::uuid
	`, req.FindingID, orgID).Scan(
		&finding.RuleName, &finding.Severity, &finding.ResourceName, &finding.ResourceID,
		&finding.Provider, &finding.Service, &finding.Description,
	)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Finding not found"})
		return
	}

	explanation, err := h.aiProvider.ExplainFinding(r.Context(), finding)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate remediation"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"findingId":       req.FindingID,
		"remediation":     explanation,
		"remediationCode": explanation,
	})
}

// 7. AI Workloads Governance & Blueprint Remediation

type AIWorkloadSummary struct {
	TotalAIWorkloads          int     `json:"totalAiWorkloads"`
	MonthlyAISpend            float64 `json:"monthlyAiSpend"`
	ActiveEndpoints           int     `json:"activeEndpoints"`
	FoundationModels          int     `json:"foundationModels"`
	GuardrailsCompliantCount  int     `json:"guardrailsCompliantCount"`
	GuardrailsViolationsCount int     `json:"guardrailsViolationsCount"`
}

type AIWorkloadGuardrails struct {
	PIIFiltering      bool `json:"piiFiltering"`
	ModelAuditLogging bool `json:"modelAuditLogging"`
	KMSEncryption     bool `json:"kmsEncryption"`
}

type AIWorkloadItem struct {
	ID                    string               `json:"id"`
	AccountID             string               `json:"accountId"`
	Provider              string               `json:"provider"`
	Service               string               `json:"service"`
	ResourceType          string               `json:"resourceType"`
	ResourceID            string               `json:"resourceId"`
	Name                  string               `json:"name"`
	Region                string               `json:"region"`
	Status                string               `json:"status"`
	MonthlyCost           float64              `json:"monthlyCost"`
	ModelProvider         string               `json:"modelProvider"`
	ContextWindow         int                  `json:"contextWindow,omitempty"`
	EstimatedTokensPerDay int64                `json:"estimatedTokensPerDay"`
	Guardrails            AIWorkloadGuardrails `json:"guardrails"`
	OpenFindingsCount     int                  `json:"openFindingsCount"`
	Tags                  map[string]any       `json:"tags"`
	Metadata              map[string]any       `json:"metadata"`
	DiscoveredAt          time.Time            `json:"discoveredAt"`
}

type AIWorkloadsResponse struct {
	Summary   AIWorkloadSummary `json:"summary"`
	Workloads []AIWorkloadItem  `json:"workloads"`
}

func (h *Handler) getAIWorkloads(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT 
			r.id::text, 
			r.cloud_account_id::text, 
			r.provider, 
			r.service, 
			r.resource_type, 
			r.resource_id, 
			r.name, 
			r.region, 
			r.status, 
			r.monthly_cost, 
			r.tags, 
			r.metadata, 
			r.discovered_at,
			(SELECT count(*) FROM policy_findings f WHERE f.cloud_resource_id = r.id AND f.status = 'open') AS open_findings
		FROM cloud_resources r
		WHERE r.organisation_id = $1::uuid AND r.resource_type IN ('ai_model', 'ai_endpoint')
		ORDER BY r.monthly_cost DESC, r.name ASC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to query AI workloads: " + err.Error()})
		return
	}
	defer rows.Close()

	workloads := make([]AIWorkloadItem, 0)
	var summary AIWorkloadSummary

	for rows.Next() {
		var item AIWorkloadItem
		var tagsJSON, metaJSON []byte
		if err := rows.Scan(
			&item.ID, &item.AccountID, &item.Provider, &item.Service, &item.ResourceType,
			&item.ResourceID, &item.Name, &item.Region, &item.Status, &item.MonthlyCost,
			&tagsJSON, &metaJSON, &item.DiscoveredAt, &item.OpenFindingsCount,
		); err == nil {
			item.Tags = make(map[string]any)
			item.Metadata = make(map[string]any)
			if len(tagsJSON) > 0 {
				_ = json.Unmarshal(tagsJSON, &item.Tags)
			}
			if len(metaJSON) > 0 {
				_ = json.Unmarshal(metaJSON, &item.Metadata)
			}

			// Model provider extraction
			modelProv, _ := item.Metadata["provider"].(string)
			if modelProv == "" {
				lowerName := strings.ToLower(item.Name)
				if strings.Contains(lowerName, "claude") {
					modelProv = "Anthropic"
				} else if strings.Contains(lowerName, "gemini") {
					modelProv = "Google"
				} else if strings.Contains(lowerName, "gpt") {
					modelProv = "OpenAI"
				} else if strings.Contains(lowerName, "mistral") {
					modelProv = "Mistral AI"
				} else if strings.Contains(lowerName, "titan") {
					modelProv = "Amazon"
				} else if strings.Contains(lowerName, "llama") {
					modelProv = "Meta"
				} else {
					modelProv = strings.ToUpper(item.Provider)
				}
			}
			item.ModelProvider = modelProv

			// Context window
			if cw, ok := item.Metadata["contextWindow"].(float64); ok {
				item.ContextWindow = int(cw)
			} else if cw, ok := item.Metadata["contextWindow"].(int); ok {
				item.ContextWindow = cw
			}

			// Estimated tokens per day
			item.EstimatedTokensPerDay = int64(item.MonthlyCost * 38500)

			// Guardrails evaluation
			_, hasKms := item.Metadata["kmsKey"]
			if item.Provider == "azure" {
				hasKms = true
			}
			hasAudit := true
			if logging, ok := item.Metadata["invocationLogging"].(bool); ok && !logging {
				hasAudit = false
			}
			hasPII := true
			if pii, ok := item.Metadata["piiMasking"].(bool); ok && !pii {
				hasPII = false
			}

			item.Guardrails = AIWorkloadGuardrails{
				PIIFiltering:      hasPII,
				ModelAuditLogging: hasAudit,
				KMSEncryption:     hasKms,
			}

			summary.TotalAIWorkloads++
			summary.MonthlyAISpend += item.MonthlyCost
			if item.ResourceType == "ai_endpoint" {
				summary.ActiveEndpoints++
			} else {
				summary.FoundationModels++
			}

			if item.OpenFindingsCount == 0 {
				summary.GuardrailsCompliantCount++
			} else {
				summary.GuardrailsViolationsCount++
			}

			workloads = append(workloads, item)
		}
	}

	summary.MonthlyAISpend = math.Round(summary.MonthlyAISpend*100) / 100

	writeJSON(w, http.StatusOK, AIWorkloadsResponse{
		Summary:   summary,
		Workloads: workloads,
	})
}

type ApplyRemediationRequest struct {
	FindingID       *string `json:"findingId,omitempty"`
	ResourceID      *string `json:"resourceId,omitempty"`
	Guardrail       *string `json:"guardrail,omitempty"`
	RemediationType string  `json:"remediationType"` // "terraform" or "cli"
}

type ApplyRemediationResponse struct {
	Title           string   `json:"title"`
	RemediationType string   `json:"remediationType"`
	TargetResource  string   `json:"targetResource"`
	Provider        string   `json:"provider"`
	Code            string   `json:"code"`
	Instructions    []string `json:"instructions"`
}

func (h *Handler) applyRemediationBlueprint(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	var req ApplyRemediationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	remediationType := strings.ToLower(req.RemediationType)
	if remediationType == "" {
		remediationType = "terraform"
	}

	var resourceName, provider, service, ruleName string

	if req.FindingID != nil && *req.FindingID != "" {
		_ = h.pool.QueryRow(r.Context(), `
			SELECT f.rule_name, COALESCE(r.name, 'Cloud Resource'), COALESCE(r.provider, 'aws'), COALESCE(r.service, 'Cloud')
			FROM policy_findings f
			LEFT JOIN cloud_resources r ON r.id = f.cloud_resource_id
			WHERE f.id = $1::uuid AND f.organisation_id = $2::uuid
		`, *req.FindingID, orgID).Scan(&ruleName, &resourceName, &provider, &service)
	} else if req.ResourceID != nil && *req.ResourceID != "" {
		_ = h.pool.QueryRow(r.Context(), `
			SELECT name, provider, service FROM cloud_resources WHERE id = $1::uuid AND organisation_id = $2::uuid
		`, *req.ResourceID, orgID).Scan(&resourceName, &provider, &service)
		if req.Guardrail != nil {
			ruleName = *req.Guardrail
		}
	}

	if resourceName == "" {
		resourceName = "ai-inference-cluster"
		provider = "aws"
		service = "Amazon Bedrock"
	}

	var title, code string
	var instructions []string

	if strings.Contains(ruleName, "logging") || strings.Contains(ruleName, "audit") {
		title = fmt.Sprintf("Enable Model Invocation Audit Logging on %s", resourceName)
		if remediationType == "cli" {
			code = fmt.Sprintf(`# 1. Enable Bedrock Invocation Logging via AWS CLI
aws bedrock put-model-invocation-logging-configuration \
  --logging-config '{
    "cloudWatchConfig": {
      "logGroupName": "/aws/bedrock/invocations",
      "roleArn": "arn:aws:iam::123456789012:role/BedrockLoggingRole"
    },
    "s3Config": {
      "bucketName": "cloudpilot-ai-audit-logs",
      "keyPrefix": "bedrock/%s"
    },
    "textDataDeliveryEnabled": true
  }'`, resourceName)
		} else {
			code = fmt.Sprintf(`resource "aws_bedrock_model_invocation_logging_configuration" "ai_audit_logging" {
  logging_config {
    text_data_delivery_enabled  = true
    image_data_delivery_enabled = true
    
    cloudwatch_config {
      log_group_name = "/aws/bedrock/invocations/%s"
      role_arn       = aws_iam_role.bedrock_logging.arn
    }

    s3_config {
      bucket_name = aws_s3_bucket.ai_audit_logs.id
      key_prefix  = "bedrock-telemetry"
    }
  }
}`, resourceName)
		}
		instructions = []string{
			"1. Verify target IAM role has 'logs:CreateLogStream' and 'logs:PutLogEvents' permissions.",
			"2. Apply this blueprint to enforce centralized prompt hashing and audit trails.",
			"3. In CloudPilot, click 'Evaluate Policies' to confirm resolution.",
		}
	} else if strings.Contains(ruleName, "pii") || strings.Contains(ruleName, "masking") {
		title = fmt.Sprintf("Attach Enterprise PII Masking Guardrails to %s", resourceName)
		if remediationType == "cli" {
			code = fmt.Sprintf(`# 1. Create Bedrock PII Masking Guardrail
aws bedrock create-guardrail \
  --name "cloudpilot-pii-guardrail-%s" \
  --description "Automated PII redaction for foundation models" \
  --blocked-input-messaging "Input contained restricted PII entities." \
  --blocked-outputs-messaging "Response redacted per enterprise PII policy." \
  --sensitive-information-policy-config '{
    "piiEntitiesConfig": [
      {"type": "EMAIL", "action": "ANONYMIZE"},
      {"type": "PHONE", "action": "ANONYMIZE"},
      {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "BLOCK"},
      {"type": "US_SOCIAL_SECURITY_NUMBER", "action": "BLOCK"}
    ]
  }'`, resourceName)
		} else {
			code = fmt.Sprintf(`resource "aws_bedrock_guardrail" "pii_guardrail" {
  name                      = "cloudpilot-pii-%s"
  description               = "Automated PII redaction and sensitive entity masking"
  blocked_input_messaging   = "Input blocked: contains unauthorized sensitive data."
  blocked_outputs_messaging = "Output anonymized: PII redacted by enterprise guardrail."

  sensitive_information_policy_config {
    pii_entities_config {
      type   = "EMAIL"
      action = "ANONYMIZE"
    }
    pii_entities_config {
      type   = "PHONE"
      action = "ANONYMIZE"
    }
    pii_entities_config {
      type   = "CREDIT_DEBIT_CARD_NUMBER"
      action = "BLOCK"
    }
    pii_entities_config {
      type   = "US_SOCIAL_SECURITY_NUMBER"
      action = "BLOCK"
    }
  }
}`, resourceName)
		}
		instructions = []string{
			"1. Deploy the guardrail resource to your AWS account.",
			"2. Associate the guardrail ID with your model invocation SDK wrapper or API gateway.",
			"3. Re-run compliance scan in CloudPilot.",
		}
	} else if strings.Contains(ruleName, "s3") || strings.Contains(ruleName, "public") {
		title = fmt.Sprintf("Enforce S3 Block Public Access on %s", resourceName)
		if remediationType == "cli" {
			code = fmt.Sprintf(`# 1. Block Public Access via AWS CLI
aws s3api put-public-access-block \
  --bucket "%s" \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'`, resourceName)
		} else {
			code = fmt.Sprintf(`resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket = "%s"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`, resourceName)
		}
		instructions = []string{
			"1. Apply access block configuration to the designated S3 bucket.",
			"2. Verify IAM bucket policies do not contain wildcards ('*') in the Principal field.",
		}
	} else {
		// Default KMS CMK encryption blueprint
		title = fmt.Sprintf("Attach Customer-Managed KMS Key to %s", resourceName)
		if remediationType == "cli" {
			code = fmt.Sprintf(`# 1. Update endpoint with Customer-Managed KMS Key
aws sagemaker update-endpoint \
  --endpoint-name "%s" \
  --kms-key-id "arn:aws:kms:us-east-1:123456789012:key/ai-workload-cmk"`, resourceName)
		} else {
			code = fmt.Sprintf(`resource "aws_kms_key" "ai_endpoint_key" {
  description             = "Customer managed KMS key for %s"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_sagemaker_endpoint_configuration" "secure_config" {
  name_prefix = "%s-secure"
  kms_key_arn = aws_kms_key.ai_endpoint_key.arn

  production_variants {
    variant_name           = "AllTraffic"
    model_name             = "%s"
    initial_instance_count = 1
    instance_type          = "ml.g5.12xlarge"
  }
}`, resourceName, resourceName, resourceName)
		}
		instructions = []string{
			"1. Ensure the KMS key policy allows the AI service principal to perform 'kms:Decrypt' and 'kms:GenerateDataKey'.",
			"2. Apply configuration and trigger rolling update with zero downtime.",
		}
	}

	writeJSON(w, http.StatusOK, ApplyRemediationResponse{
		Title:           title,
		RemediationType: remediationType,
		TargetResource:  resourceName,
		Provider:        provider,
		Code:            code,
		Instructions:    instructions,
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
