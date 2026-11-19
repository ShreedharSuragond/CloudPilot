package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-org/cloudpilot/internal/config"
	migrationrunner "github.com/your-org/cloudpilot/internal/migrations"
	"github.com/your-org/cloudpilot/internal/server"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	var pool *pgxpool.Pool
	if cfg.DatabaseURL != "" {
		var err error
		pool, err = pgxpool.New(context.Background(), cfg.DatabaseURL)
		if err != nil {
			logger.Error("configure database connection", "error", err)
			os.Exit(1)
		}
		defer pool.Close()
		if err := migrationrunner.Apply(context.Background(), pool); err != nil {
			logger.Error("apply database migrations", "error", err)
			os.Exit(1)
		}
		logger.Info("database migrations applied")
	} else {
		logger.Warn("DATABASE_URL is unset; readiness will report unavailable")
	}

	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           server.New(pool, logger, cfg),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("API server listening", "address", cfg.HTTPAddr)
		serverErr <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Error("API server stopped", "error", err)
			os.Exit(1)
		}
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			logger.Error("graceful shutdown failed", "error", err)
			os.Exit(1)
		}
	}
}
