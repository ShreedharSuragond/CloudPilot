package discovery

import (
	"context"
	"testing"
)

func TestAWSScanner(t *testing.T) {
	scanner := NewAWSScanner()
	if scanner.Provider() != "aws" {
		t.Fatalf("expected provider 'aws', got %s", scanner.Provider())
	}

	account := CloudAccount{
		ID:                "test-acc-1",
		OrganisationID:    "test-org-1",
		Provider:          "aws",
		AccountIdentifier: "112233445566",
		Name:              "Production AWS",
	}

	resources, err := scanner.Scan(context.Background(), account)
	if err != nil {
		t.Fatalf("unexpected scan error: %v", err)
	}

	if len(resources) == 0 {
		t.Fatalf("expected discovered resources, got 0")
	}

	hasBedrock := false
	hasEC2 := false
	for _, res := range resources {
		if res.Provider != "aws" {
			t.Errorf("expected provider aws, got %s", res.Provider)
		}
		if res.Service == "Amazon Bedrock" && res.ResourceType == "ai_model" {
			hasBedrock = true
		}
		if res.Service == "Amazon EC2" && res.ResourceType == "compute" {
			hasEC2 = true
		}
	}

	if !hasBedrock {
		t.Errorf("expected Bedrock AI model in discovered resources")
	}
	if !hasEC2 {
		t.Errorf("expected EC2 compute in discovered resources")
	}
}

func TestGCPScanner(t *testing.T) {
	scanner := NewGCPScanner()
	if scanner.Provider() != "gcp" {
		t.Fatalf("expected provider 'gcp', got %s", scanner.Provider())
	}

	account := CloudAccount{
		ID:                "test-acc-2",
		OrganisationID:    "test-org-1",
		Provider:          "gcp",
		AccountIdentifier: "my-gcp-project",
		Name:              "GCP AI Labs",
	}

	resources, err := scanner.Scan(context.Background(), account)
	if err != nil {
		t.Fatalf("unexpected scan error: %v", err)
	}

	if len(resources) == 0 {
		t.Fatalf("expected discovered resources, got 0")
	}

	hasVertex := false
	for _, res := range resources {
		if res.Service == "Vertex AI" && res.ResourceType == "ai_endpoint" {
			hasVertex = true
		}
	}

	if !hasVertex {
		t.Errorf("expected Vertex AI endpoint in discovered resources")
	}
}

func TestAzureScanner(t *testing.T) {
	scanner := NewAzureScanner()
	if scanner.Provider() != "azure" {
		t.Fatalf("expected provider 'azure', got %s", scanner.Provider())
	}

	account := CloudAccount{
		ID:                "test-acc-3",
		OrganisationID:    "test-org-1",
		Provider:          "azure",
		AccountIdentifier: "sub-123",
		Name:              "Azure Cloud",
	}

	resources, err := scanner.Scan(context.Background(), account)
	if err != nil {
		t.Fatalf("unexpected scan error: %v", err)
	}

	if len(resources) == 0 {
		t.Fatalf("expected discovered resources, got 0")
	}
}

func TestDiscoveryEngineRegistration(t *testing.T) {
	engine := NewEngine(nil)

	if _, ok := engine.getScanner("aws"); !ok {
		t.Errorf("expected AWS scanner to be registered")
	}
	if _, ok := engine.getScanner("gcp"); !ok {
		t.Errorf("expected GCP scanner to be registered")
	}
	if _, ok := engine.getScanner("azure"); !ok {
		t.Errorf("expected Azure scanner to be registered")
	}
	if _, ok := engine.getScanner("unknown"); ok {
		t.Errorf("did not expect unknown scanner to be registered")
	}
}

func TestDiscoveryEngineNilPool(t *testing.T) {
	engine := NewEngine(nil)
	_, err := engine.SyncAccount(context.Background(), "any-id")
	if err == nil {
		t.Fatalf("expected error when pool is nil")
	}
}
