package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-org/cloudpilot/internal/ai"
	"github.com/your-org/cloudpilot/internal/audit"
	"github.com/your-org/cloudpilot/internal/auth"
	"github.com/your-org/cloudpilot/internal/config"
	"github.com/your-org/cloudpilot/internal/discovery"
	"github.com/your-org/cloudpilot/internal/finops"
	"github.com/your-org/cloudpilot/internal/governance"
	"github.com/your-org/cloudpilot/internal/integrations"
	"github.com/your-org/cloudpilot/internal/organisations"
	"github.com/your-org/cloudpilot/internal/policy"
)

type healthResponse struct {
	Status string `json:"status"`
}

func corsMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	allowedMap := make(map[string]bool)
	for _, o := range allowedOrigins {
		allowedMap[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (allowedMap[origin] || allowedMap["*"]) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token, X-Organisation-ID")
				w.Header().Set("Access-Control-Expose-Headers", "Link, X-Organisation-ID")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func New(pool *pgxpool.Pool, logger *slog.Logger, cfg config.Config) http.Handler {
	router := chi.NewRouter()
	router.Use(corsMiddleware(cfg.CORSAllowedOrigins))
	router.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer)

	router.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
	})
	router.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if pool == nil {
			writeJSON(w, http.StatusServiceUnavailable, healthResponse{Status: "database_not_configured"})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			logger.Warn("readiness check failed", "error", err)
			writeJSON(w, http.StatusServiceUnavailable, healthResponse{Status: "database_unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, healthResponse{Status: "ready"})
	})
	authHandler := auth.New(pool, cfg)
	router.Mount("/auth", authHandler.Routes())

	policyEngine := policy.NewEngine(pool)
	discoveryEngine := discovery.NewEngine(pool)
	discoveryEngine.SetPolicyEvaluator(policyEngine.EvaluateAccount)

	aiProvider := ai.New(cfg)
	govHandler := governance.New(pool, authHandler, aiProvider, discoveryEngine)
	router.Mount("/api/v1", govHandler.Routes())

	orgHandler := organisations.New(pool, authHandler)
	router.Mount("/api/v1/organisations", orgHandler.Routes())

	policyHandler := policy.NewHandler(pool, policyEngine)
	router.Mount("/api/v1/policies", policyHandler.Routes(orgHandler.AuthMiddleware))

	auditHandler := audit.New(pool)
	router.Mount("/api/v1/audit", auditHandler.Routes(orgHandler.AuthMiddleware))

	finopsEngine := finops.NewEngine(pool)
	finopsHandler := finops.NewHandler(pool, finopsEngine)
	router.Mount("/api/v1/finops", finopsHandler.Routes(orgHandler.AuthMiddleware))

	integrationHandler := integrations.NewHandler(pool)
	router.Mount("/api/v1/settings/integrations", integrationHandler.Routes(orgHandler.AuthMiddleware))

	return router
}

func writeJSON(w http.ResponseWriter, status int, body healthResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
