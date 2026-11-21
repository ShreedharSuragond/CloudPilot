package integrations

import (
	"testing"
)

func TestIntegration_Types(t *testing.T) {
	item := Integration{
		ID:             "int-1",
		OrganisationID: "org-1",
		Name:           "Security Slack Alert",
		Provider:       "slack",
		WebhookURL:     "https://hooks.slack.com/services/...",
		Events:         []string{"policy.critical"},
		Enabled:        true,
	}

	if item.Provider != "slack" {
		t.Errorf("expected provider slack, got %s", item.Provider)
	}
	if !item.Enabled {
		t.Errorf("expected enabled true")
	}
}
