package auth

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/your-org/cloudpilot/internal/config"
)

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

func TestResolveRedirect(t *testing.T) {
	origins := []string{"https://app.cloudpilot.com", "http://localhost:5173"}

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty string defaults to frontend dashboard", "", "https://app.cloudpilot.com/dashboard"},
		{"relative path prefixes with frontend origin", "/inventory", "https://app.cloudpilot.com/inventory"},
		{"relative settings path", "/settings", "https://app.cloudpilot.com/settings"},
		{"untrusted external url blocked", "https://evil.com/phish", "https://app.cloudpilot.com/dashboard"},
		{"protocol relative blocked", "//evil.com", "https://app.cloudpilot.com/dashboard"},
		{"backslash protocol relative blocked", "/\\evil.com", "https://app.cloudpilot.com/dashboard"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveRedirect(tt.input, origins)
			if got != tt.expected {
				t.Errorf("resolveRedirect(%q) = %q, expected %q", tt.input, got, tt.expected)
			}
		})
	}

	// Test fallback when origins list is empty
	t.Run("empty origins returns relative path", func(t *testing.T) {
		got := resolveRedirect("/dashboard", nil)
		if got != "/dashboard" {
			t.Errorf("resolveRedirect('/dashboard', nil) = %q, expected '/dashboard'", got)
		}
	})
}
