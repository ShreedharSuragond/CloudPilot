package discovery

import (
	"context"
	"time"
)

type DiscoveredResource struct {
	Provider     string         `json:"provider"`
	Service      string         `json:"service"`
	ResourceType string         `json:"resourceType"` // compute, storage, database, network, ai_model, ai_endpoint
	ResourceID   string         `json:"resourceId"`
	Name         string         `json:"name"`
	Region       string         `json:"region"`
	Status       string         `json:"status"` // running, stopped, active, degraded
	MonthlyCost  float64        `json:"monthlyCost"`
	Tags         map[string]any `json:"tags"`
	Metadata     map[string]any `json:"metadata"`
}

type CloudAccount struct {
	ID                string     `json:"id"`
	OrganisationID    string     `json:"organisationId"`
	Provider          string     `json:"provider"`
	Name              string     `json:"name"`
	AccountIdentifier string     `json:"accountIdentifier"`
	RoleArn           *string    `json:"roleArn"`
	ExternalID        *string    `json:"externalId"`
	Status            string     `json:"status"`
	LastSyncAt        *time.Time `json:"lastSyncAt"`
	ErrorMessage      *string    `json:"errorMessage"`
	CreatedAt         time.Time  `json:"createdAt"`
}

type Scanner interface {
	Provider() string
	Scan(ctx context.Context, account CloudAccount) ([]DiscoveredResource, error)
}

type SyncResult struct {
	AccountID       string    `json:"accountId"`
	TotalDiscovered int       `json:"totalDiscovered"`
	SyncedAt        time.Time `json:"syncedAt"`
}
