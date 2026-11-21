package discovery

import (
	"context"
	"fmt"
)

type AzureScanner struct{}

func NewAzureScanner() *AzureScanner {
	return &AzureScanner{}
}

func (s *AzureScanner) Provider() string {
	return "azure"
}

func (s *AzureScanner) Scan(ctx context.Context, account CloudAccount) ([]DiscoveredResource, error) {
	subID := account.AccountIdentifier
	if subID == "" {
		subID = "sub-8849-01f2-98ab"
	}

	resources := []DiscoveredResource{
		// 1. Azure OpenAI Service
		{
			Provider:     "azure",
			Service:      "Azure OpenAI",
			ResourceType: "ai_model",
			ResourceID:   fmt.Sprintf("/subscriptions/%s/resourceGroups/rg-ai/providers/Microsoft.CognitiveServices/accounts/cog-openai/deployments/gpt-4o", subID),
			Name:         "gpt-4o-deployment",
			Region:       "eastus",
			Status:       "active",
			MonthlyCost:  380.00,
			Tags: map[string]any{
				"environment": "production",
				"framework":   "azure-openai",
			},
			Metadata: map[string]any{
				"model":       "gpt-4o",
				"version":     "2024-05-13",
				"tpmCapacity": 50000,
			},
		},
		{
			Provider:     "azure",
			Service:      "Azure OpenAI",
			ResourceType: "ai_model",
			ResourceID:   fmt.Sprintf("/subscriptions/%s/resourceGroups/rg-ai/providers/Microsoft.CognitiveServices/accounts/cog-openai/deployments/text-embedding-3", subID),
			Name:         "text-embedding-3-small",
			Region:       "eastus",
			Status:       "active",
			MonthlyCost:  52.00,
			Tags: map[string]any{
				"environment": "production",
			},
			Metadata: map[string]any{
				"model": "text-embedding-3-small",
			},
		},

		// 2. Azure Virtual Machines
		{
			Provider:     "azure",
			Service:      "Virtual Machines",
			ResourceType: "compute",
			ResourceID:   fmt.Sprintf("/subscriptions/%s/resourceGroups/rg-compute/providers/Microsoft.Compute/virtualMachines/vm-inference-node-01", subID),
			Name:         "vm-inference-node-01",
			Region:       "eastus",
			Status:       "running",
			MonthlyCost:  244.60,
			Tags: map[string]any{
				"environment": "production",
				"gpu":         "true",
			},
			Metadata: map[string]any{
				"vmSize": "Standard_NC4as_T4_v3",
			},
		},

		// 3. Azure Blob Storage
		{
			Provider:     "azure",
			Service:      "Blob Storage",
			ResourceType: "storage",
			ResourceID:   fmt.Sprintf("/subscriptions/%s/resourceGroups/rg-storage/providers/Microsoft.Storage/storageAccounts/staiweights", subID),
			Name:         "staiweights",
			Region:       "eastus",
			Status:       "active",
			MonthlyCost:  78.30,
			Tags: map[string]any{
				"environment": "production",
			},
			Metadata: map[string]any{
				"accountKind": "StorageV2",
				"replication": "GRS",
			},
		},
	}

	return resources, nil
}
