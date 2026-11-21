package policy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/cloudpilot/internal/auth"
)

type Handler struct {
	pool   *pgxpool.Pool
	engine *Engine
}

func NewHandler(pool *pgxpool.Pool, engine *Engine) *Handler {
	return &Handler{
		pool:   pool,
		engine: engine,
	}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/findings", h.listFindings)
	r.Get("/compliance-summary", h.getComplianceSummary)
	r.Post("/findings/{id}/suppress", h.suppressFinding)
	r.Post("/findings/{id}/resolve", h.resolveFinding)
	r.Post("/evaluate", h.evaluateOrg)

	return r
}

func getOrgID(r *http.Request) string {
	return auth.GetOrgID(r.Context())
}

func (h *Handler) listFindings(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	filterStatus := r.URL.Query().Get("status")
	filterSeverity := r.URL.Query().Get("severity")
	filterFramework := r.URL.Query().Get("framework")
	filterSearch := strings.TrimSpace(r.URL.Query().Get("search"))

	query := `
		SELECT 
			f.id::text, f.organisation_id::text, f.cloud_resource_id::text,
			COALESCE(r.name, 'Unknown Resource'), COALESCE(r.provider, 'cloud'), COALESCE(r.service, 'Security'),
			f.severity, f.rule_name, f.framework, f.description, f.remediation_guidance,
			f.status, f.suppression_reason, f.detected_at, f.resolved_at
		FROM policy_findings f
		LEFT JOIN cloud_resources r ON r.id = f.cloud_resource_id
		WHERE f.organisation_id = $1::uuid
	`
	args := []any{orgID}
	argIdx := 2

	if filterStatus != "" && filterStatus != "all" {
		query += fmt.Sprintf(" AND f.status = $%d", argIdx)
		args = append(args, filterStatus)
		argIdx++
	} else if filterStatus == "" {
		query += " AND f.status = 'open'"
	}

	if filterSeverity != "" {
		query += fmt.Sprintf(" AND f.severity = $%d", argIdx)
		args = append(args, filterSeverity)
		argIdx++
	}

	if filterFramework != "" {
		query += fmt.Sprintf(" AND f.framework = $%d", argIdx)
		args = append(args, filterFramework)
		argIdx++
	}

	if filterSearch != "" {
		query += fmt.Sprintf(" AND (f.rule_name ILIKE $%d OR f.description ILIKE $%d OR r.name ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+filterSearch+"%")
		argIdx++
	}

	query += `
		ORDER BY 
			CASE f.severity 
				WHEN 'critical' THEN 1 
				WHEN 'high' THEN 2 
				WHEN 'medium' THEN 3 
				ELSE 4 
			END,
			f.detected_at DESC
		LIMIT 100
	`

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to query policy findings"})
		return
	}
	defer rows.Close()

	findings := make([]Finding, 0)
	for rows.Next() {
		var f Finding
		var resID, suppReason *string
		if err := rows.Scan(
			&f.ID, &f.OrganisationID, &resID,
			&f.ResourceName, &f.Provider, &f.Service,
			&f.Severity, &f.RuleName, &f.Framework, &f.Description, &f.RemediationGuidance,
			&f.Status, &suppReason, &f.DetectedAt, &f.ResolvedAt,
		); err == nil {
			f.CloudResourceID = resID
			f.SuppressionReason = suppReason
			findings = append(findings, f)
		}
	}

	writeJSON(w, http.StatusOK, findings)
}

func (h *Handler) getComplianceSummary(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	summary, err := h.engine.GetComplianceSummary(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to calculate compliance summary"})
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func (h *Handler) suppressFinding(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	findingID := chi.URLParam(r, "id")

	var req SuppressRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "Suppressed by security admin"
	}

	err := h.engine.SuppressFinding(r.Context(), orgID, findingID, reason)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to suppress finding"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "suppressed", "reason": reason})
}

func (h *Handler) resolveFinding(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	findingID := chi.URLParam(r, "id")

	err := h.engine.ResolveFinding(r.Context(), orgID, findingID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to resolve finding"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "resolved"})
}

func (h *Handler) evaluateOrg(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	count, err := h.engine.EvaluateOrg(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Evaluation failed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":          "evaluated",
		"totalViolations": count,
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
