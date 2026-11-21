package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/cloudpilot/internal/config"
	"github.com/your-org/cloudpilot/internal/discovery"
	"github.com/your-org/cloudpilot/internal/migrations"
	"github.com/your-org/cloudpilot/internal/policy"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		logger.Error("worker requires DATABASE_URL to be set")
		os.Exit(1)
	}

	logger.Info("connecting worker to database...")
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Ensure database schema is migrated
	if err := migrations.Apply(ctx, pool); err != nil {
		logger.Error("migration check failed in worker", "error", err)
	}

	policyEngine := policy.NewEngine(pool)
	engine := discovery.NewEngine(pool)
	engine.SetPolicyEvaluator(policyEngine.EvaluateAccount)
	logger.Info("autonomous cloud discovery & compliance engines initialized", "scanners", []string{"aws", "gcp", "azure"})

	// Immediate run on startup
	if synced, err := engine.SyncAllPending(ctx); err == nil && synced > 0 {
		logger.Info("initial discovery cycle completed", "syncedAccounts", synced)
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	logger.Info("worker discovery scheduler started (interval: 30s)")

	for {
		select {
		case <-ctx.Done():
			logger.Info("shutting down worker...")
			return
		case <-ticker.C:
			synced, err := engine.SyncAllPending(ctx)
			if err != nil {
				logger.Warn("discovery cycle encountered an error", "error", err)
			} else if synced > 0 {
				logger.Info("discovery cycle completed", "syncedAccounts", synced)
			}
		}
	}
}
