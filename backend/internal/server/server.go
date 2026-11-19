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

	"github.com/your-org/cloudpilot/internal/auth"
	"github.com/your-org/cloudpilot/internal/config"
)

type healthResponse struct {
	Status string `json:"status"`
}

func New(pool *pgxpool.Pool, logger *slog.Logger, cfg config.Config) http.Handler {
	router := chi.NewRouter()
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
	return router
}

func writeJSON(w http.ResponseWriter, status int, body healthResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
