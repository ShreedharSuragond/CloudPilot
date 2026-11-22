package config

import (
	"os"
	"testing"
)

func TestLoad_DatabaseURL(t *testing.T) {
	url := "postgres://cloudpilot:secret@localhost:5432/cloudpilot?sslmode=disable"
	os.Setenv("DATABASE_URL", url)
	defer os.Unsetenv("DATABASE_URL")

	cfg := Load()
	if cfg.DatabaseURL != url {
		t.Fatalf("expected DatabaseURL %q, got %q", url, cfg.DatabaseURL)
	}
}
