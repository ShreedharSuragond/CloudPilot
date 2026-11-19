package auth

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/your-org/cloudpilot/internal/config"
)

func TestDevLoginDisabledInProduction(t *testing.T) {
	cfg := config.Config{
		AppEnv:         "production",
		DevAuthEnabled: true,
	}
	h := New(nil, cfg)

	req := httptest.NewRequest("POST", "/dev-login", nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden in production, got %d", rec.Code)
	}

	body, _ := io.ReadAll(rec.Body)
	if !strings.Contains(string(body), "Development login is disabled") {
		t.Fatalf("unexpected response body: %s", string(body))
	}
}

func TestDevLoginRequiresDatabase(t *testing.T) {
	cfg := config.Config{
		AppEnv:         "development",
		DevAuthEnabled: true,
	}
	h := New(nil, cfg)

	req := httptest.NewRequest("POST", "/dev-login", nil)
	rec := httptest.NewRecorder()

	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 without database, got %d", rec.Code)
	}
}

func TestCallbackRejectsMissingOrMismatchedStateCookie(t *testing.T) {
	cfg := config.Config{
		AppEnv:       "development",
		OIDCIssuer:   "https://accounts.google.com",
		OIDCClientID: "test-client",
	}
	h := New(nil, cfg)

	// Test 1: No state cookie present
	req := httptest.NewRequest("GET", "/callback?code=fake-code&state=expected-state", nil)
	rec := httptest.NewRecorder()
	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request without state cookie, got %d", rec.Code)
	}
	body, _ := io.ReadAll(rec.Body)
	if !strings.Contains(string(body), "Invalid or missing OAuth state cookie") {
		t.Fatalf("unexpected body: %s", string(body))
	}

	// Test 2: Mismatched state cookie present
	req = httptest.NewRequest("GET", "/callback?code=fake-code&state=expected-state", nil)
	req.AddCookie(&http.Cookie{
		Name:  oauthStateCookieName,
		Value: "different-state",
	})
	rec = httptest.NewRecorder()
	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request with mismatched state cookie, got %d", rec.Code)
	}
	body, _ = io.ReadAll(rec.Body)
	if !strings.Contains(string(body), "Invalid or missing OAuth state cookie") {
		t.Fatalf("unexpected body: %s", string(body))
	}
}

func TestStartLoginRequiresOIDCConfig(t *testing.T) {
	cfg := config.Config{
		AppEnv: "development",
	}
	h := New(nil, cfg)

	req := httptest.NewRequest("GET", "/login", nil)
	rec := httptest.NewRecorder()
	h.Routes().ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 Service Unavailable when unconfigured, got %d", rec.Code)
	}
}
