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

type databaseHealth struct {
	Status      string `json:"status"`
	Latency     string `json:"latency,omitempty"`
	Message     string `json:"message,omitempty"`
	TotalConns  int32  `json:"total_connections,omitempty"`
	IdleConns   int32  `json:"idle_connections,omitempty"`
	ActiveConns int32  `json:"active_connections,omitempty"`
}

type healthResponse struct {
	Status      string         `json:"status"`
	Timestamp   time.Time      `json:"timestamp"`
	Uptime      string         `json:"uptime"`
	Environment string         `json:"environment"`
	Version     string         `json:"version"`
	Database    databaseHealth `json:"database"`
}

// Server encapsulates runtime infrastructure dependencies and routing.
type Server struct {
	pool      *pgxpool.Pool
	logger    *slog.Logger
	cfg       config.Config
	startTime time.Time
}

// handlersContainer aggregates domain HTTP handlers for clean route wiring.
type handlersContainer struct {
	auth        *auth.Handler
	org         *organisations.Handler
	gov         *governance.Handler
	policy      *policy.Handler
	audit       *audit.Handler
	finops      *finops.Handler
	integration *integrations.Handler
}

// New creates and wires the primary HTTP server handler.
func New(pool *pgxpool.Pool, logger *slog.Logger, cfg config.Config) http.Handler {
	s := &Server{
		pool:      pool,
		logger:    logger,
		cfg:       cfg,
		startTime: time.Now().UTC(),
	}

	return s.buildRoutes()
}

// buildRoutes sets up middleware, health probe, and application sub-routes.
func (s *Server) buildRoutes() http.Handler {
	router := chi.NewRouter()

	// Global middlewares
	router.Use(corsMiddleware(s.cfg.CORSAllowedOrigins))
	router.Use(middleware.RequestID, middleware.RealIP, middleware.Recoverer)

	// Initialize all domain modules and handlers
	handlers := s.initHandlers()

	// All endpoints are strictly prefixed under /cloudpilot
	router.Route("/cloudpilot", func(r chi.Router) {
		// Unified Health Probe (detailed system & database telemetry)
		r.Get("/healthz", s.handleHealthz)

		// Authentication Endpoints
		r.Mount("/auth", handlers.auth.Routes())

		// API v1 Domain Routes
		r.Route("/api/v1", func(v1 chi.Router) {
			// Specific module mounts
			v1.Mount("/organisations", handlers.org.Routes())
			v1.Mount("/policies", handlers.policy.Routes(handlers.org.AuthMiddleware))
			v1.Mount("/audit", handlers.audit.Routes(handlers.org.AuthMiddleware))
			v1.Mount("/finops", handlers.finops.Routes(handlers.org.AuthMiddleware))
			v1.Mount("/settings/integrations", handlers.integration.Routes(handlers.org.AuthMiddleware))

			// Governance, Dashboards, Accounts, Inventory, and Copilot
			v1.Mount("/", handlers.gov.Routes())
		})
	})

	return router
}

// initHandlers constructs and wires all domain engines and HTTP handlers.
func (s *Server) initHandlers() handlersContainer {
	authHandler := auth.New(s.pool, s.cfg)
	orgHandler := organisations.New(s.pool, authHandler)

	policyEngine := policy.NewEngine(s.pool)
	discoveryEngine := discovery.NewEngine(s.pool)
	discoveryEngine.SetPolicyEvaluator(policyEngine.EvaluateAccount)

	aiProvider := ai.New(s.cfg)
	govHandler := governance.New(s.pool, authHandler, aiProvider, discoveryEngine)
	policyHandler := policy.NewHandler(s.pool, policyEngine)
	auditHandler := audit.New(s.pool)
	finopsEngine := finops.NewEngine(s.pool)
	finopsHandler := finops.NewHandler(s.pool, finopsEngine)
	integrationHandler := integrations.NewHandler(s.pool)

	return handlersContainer{
		auth:        authHandler,
		org:         orgHandler,
		gov:         govHandler,
		policy:      policyHandler,
		audit:       auditHandler,
		finops:      finopsHandler,
		integration: integrationHandler,
	}
}

// System Health Probe - returns comprehensive operational and database status.
func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	env := s.cfg.AppEnv
	if env == "" {
		env = "development"
	}

	uptime := time.Since(s.startTime).Truncate(time.Second).String()

	resp := healthResponse{
		Status:      "ok",
		Timestamp:   time.Now().UTC(),
		Uptime:      uptime,
		Environment: env,
		Version:     "1.0.0",
		Database: databaseHealth{
			Status: "not_configured",
		},
	}

	if s.pool == nil {
		writeJSON(w, http.StatusOK, resp)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	start := time.Now()
	if err := s.pool.Ping(ctx); err != nil {
		s.logger.Warn("health check database ping failed", "error", err)
		resp.Status = "unhealthy"
		resp.Database = databaseHealth{
			Status:  "unavailable",
			Message: err.Error(),
		}
		writeJSON(w, http.StatusServiceUnavailable, resp)
		return
	}

	latency := time.Since(start)
	stats := s.pool.Stat()

	resp.Database = databaseHealth{
		Status:      "connected",
		Latency:     latency.Round(time.Microsecond).String(),
		TotalConns:  stats.TotalConns(),
		IdleConns:   stats.IdleConns(),
		ActiveConns: stats.AcquiredConns(),
	}

	writeJSON(w, http.StatusOK, resp)
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

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
