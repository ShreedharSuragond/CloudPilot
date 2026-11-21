package policy

import (
	"time"
)

type ResourceTarget struct {
	ID             string         `json:"id"`
	OrganisationID string         `json:"organisationId"`
	CloudAccountID string         `json:"cloudAccountId"`
	Provider       string         `json:"provider"`
	Service        string         `json:"service"`
	ResourceType   string         `json:"resourceType"`
	ResourceID     string         `json:"resourceId"`
	Name           string         `json:"name"`
	Region         string         `json:"region"`
	Status         string         `json:"status"`
	MonthlyCost    float64        `json:"monthlyCost"`
	Tags           map[string]any `json:"tags"`
	Metadata       map[string]any `json:"metadata"`
}

type Rule struct {
	ID                  string
	Name                string
	Framework           string // cis, soc2, hipaa, ai_safety, iso27001
	Severity            string // critical, high, medium, low
	Description         string
	RemediationGuidance string
	Check               func(res ResourceTarget) (violated bool, reason string)
}

type Finding struct {
	ID                  string     `json:"id"`
	OrganisationID      string     `json:"organisationId"`
	CloudResourceID     *string    `json:"cloudResourceId,omitempty"`
	ResourceName        string     `json:"resourceName"`
	Provider            string     `json:"provider"`
	Service             string     `json:"service"`
	Severity            string     `json:"severity"` // critical, high, medium, low
	RuleName            string     `json:"ruleName"`
	Framework           string     `json:"framework"`
	Description         string     `json:"description"`
	RemediationGuidance string     `json:"remediationGuidance"`
	Status              string     `json:"status"` // open, suppressed, resolved
	SuppressionReason   *string    `json:"suppressionReason,omitempty"`
	DetectedAt          time.Time  `json:"detectedAt"`
	ResolvedAt          *time.Time `json:"resolvedAt,omitempty"`
}

type ComplianceSummary struct {
	OverallScore       float64            `json:"overallScore"`
	TotalOpenFindings  int                `json:"totalOpenFindings"`
	CriticalCount      int                `json:"criticalCount"`
	HighCount          int                `json:"highCount"`
	MediumCount        int                `json:"mediumCount"`
	LowCount           int                `json:"lowCount"`
	FrameworkScores    map[string]float64 `json:"frameworkScores"`
}

type SuppressRequest struct {
	Reason string `json:"reason"`
}
