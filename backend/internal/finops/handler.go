package finops

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/cloudpilot/internal/audit"
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

	r.Get("/trends", h.getTrends)
	r.Get("/anomalies", h.getAnomalies)
	r.Get("/budgets", h.listBudgets)
	r.Post("/budgets", h.createBudget)
	r.Delete("/budgets/{id}", h.deleteBudget)

	return r
}

func (h *Handler) getTrends(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	trend, err := h.engine.GetCostTrends(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, trend)
}

func (h *Handler) getAnomalies(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	anomalies, err := h.engine.GetCostAnomalies(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, anomalies)
}

func (h *Handler) listBudgets(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	budgets, err := h.engine.ListBudgets(r.Context(), orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, budgets)
}

func (h *Handler) createBudget(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	userID := auth.GetUserID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	var req CreateBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.Name == "" || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Budget name and positive amount are required"})
		return
	}

	budget, err := h.engine.CreateBudget(r.Context(), orgID, req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, userID, "finops.budget.create", "budget", &budget.ID, map[string]any{
		"name":   budget.Name,
		"amount": budget.Amount,
		"period": budget.Period,
	})

	writeJSON(w, http.StatusCreated, budget)
}

func (h *Handler) deleteBudget(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	userID := auth.GetUserID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Organisation required"})
		return
	}

	budgetID := chi.URLParam(r, "id")
	if budgetID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Budget ID required"})
		return
	}

	if err := h.engine.DeleteBudget(r.Context(), orgID, budgetID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, userID, "finops.budget.delete", "budget", &budgetID, nil)

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
