package server

import (
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/your-org/cloudpilot/internal/config"
)

func TestHealthEndpoint(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "/healthz", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != 200 {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected response body: %s", recorder.Body.String())
	}
}

func TestReadinessRequiresDatabase(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "/readyz", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != 503 {
		t.Fatalf("expected status 503 without database, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"status":"database_not_configured"`) {
		t.Fatalf("unexpected response body: %s", recorder.Body.String())
	}
}
