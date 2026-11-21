package policy

import (
	"context"
	"testing"
)

func TestPolicyRulesDetection(t *testing.T) {
	rules := DefaultRules()
	ruleMap := make(map[string]Rule)
	for _, r := range rules {
		ruleMap[r.Name] = r
	}

	// 1. Test S3 Public Read Rule
	s3Rule, ok := ruleMap["s3-bucket-public-read-prohibited"]
	if !ok {
		t.Fatalf("expected s3 rule to exist")
	}

	pubS3 := ResourceTarget{
		ResourceType: "storage",
		Metadata: map[string]any{
			"publicAccess": true,
		},
	}
	violated, _ := s3Rule.Check(pubS3)
	if !violated {
		t.Errorf("expected violation for public S3 bucket")
	}

	privS3 := ResourceTarget{
		ResourceType: "storage",
		Metadata: map[string]any{
			"publicAccess": false,
		},
	}
	violated, _ = s3Rule.Check(privS3)
	if violated {
		t.Errorf("expected no violation for private S3 bucket")
	}

	// 2. Test AI Tagging Rule
	aiTagRule, ok := ruleMap["ai-model-data-lineage-tagged"]
	if !ok {
		t.Fatalf("expected ai tagging rule to exist")
	}

	untaggedAI := ResourceTarget{
		ResourceType: "ai_model",
		Tags:         map[string]any{},
	}
	violated, _ = aiTagRule.Check(untaggedAI)
	if !violated {
		t.Errorf("expected violation for untagged AI model")
	}

	taggedAI := ResourceTarget{
		ResourceType: "ai_model",
		Tags: map[string]any{
			"cost_center": "4100",
			"team":        "mlops",
		},
	}
	violated, _ = aiTagRule.Check(taggedAI)
	if violated {
		t.Errorf("expected no violation for properly tagged AI model")
	}
}

func TestPolicyEngineNilPool(t *testing.T) {
	engine := NewEngine(nil)
	_, err := engine.EvaluateAccount(context.Background(), "acc-1", "org-1")
	if err == nil {
		t.Fatalf("expected error when pool is nil")
	}
	_, err = engine.GetComplianceSummary(context.Background(), "org-1")
	if err == nil {
		t.Fatalf("expected error when pool is nil")
	}
}
