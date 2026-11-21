package integrations

import "time"

type Integration struct {
	ID              string     `json:"id"`
	OrganisationID  string     `json:"organisationId"`
	Name            string     `json:"name"`
	Provider        string     `json:"provider"` // slack, teams, discord, webhook
	WebhookURL      string     `json:"webhookUrl"`
	Events          []string   `json:"events"`
	Enabled         bool       `json:"enabled"`
	LastTriggeredAt *time.Time `json:"lastTriggeredAt,omitempty"`
	LastStatus      *string    `json:"lastStatus,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type CreateIntegrationRequest struct {
	Name       string   `json:"name"`
	Provider   string   `json:"provider"`
	WebhookURL string   `json:"webhookUrl"`
	Events     []string `json:"events,omitempty"`
}

type TestIntegrationResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
