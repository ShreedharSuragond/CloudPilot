package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/your-org/cloudpilot/internal/auth"
)

type Event struct {
	ID             int64          `json:"id"`
	OrganisationID *string        `json:"organisationId,omitempty"`
	ActorUserID    *string        `json:"actorUserId,omitempty"`
	ActorEmail     *string        `json:"actorEmail,omitempty"`
	ActorName      *string        `json:"actorName,omitempty"`
	Action         string         `json:"action"`
	TargetType     string         `json:"targetType"`
	TargetID       *string        `json:"targetId,omitempty"`
	Metadata       map[string]any `json:"metadata"`
	CreatedAt      time.Time      `json:"createdAt"`
}

// Log records an audit event in the database.
func Log(ctx context.Context, pool *pgxpool.Pool, orgID, actorUserID, action, targetType string, targetID *string, metadata map[string]any) {
	if pool == nil {
		return
	}
	if metadata == nil {
		metadata = make(map[string]any)
	}
	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO audit_events (organisation_id, actor_user_id, action, target_type, target_id, metadata, created_at)
		VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, $4, $5, $6, now())
	`, orgID, actorUserID, action, targetType, targetID, metaJSON)
	if err != nil {
		slog.Warn("failed to record audit event", "action", action, "error", err)
	}
}

type Handler struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/events", h.listEvents)
	return r
}

func (h *Handler) listEvents(w http.ResponseWriter, r *http.Request) {
	orgID := auth.GetOrgID(r.Context())
	if orgID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Organisation ID missing"})
		return
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT 
			a.id, 
			a.organisation_id::text, 
			a.actor_user_id::text, 
			COALESCE(u.email, 'system'), 
			COALESCE(u.name, 'System'), 
			a.action, 
			a.target_type, 
			a.target_id, 
			a.metadata, 
			a.created_at
		FROM audit_events a
		LEFT JOIN users u ON u.id = a.actor_user_id
		WHERE a.organisation_id = $1::uuid
		ORDER BY a.created_at DESC
		LIMIT 50
	`, orgID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to query audit events"})
		return
	}
	defer rows.Close()

	events := make([]Event, 0)
	for rows.Next() {
		var e Event
		var metaJSON []byte
		if err := rows.Scan(
			&e.ID, &e.OrganisationID, &e.ActorUserID,
			&e.ActorEmail, &e.ActorName, &e.Action,
			&e.TargetType, &e.TargetID, &metaJSON, &e.CreatedAt,
		); err == nil {
			if len(metaJSON) > 0 {
				_ = json.Unmarshal(metaJSON, &e.Metadata)
			}
			events = append(events, e)
		}
	}

	writeJSON(w, http.StatusOK, events)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
