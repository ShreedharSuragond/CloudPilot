package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/your-org/cloudpilot/internal/config"
	"github.com/your-org/cloudpilot/internal/seed"
)

const (
	sessionCookieName    = "cloudpilot_session"
	oauthStateCookieName = "cloudpilot_oauth_state"
)

type contextKey string

const (
	UserContextKey contextKey = "cloudpilot_user_id"
	OrgContextKey  contextKey = "cloudpilot_org_id"
	RoleContextKey contextKey = "cloudpilot_user_role"
)

func WithUser(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, UserContextKey, userID)
}

func WithOrg(ctx context.Context, orgID string) context.Context {
	return context.WithValue(ctx, OrgContextKey, orgID)
}

func WithRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, RoleContextKey, role)
}

func GetUserID(ctx context.Context) string {
	if v, ok := ctx.Value(UserContextKey).(string); ok {
		return v
	}
	return ""
}

func GetOrgID(ctx context.Context) string {
	if v, ok := ctx.Value(OrgContextKey).(string); ok {
		return v
	}
	return ""
}

func GetUserRole(ctx context.Context) string {
	if v, ok := ctx.Value(RoleContextKey).(string); ok {
		return v
	}
	return ""
}

type Handler struct {
	pool       *pgxpool.Pool
	cfg        config.Config
	providerMu sync.RWMutex
	provider   *oidc.Provider
}

func (h *Handler) getProvider(ctx context.Context) (*oidc.Provider, error) {
	h.providerMu.RLock()
	if h.provider != nil {
		p := h.provider
		h.providerMu.RUnlock()
		return p, nil
	}
	h.providerMu.RUnlock()

	h.providerMu.Lock()
	defer h.providerMu.Unlock()

	if h.provider != nil {
		return h.provider, nil
	}

	p, err := oidc.NewProvider(ctx, h.cfg.OIDCIssuer)
	if err != nil {
		return nil, err
	}
	h.provider = p
	return p, nil
}

type meResponse struct {
	User        currentUser  `json:"user"`
	Memberships []membership `json:"memberships"`
}

type currentUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type membership struct {
	OrganisationID   string `json:"organisationId"`
	OrganisationName string `json:"organisationName"`
	Role             string `json:"role"`
}

func New(pool *pgxpool.Pool, cfg config.Config) *Handler {
	return &Handler{pool: pool, cfg: cfg}
}

func (h *Handler) Routes() http.Handler {
	router := chi.NewRouter()
	router.Get("/config", h.config)
	router.Get("/login", h.startLogin)
	router.Get("/register", h.startRegistration)
	router.Get("/callback", h.callback)
	router.Get("/me", h.me)
	router.Post("/logout", h.logout)
	return router
}

func (h *Handler) config(w http.ResponseWriter, _ *http.Request) {
	enabled := h.cfg.OIDCIssuer != "" && h.cfg.OIDCClientID != "" && h.cfg.OIDCRedirect != ""
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":          enabled,
		"clientConfigured": h.cfg.OIDCClientID != "",
	})
}

func (h *Handler) startLogin(w http.ResponseWriter, r *http.Request) {
	h.startAuthorization(w, r, false)
}

func (h *Handler) startRegistration(w http.ResponseWriter, r *http.Request) {
	h.startAuthorization(w, r, true)
}

func (h *Handler) startAuthorization(w http.ResponseWriter, r *http.Request, registration bool) {
	if h.pool == nil || h.cfg.OIDCIssuer == "" || h.cfg.OIDCClientID == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "OIDC is not configured"})
		return
	}

	provider, err := h.getProvider(r.Context())
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "OIDC provider unavailable"})
		return
	}

	state, err := randomURLToken(32)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create login state"})
		return
	}
	nonce, err := randomURLToken(32)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create login nonce"})
		return
	}
	verifier, err := randomURLToken(48)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not create PKCE verifier"})
		return
	}

	redirectTo := resolveRedirect(r.URL.Query().Get("redirect"), h.cfg.CORSAllowedOrigins)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Opportunistically prune expired transactions to prevent row accumulation
	_, _ = h.pool.Exec(ctx, `DELETE FROM auth_transactions WHERE expires_at < now()`)

	if _, err := h.pool.Exec(ctx, `
		INSERT INTO auth_transactions (state, nonce, code_verifier, redirect_to, expires_at)
		VALUES ($1, $2, $3, $4, now() + interval '10 minutes')
		ON CONFLICT (state) DO UPDATE SET nonce = EXCLUDED.nonce, code_verifier = EXCLUDED.code_verifier,
			redirect_to = EXCLUDED.redirect_to, expires_at = EXCLUDED.expires_at
	`, state, nonce, verifier, redirectTo); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not start login"})
		return
	}

	h.writeCookie(w, r, oauthStateCookieName, state, 10*time.Minute)

	oauthConfig := h.oauthConfig(provider)
	params := []oauth2.AuthCodeOption{
		oauth2.S256ChallengeOption(verifier),
		oauth2.SetAuthURLParam("nonce", nonce),
	}
	if registration {
		params = append(params, oauth2.SetAuthURLParam("prompt", "select_account"))
	}

	http.Redirect(w, r, oauthConfig.AuthCodeURL(state, params...), http.StatusFound)
}

func (h *Handler) callback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	if state == "" || code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid OIDC callback"})
		return
	}

	// 1. Verify OAuth state cookie against URL query param to prevent Login CSRF
	stateCookie, err := r.Cookie(oauthStateCookieName)
	if err != nil || stateCookie.Value == "" || stateCookie.Value != state {
		h.writeCookie(w, r, oauthStateCookieName, "", -1)
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid or missing OAuth state cookie"})
		return
	}
	h.writeCookie(w, r, oauthStateCookieName, "", -1)

	// 2. Atomically consume the state and PKCE verifier on first read
	var nonce, verifier, redirectTo string
	err = h.pool.QueryRow(r.Context(), `
		DELETE FROM auth_transactions
		WHERE state = $1 AND expires_at > now()
		RETURNING nonce, code_verifier, redirect_to
	`, state).Scan(&nonce, &verifier, &redirectTo)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Login state expired or invalid"})
		return
	}

	// 3. Obtain cached OIDC provider
	provider, err := h.getProvider(r.Context())
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "OIDC provider unavailable"})
		return
	}
	oauthConfig := h.oauthConfig(provider)
	token, err := oauthConfig.Exchange(r.Context(), code, oauth2.VerifierOption(verifier))
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Could not exchange authorization code"})
		return
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "OIDC provider returned no ID token"})
		return
	}
	audience := h.cfg.OIDCAudience
	if audience == "" {
		audience = h.cfg.OIDCClientID
	}
	idToken, err := provider.Verifier(&oidc.Config{ClientID: audience}).Verify(r.Context(), rawIDToken)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid ID token"})
		return
	}
	if idToken.Nonce != nonce {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid login nonce"})
		return
	}

	// 4. Verify identity claims and email verification status
	var claims struct {
		Email         string `json:"email"`
		EmailVerified *bool  `json:"email_verified"`
		Name          string `json:"name"`
	}
	if err := idToken.Claims(&claims); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Could not read identity claims"})
		return
	}
	if claims.EmailVerified != nil && !*claims.EmailVerified {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "Email address is not verified by provider"})
		return
	}

	sessionToken, err := randomURLToken(32)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not create session"})
		return
	}
	tokenHash := hashToken(sessionToken)

	// 5. Atomic transaction for user creation/upsert, organisation/membership provisioning, and session creation
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not create session"})
		return
	}
	defer tx.Rollback(r.Context())

	var userID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO users (issuer, subject, email, name, last_login_at)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), now())
		ON CONFLICT (issuer, subject) DO UPDATE SET
			email = COALESCE(EXCLUDED.email, users.email),
			name = COALESCE(EXCLUDED.name, users.name),
			last_login_at = now()
		RETURNING id::text
	`, h.cfg.OIDCIssuer, idToken.Subject, claims.Email, claims.Name).Scan(&userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not create or update user"})
		return
	}

	// Ensure the user has at least one organisation and membership
	var membershipCount int
	if err := tx.QueryRow(r.Context(), `
		SELECT count(*) FROM memberships WHERE user_id = $1::uuid
	`, userID).Scan(&membershipCount); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not verify user memberships"})
		return
	}

	var newOrgID string
	if membershipCount == 0 {
		var invOrgID, invRole string
		err := tx.QueryRow(r.Context(), `
			SELECT organisation_id::text, role
			FROM organisation_invitations
			WHERE lower(email) = lower($1) AND expires_at > now() AND accepted_at IS NULL
			ORDER BY created_at DESC
			LIMIT 1
		`, claims.Email).Scan(&invOrgID, &invRole)

		if err == nil {
			if _, err := tx.Exec(r.Context(), `
				INSERT INTO memberships (organisation_id, user_id, role)
				VALUES ($1::uuid, $2::uuid, $3)
				ON CONFLICT (organisation_id, user_id) DO NOTHING
			`, invOrgID, userID, invRole); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not accept organisation invitation"})
				return
			}
			if _, err := tx.Exec(r.Context(), `
				UPDATE organisation_invitations
				SET accepted_at = now()
				WHERE organisation_id = $1::uuid AND lower(email) = lower($2)
			`, invOrgID, claims.Email); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not update invitation status"})
				return
			}
		} else {
			workspaceName := "My Workspace"
			if claims.Name != "" {
				workspaceName = claims.Name + "'s Workspace"
			}
			if err := tx.QueryRow(r.Context(), `
				INSERT INTO organisations (name)
				VALUES ($1)
				RETURNING id::text
			`, workspaceName).Scan(&newOrgID); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not create default workspace"})
				return
			}
			if _, err := tx.Exec(r.Context(), `
				INSERT INTO memberships (organisation_id, user_id, role)
				VALUES ($1::uuid, $2::uuid, 'owner')
				ON CONFLICT (organisation_id, user_id) DO NOTHING
			`, newOrgID, userID); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not assign workspace owner"})
				return
			}
		}
	}

	if _, err := tx.Exec(r.Context(), `
		INSERT INTO sessions (token_hash, user_id, expires_at)
		VALUES ($1, $2::uuid, now() + interval '12 hours')
	`, tokenHash, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not create session"})
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not finish login"})
		return
	}

	if newOrgID != "" {
		_ = seed.EnsureSampleData(r.Context(), h.pool, newOrgID)
	}

	h.writeCookie(w, r, sessionCookieName, sessionToken, 12*time.Hour)
	http.Redirect(w, r, redirectTo, http.StatusFound)
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	if h.pool == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "Database unavailable"})
		return
	}
	userID, ok := h.currentUserID(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
		return
	}

	var user currentUser
	if err := h.pool.QueryRow(r.Context(), `
		SELECT id::text, COALESCE(email, ''), COALESCE(name, '')
		FROM users
		WHERE id = $1::uuid AND status = 'active'
	`, userID).Scan(&user.ID, &user.Email, &user.Name); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
		return
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT o.id::text, o.name, m.role
		FROM memberships m
		JOIN organisations o ON o.id = m.organisation_id
		WHERE m.user_id = $1::uuid
		ORDER BY o.name
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not load memberships"})
		return
	}
	defer rows.Close()

	memberships := make([]membership, 0)
	for rows.Next() {
		var item membership
		if err := rows.Scan(&item.OrganisationID, &item.OrganisationName, &item.Role); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not load memberships"})
			return
		}
		memberships = append(memberships, item)
	}

	writeJSON(w, http.StatusOK, meResponse{User: user, Memberships: memberships})
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil && cookie.Value != "" && h.pool != nil {
		_, _ = h.pool.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash = $1`, hashToken(cookie.Value))
	}
	h.writeCookie(w, r, sessionCookieName, "", -1)
	h.writeCookie(w, r, oauthStateCookieName, "", -1)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

func (h *Handler) currentUserID(r *http.Request) (string, bool) {
	if h.pool == nil {
		return "", false
	}
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", false
	}
	var userID string
	err = h.pool.QueryRow(r.Context(), `
		SELECT s.user_id::text
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'
	`, hashToken(cookie.Value)).Scan(&userID)
	return userID, err == nil
}

func (h *Handler) Authenticate(r *http.Request) (string, string, bool) {
	userID, orgID, _, ok := h.AuthenticateWithRole(r)
	return userID, orgID, ok
}

func (h *Handler) AuthenticateWithRole(r *http.Request) (string, string, string, bool) {
	if h.pool == nil {
		return "", "", "", false
	}
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", "", "", false
	}

	requestedOrg := r.Header.Get("X-Organisation-ID")
	tokenHash := hashToken(cookie.Value)

	var userID, orgID, role string
	var errQuery error
	if requestedOrg != "" {
		errQuery = h.pool.QueryRow(r.Context(), `
			SELECT s.user_id::text, m.organisation_id::text, m.role
			FROM sessions s
			JOIN users u ON u.id = s.user_id
			JOIN memberships m ON m.user_id = u.id
			WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active' AND m.organisation_id = $2::uuid
			LIMIT 1
		`, tokenHash, requestedOrg).Scan(&userID, &orgID, &role)
	} else {
		errQuery = h.pool.QueryRow(r.Context(), `
			SELECT s.user_id::text, m.organisation_id::text, m.role
			FROM sessions s
			JOIN users u ON u.id = s.user_id
			JOIN memberships m ON m.user_id = u.id
			WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'active'
			ORDER BY m.created_at ASC
			LIMIT 1
		`, tokenHash).Scan(&userID, &orgID, &role)
	}

	return userID, orgID, role, errQuery == nil
}

func (h *Handler) writeCookie(w http.ResponseWriter, r *http.Request, name, value string, duration time.Duration) {
	secure := h.cfg.CookieSecure || r.TLS != nil
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	maxAge := int(duration.Seconds())
	expires := time.Now().Add(duration)
	if duration < 0 {
		maxAge = -1
		expires = time.Unix(0, 0)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   maxAge,
		Expires:  expires,
	})
}

// resolveRedirect safely returns the frontend destination URL, preventing open-redirect attacks.
func resolveRedirect(target string, allowedOrigins []string) string {
	base := ""
	if len(allowedOrigins) > 0 {
		base = allowedOrigins[0]
	}

	// Only allow safe relative paths (e.g. "/dashboard", "/inventory")
	if strings.HasPrefix(target, "/") && !strings.HasPrefix(target, "//") && !strings.HasPrefix(target, "/\\") {
		return base + target
	}

	return base + "/dashboard"
}

func (h *Handler) oauthConfig(provider *oidc.Provider) oauth2.Config {
	scopes := strings.Fields(h.cfg.OIDCScopes)
	if len(scopes) == 0 {
		scopes = []string{oidc.ScopeOpenID, "profile", "email"}
	}
	return oauth2.Config{
		ClientID:     h.cfg.OIDCClientID,
		ClientSecret: h.cfg.OIDCSecret,
		RedirectURL:  h.cfg.OIDCRedirect,
		Endpoint:     provider.Endpoint(),
		Scopes:       scopes,
	}
}

func randomURLToken(size int) (string, error) {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
