package ai

import (
	"context"
	"testing"

	"github.com/your-org/cloudpilot/internal/config"
)

func TestAIFactoryDefaultsToMock(t *testing.T) {
	cfg := config.Config{
		AIProvider: "mock",
	}
	provider := New(cfg)
	if provider.Name() != "mock" {
		t.Fatalf("expected provider 'mock', got %s", provider.Name())
	}

	snapshot := CloudSnapshot{
		TotalResources:    42,
		MonthlySpend:      1250.00,
		ActiveAIWorkloads: 3,
		ComplianceScore:   92.5,
	}

	insights, err := provider.GenerateInsights(context.Background(), snapshot)
	if err != nil {
		t.Fatalf("unexpected error generating insights: %v", err)
	}
	if len(insights) == 0 {
		t.Fatalf("expected insights to be non-empty")
	}

	chatResponse, err := provider.Chat(context.Background(), []ChatMessage{
		{Role: "user", Content: "What is our monthly cloud spend?"},
	}, snapshot)
	if err != nil {
		t.Fatalf("unexpected error in chat: %v", err)
	}
	if chatResponse == "" {
		t.Fatalf("expected non-empty chat response")
	}
}
