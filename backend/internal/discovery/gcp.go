package discovery

import (
	"context"
	"fmt"
)

type GCPScanner struct{}

func NewGCPScanner() *GCPScanner {
	return &GCPScanner{}
}

func (s *GCPScanner) Provider() string {
	return "gcp"
}

func (s *GCPScanner) Scan(ctx context.Context, account CloudAccount) ([]DiscoveredResource, error) {
	projID := account.AccountIdentifier
	if projID == "" {
		projID = "cloudpilot-prod-research"
	}

	resources := []DiscoveredResource{
		// 1. Vertex AI Foundation Models / Endpoints
		{
			Provider:     "gcp",
			Service:      "Vertex AI",
			ResourceType: "ai_endpoint",
			ResourceID:   fmt.Sprintf("projects/%s/locations/us-central1/endpoints/gemini-1-5-pro", projID),
			Name:         "gemini-1.5-pro-endpoint",
			Region:       "us-central1",
			Status:       "active",
			MonthlyCost:  318.00,
			Tags: map[string]any{
				"environment": "production",
				"team":        "data-science",
				"cost_center": "4200-ai",
			},
			Metadata: map[string]any{
				"model":         "gemini-1.5-pro",
				"provider":      "Google",
				"contextWindow": 1000000,
			},
		},
		{
			Provider:     "gcp",
			Service:      "Vertex AI",
			ResourceType: "ai_endpoint",
			ResourceID:   fmt.Sprintf("projects/%s/locations/us-central1/endpoints/gemini-1-5-flash", projID),
			Name:         "gemini-1.5-flash-endpoint",
			Region:       "us-central1",
			Status:       "active",
			MonthlyCost:  142.50,
			Tags: map[string]any{
				"environment": "production",
				"latency":     "ultra-low",
			},
			Metadata: map[string]any{
				"model":    "gemini-1.5-flash",
				"provider": "Google",
			},
		},

		// 2. Compute Engine VMs
		{
			Provider:     "gcp",
			Service:      "Compute Engine",
			ResourceType: "compute",
			ResourceID:   fmt.Sprintf("projects/%s/zones/us-central1-a/instances/analytics-core-01", projID),
			Name:         "analytics-core-01",
			Region:       "us-central1",
			Status:       "running",
			MonthlyCost:  192.80,
			Tags: map[string]any{
				"environment": "production",
				"tier":        "compute-optimized",
			},
			Metadata: map[string]any{
				"machineType": "c2-standard-8",
				"vCPU":        8,
				"memoryGB":    32,
			},
		},

		// 3. Cloud Storage
		{
			Provider:     "gcp",
			Service:      "Cloud Storage",
			ResourceType: "storage",
			ResourceID:   fmt.Sprintf("gs://vertex-models-%s", projID),
			Name:         fmt.Sprintf("vertex-models-%s", projID),
			Region:       "us-central1",
			Status:       "active",
			MonthlyCost:  64.10,
			Tags: map[string]any{
				"environment": "production",
				"purpose":     "model-weights",
			},
			Metadata: map[string]any{
				"storageClass": "STANDARD",
				"sizeGB":       1800,
			},
		},

		// 4. Cloud SQL Database
		{
			Provider:     "gcp",
			Service:      "Cloud SQL",
			ResourceType: "database",
			ResourceID:   fmt.Sprintf("projects/%s/instances/cloudsql-analytics", projID),
			Name:         "cloudsql-analytics",
			Region:       "us-central1",
			Status:       "runnable",
			MonthlyCost:  215.00,
			Tags: map[string]any{
				"environment": "production",
			},
			Metadata: map[string]any{
				"databaseVersion": "POSTGRES_15",
				"tier":            "db-custom-4-16384",
			},
		},
	}

	return resources, nil
}
