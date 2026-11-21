package server

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"testing"

	"github.com/your-org/cloudpilot/internal/config"
)

func TestHealthEndpointDetailed(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{
		AppEnv: "production",
	})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "/cloudpilot/healthz", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != 200 {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var resp healthResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}

	if resp.Status != "ok" {
		t.Errorf("expected status 'ok', got '%s'", resp.Status)
	}
	if resp.Environment != "production" {
		t.Errorf("expected environment 'production', got '%s'", resp.Environment)
	}
	if resp.Version != "1.0.0" {
		t.Errorf("expected version '1.0.0', got '%s'", resp.Version)
	}
	if resp.Database.Status != "not_configured" {
		t.Errorf("expected database status 'not_configured', got '%s'", resp.Database.Status)
	}
	if resp.Uptime == "" {
		t.Errorf("expected non-empty uptime")
	}
	if resp.Timestamp.IsZero() {
		t.Errorf("expected valid non-zero timestamp")
	}
}

func TestReadyzRemovedReturns404(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "/cloudpilot/readyz", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != 404 {
		t.Fatalf("expected status 404 for removed /readyz endpoint, got %d", recorder.Code)
	}
}

func TestOrganisationsEndpointRequiresAuth(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "/cloudpilot/api/v1/organisations", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != 401 {
		t.Fatalf("expected status 401 without auth, got %d", recorder.Code)
	}
}

func TestAuditEndpointRequiresAuth(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "/cloudpilot/api/v1/audit/events", nil)

	handler.ServeHTTP(recorder, request)

	if recorder.Code != 401 {
		t.Fatalf("expected status 401 without auth, got %d", recorder.Code)
	}
}

func TestPoliciesAndFinopsEndpointsRequireAuth(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})

	for _, path := range []string{
		"/cloudpilot/api/v1/policies/findings",
		"/cloudpilot/api/v1/finops/trends",
		"/cloudpilot/api/v1/settings/integrations",
		"/cloudpilot/api/v1/dashboard/summary",
	} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest("GET", path, nil)
		handler.ServeHTTP(recorder, request)

		if recorder.Code != 401 {
			t.Fatalf("path %s: expected status 401 without auth, got %d", path, recorder.Code)
		}
	}
}

func TestUnprefixedRoutesReturn404(t *testing.T) {
	handler := New(nil, slog.New(slog.NewTextHandler(io.Discard, nil)), config.Config{})

	// Without /cloudpilot prefix, routes should return 404 Not Found
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/healthz", nil)
	handler.ServeHTTP(rec, req)

	if rec.Code != 404 {
		t.Fatalf("expected status 404 for unprefixed /healthz, got %d", rec.Code)
	}

	rec2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/api/v1/organisations", nil)
	handler.ServeHTTP(rec2, req2)

	if rec2.Code != 404 {
		t.Fatalf("expected status 404 for unprefixed /api/v1/organisations, got %d", rec2.Code)
	}
}
