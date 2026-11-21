package organisations

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/your-org/cloudpilot/internal/audit"
	"github.com/your-org/cloudpilot/internal/auth"
)

const (
	userContextKey = auth.UserContextKey
	orgContextKey  = auth.OrgContextKey
	roleContextKey = auth.RoleContextKey
)

// GetUserID retrieves the authenticated user ID from context
func GetUserID(ctx context.Context) string {
	return auth.GetUserID(ctx)
}

// GetOrgID retrieves the active organisation ID from context
func GetOrgID(ctx context.Context) string {
	return auth.GetOrgID(ctx)
}

// GetUserRole retrieves the user's role in the active organisation from context
func GetUserRole(ctx context.Context) string {
	return auth.GetUserRole(ctx)
}

type Handler struct {
	pool        *pgxpool.Pool
	authHandler *auth.Handler
}

func New(pool *pgxpool.Pool, authHandler *auth.Handler) *Handler {
	return &Handler{
		pool:        pool,
		authHandler: authHandler,
	}
}

func (h *Handler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, orgID, role, ok := h.authHandler.AuthenticateWithRole(r)
		if !ok || userID == "" || orgID == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Authentication required"})
			return
		}

		ctx := auth.WithUser(r.Context(), userID)
		ctx = auth.WithOrg(ctx, orgID)
		ctx = auth.WithRole(ctx, role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) requireAdminOrOwner(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(roleContextKey).(string)
		if role != "owner" && role != "admin" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Admin or owner permission required"})
			return
		}
		next(w, r)
	}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(h.AuthMiddleware)

	// Workspaces / Organisations
	r.Get("/", h.listOrganisations)
	r.Post("/", h.createOrganisation)
	r.Get("/current", h.getCurrentOrganisation)

	// Members
	r.Get("/members", h.listMembers)
	r.Post("/members/{userId}/role", h.requireAdminOrOwner(h.updateMemberRole))
	r.Delete("/members/{userId}", h.requireAdminOrOwner(h.removeMember))

	// Invitations
	r.Get("/invitations", h.listInvitations)
	r.Post("/invitations", h.requireAdminOrOwner(h.createInvitation))
	r.Delete("/invitations/{id}", h.requireAdminOrOwner(h.revokeInvitation))

	return r
}

type OrganisationItem struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

func (h *Handler) listOrganisations(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(userContextKey).(string)

	rows, err := h.pool.Query(r.Context(), `
		SELECT o.id::text, o.name, m.role, o.created_at
		FROM organisations o
		JOIN memberships m ON m.organisation_id = o.id
		WHERE m.user_id = $1::uuid
		ORDER BY o.name ASC
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load organisations"})
		return
	}
	defer rows.Close()

	orgs := make([]OrganisationItem, 0)
	for rows.Next() {
		var o OrganisationItem
		if err := rows.Scan(&o.ID, &o.Name, &o.Role, &o.CreatedAt); err == nil {
			orgs = append(orgs, o)
		}
	}

	writeJSON(w, http.StatusOK, orgs)
}

type CreateOrgRequest struct {
	Name string `json:"name"`
}

func (h *Handler) createOrganisation(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(userContextKey).(string)

	var req CreateOrgRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Workspace name is required"})
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database error"})
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()

	var orgID string
	var createdAt time.Time
	err = tx.QueryRow(r.Context(), `
		INSERT INTO organisations (name)
		VALUES ($1)
		RETURNING id::text, created_at
	`, name).Scan(&orgID, &createdAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create organisation"})
		return
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO memberships (organisation_id, user_id, role)
		VALUES ($1::uuid, $2::uuid, 'owner')
	`, orgID, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to establish membership"})
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Transaction commit failed"})
		return
	}

	// Record audit event
	audit.Log(r.Context(), h.pool, orgID, userID, "organisation_created", "organisation", &orgID, map[string]any{
		"name": name,
	})

	writeJSON(w, http.StatusCreated, OrganisationItem{
		ID:        orgID,
		Name:      name,
		Role:      "owner",
		CreatedAt: createdAt,
	})
}

type CurrentOrgResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

func (h *Handler) getCurrentOrganisation(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)
	role, _ := r.Context().Value(roleContextKey).(string)

	var name string
	var createdAt time.Time
	err := h.pool.QueryRow(r.Context(), `
		SELECT name, created_at FROM organisations WHERE id = $1::uuid
	`, orgID).Scan(&name, &createdAt)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Organisation not found"})
		return
	}

	writeJSON(w, http.StatusOK, CurrentOrgResponse{
		ID:        orgID,
		Name:      name,
		Role:      role,
		CreatedAt: createdAt,
	})
}

type MemberItem struct {
	UserID   string    `json:"userId"`
	Email    string    `json:"email"`
	Name     string    `json:"name"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joinedAt"`
}

func (h *Handler) listMembers(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)

	rows, err := h.pool.Query(r.Context(), `
		SELECT u.id::text, COALESCE(u.email, ''), COALESCE(u.name, ''), m.role, m.created_at
		FROM memberships m
		JOIN users u ON u.id = m.user_id
		WHERE m.organisation_id = $1::uuid
		ORDER BY 
			CASE m.role 
				WHEN 'owner' THEN 1 
				WHEN 'admin' THEN 2 
				WHEN 'member' THEN 3 
				ELSE 4 
			END,
			m.created_at ASC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load members"})
		return
	}
	defer rows.Close()

	members := make([]MemberItem, 0)
	for rows.Next() {
		var m MemberItem
		if err := rows.Scan(&m.UserID, &m.Email, &m.Name, &m.Role, &m.JoinedAt); err == nil {
			members = append(members, m)
		}
	}

	writeJSON(w, http.StatusOK, members)
}

type UpdateRoleRequest struct {
	Role string `json:"role"`
}

func (h *Handler) updateMemberRole(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)
	actorUserID, _ := r.Context().Value(userContextKey).(string)
	targetUserID := chi.URLParam(r, "userId")

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	newRole := strings.ToLower(strings.TrimSpace(req.Role))
	if newRole != "owner" && newRole != "admin" && newRole != "member" && newRole != "viewer" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Role must be owner, admin, member, or viewer"})
		return
	}

	// Prevent demoting the last owner
	var currentRole string
	err := h.pool.QueryRow(r.Context(), `
		SELECT role FROM memberships WHERE organisation_id = $1::uuid AND user_id = $2::uuid
	`, orgID, targetUserID).Scan(&currentRole)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Member not found"})
		return
	}

	if currentRole == "owner" && newRole != "owner" {
		var ownerCount int
		_ = h.pool.QueryRow(r.Context(), `
			SELECT count(*) FROM memberships WHERE organisation_id = $1::uuid AND role = 'owner'
		`, orgID).Scan(&ownerCount)
		if ownerCount <= 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Cannot demote the last remaining owner"})
			return
		}
	}

	_, err = h.pool.Exec(r.Context(), `
		UPDATE memberships SET role = $1 WHERE organisation_id = $2::uuid AND user_id = $3::uuid
	`, newRole, orgID, targetUserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update role"})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, actorUserID, "member_role_updated", "user", &targetUserID, map[string]any{
		"oldRole": currentRole,
		"newRole": newRole,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "role_updated", "role": newRole})
}

func (h *Handler) removeMember(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)
	actorUserID, _ := r.Context().Value(userContextKey).(string)
	targetUserID := chi.URLParam(r, "userId")

	var currentRole string
	err := h.pool.QueryRow(r.Context(), `
		SELECT role FROM memberships WHERE organisation_id = $1::uuid AND user_id = $2::uuid
	`, orgID, targetUserID).Scan(&currentRole)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Member not found"})
		return
	}

	if currentRole == "owner" {
		var ownerCount int
		_ = h.pool.QueryRow(r.Context(), `
			SELECT count(*) FROM memberships WHERE organisation_id = $1::uuid AND role = 'owner'
		`, orgID).Scan(&ownerCount)
		if ownerCount <= 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Cannot remove the last remaining owner"})
			return
		}
	}

	_, err = h.pool.Exec(r.Context(), `
		DELETE FROM memberships WHERE organisation_id = $1::uuid AND user_id = $2::uuid
	`, orgID, targetUserID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to remove member"})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, actorUserID, "member_removed", "user", &targetUserID, map[string]any{
		"removedRole": currentRole,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "member_removed"})
}

type InvitationItem struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

func (h *Handler) listInvitations(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)

	rows, err := h.pool.Query(r.Context(), `
		SELECT id::text, email, role, expires_at, created_at
		FROM organisation_invitations
		WHERE organisation_id = $1::uuid AND accepted_at IS NULL AND expires_at > now()
		ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load invitations"})
		return
	}
	defer rows.Close()

	invitations := make([]InvitationItem, 0)
	for rows.Next() {
		var inv InvitationItem
		if err := rows.Scan(&inv.ID, &inv.Email, &inv.Role, &inv.ExpiresAt, &inv.CreatedAt); err == nil {
			invitations = append(invitations, inv)
		}
	}

	writeJSON(w, http.StatusOK, invitations)
}

type CreateInvitationRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *Handler) createInvitation(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)
	actorUserID, _ := r.Context().Value(userContextKey).(string)

	var req CreateInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	role := strings.ToLower(strings.TrimSpace(req.Role))
	if email == "" || !strings.Contains(email, "@") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Valid email address is required"})
		return
	}
	if role != "owner" && role != "admin" && role != "member" && role != "viewer" {
		role = "member"
	}

	// Check if user is already a member
	var exists bool
	_ = h.pool.QueryRow(r.Context(), `
		SELECT true FROM memberships m
		JOIN users u ON u.id = m.user_id
		WHERE m.organisation_id = $1::uuid AND LOWER(u.email) = $2
	`, orgID, email).Scan(&exists)
	if exists {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "User with this email is already a member of this workspace"})
		return
	}

	var invID string
	var expiresAt, createdAt time.Time
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO organisation_invitations (organisation_id, email, role, expires_at, created_at)
		VALUES ($1::uuid, $2, $3, now() + interval '7 days', now())
		ON CONFLICT (organisation_id, email)
		DO UPDATE SET role = EXCLUDED.role, expires_at = now() + interval '7 days'
		RETURNING id::text, expires_at, created_at
	`, orgID, email, role).Scan(&invID, &expiresAt, &createdAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create invitation"})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, actorUserID, "invitation_created", "invitation", &invID, map[string]any{
		"email": email,
		"role":  role,
	})

	writeJSON(w, http.StatusCreated, InvitationItem{
		ID:        invID,
		Email:     email,
		Role:      role,
		ExpiresAt: expiresAt,
		CreatedAt: createdAt,
	})
}

func (h *Handler) revokeInvitation(w http.ResponseWriter, r *http.Request) {
	orgID, _ := r.Context().Value(orgContextKey).(string)
	actorUserID, _ := r.Context().Value(userContextKey).(string)
	invID := chi.URLParam(r, "id")

	var email string
	err := h.pool.QueryRow(r.Context(), `
		DELETE FROM organisation_invitations
		WHERE id = $1::uuid AND organisation_id = $2::uuid
		RETURNING email
	`, invID, orgID).Scan(&email)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Invitation not found"})
		return
	}

	audit.Log(r.Context(), h.pool, orgID, actorUserID, "invitation_revoked", "invitation", &invID, map[string]any{
		"email": email,
	})

	writeJSON(w, http.StatusOK, map[string]string{"status": "invitation_revoked"})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
