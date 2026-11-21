package ai

import (
	"context"
	"fmt"
	"math"
	"strings"
)

type MockProvider struct{}

func NewMockProvider() *MockProvider {
	return &MockProvider{}
}

func (m *MockProvider) Name() string {
	return "mock"
}

func (m *MockProvider) GenerateInsights(_ context.Context, snapshot CloudSnapshot) ([]Insight, error) {
	if snapshot.TotalResources == 0 {
		return []Insight{}, nil
	}

	insights := make([]Insight, 0)

	// 1. Generate security insights from open policy findings in the database
	for _, f := range snapshot.TopFindings {
		if len(insights) >= 4 {
			break
		}
		cleanRuleID := strings.ToLower(strings.ReplaceAll(f.RuleName, " ", "-"))
		insights = append(insights, Insight{
			ID:               fmt.Sprintf("ins-sec-%s", cleanRuleID),
			Category:         "security",
			Title:            fmt.Sprintf("Remediate %s", f.RuleName),
			Summary:          fmt.Sprintf("Resource '%s' (%s %s) flagged for %s (%s). %s", f.ResourceName, strings.ToUpper(f.Provider), f.Service, f.RuleName, f.Severity, f.Description),
			EstimatedSavings: 0.00,
			RemediationCode:  fmt.Sprintf("# Remediation command for %s on %s:\naws %s update or reconfigure encryption and IAM permissions", f.RuleName, f.ResourceName, strings.ToLower(f.Service)),
		})
	}

	// 2. Generate AI workload optimization insights from actual discovered AI resources
	for _, res := range snapshot.SampleResources {
		if len(insights) >= 4 {
			break
		}
		if res.Type == "ai_model" || res.Type == "ai_endpoint" {
			cleanName := strings.ToLower(strings.ReplaceAll(res.Name, " ", "-"))
			potentialSavings := math.Round(res.Cost*0.25*100) / 100
			insights = append(insights, Insight{
				ID:               fmt.Sprintf("ins-ai-%s", cleanName),
				Category:         "ai_workload",
				Title:            fmt.Sprintf("%s Token Velocity Alert", res.Name),
				Summary:          fmt.Sprintf("%s (%s %s) is running at an estimated $%.2f/mo. Consider enabling prompt caching or batch inference to optimize operational throughput.", res.Name, strings.ToUpper(res.Provider), res.Service, res.Cost),
				EstimatedSavings: potentialSavings,
				RemediationCode:  fmt.Sprintf("// Enable prompt caching and downscale rules for %s:\n// anthropic-beta: prompt-caching-2024-07-31", res.Name),
			})
		}
	}

	// 3. Generate FinOps cost optimization insights for highest-spend non-AI infrastructure
	for _, res := range snapshot.SampleResources {
		if len(insights) >= 4 {
			break
		}
		if res.Type != "ai_model" && res.Type != "ai_endpoint" && res.Cost >= 100.0 {
			cleanName := strings.ToLower(strings.ReplaceAll(res.Name, " ", "-"))
			potentialSavings := math.Round(res.Cost*0.20*100) / 100
			insights = append(insights, Insight{
				ID:               fmt.Sprintf("ins-cost-%s", cleanName),
				Category:         "cost_optimization",
				Title:            fmt.Sprintf("%s Rightsizing Optimization", res.Name),
				Summary:          fmt.Sprintf("%s (%s %s) generates $%.2f/mo run-rate. Review utilization metrics to rightsize or migrate to reserved instances.", res.Name, strings.ToUpper(res.Provider), res.Service, res.Cost),
				EstimatedSavings: potentialSavings,
				RemediationCode:  fmt.Sprintf("# Rightsizing review command:\naws ec2 describe-instance-status / gcloud compute instances describe %s", res.Name),
			})
		}
	}

	// 4. If snapshot has resources but no specific findings or high-cost items yet, provide a baseline governance insight
	if len(insights) == 0 && snapshot.TotalResources > 0 {
		insights = append(insights, Insight{
			ID:               "ins-gov-01",
			Category:         "cost_optimization",
			Title:            "Multi-Cloud Governance & Telemetry",
			Summary:          fmt.Sprintf("Continuously monitoring %d cloud resources ($%.2f/mo run-rate). Current compliance posture is evaluated at %.1f%%.", snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ComplianceScore),
			EstimatedSavings: math.Round(snapshot.MonthlySpend*0.10*100) / 100,
			RemediationCode:  "// Infrastructure is monitored under CloudPilot autonomous governance",
		})
	}

	return insights, nil
}

func (m *MockProvider) Chat(_ context.Context, messages []ChatMessage, snapshot CloudSnapshot) (string, error) {
	if len(messages) == 0 {
		return "Hello! I am CloudPilot Copilot. I analyze your cloud architecture, AI models, and FinOps metrics. How can I help you today?", nil
	}

	lastMsg := strings.ToLower(messages[len(messages)-1].Content)

	if snapshot.TotalResources == 0 {
		return "This workspace currently has **0 connected cloud resources**. Connect an AWS, GCP, or Azure account in Settings > Cloud Connectors to activate autonomous governance, AI observability, and FinOps telemetry.", nil
	}

	if strings.Contains(lastMsg, "cost") || strings.Contains(lastMsg, "spend") {
		topDrivers := ""
		if len(snapshot.SampleResources) > 0 {
			r := snapshot.SampleResources[0]
			topDrivers = fmt.Sprintf(" The highest spend driver is **%s** (%s) at $%.2f/mo.", r.Name, strings.ToUpper(r.Provider), r.Cost)
		}
		return fmt.Sprintf("Your current estimated monthly cloud run-rate is **$%.2f** across %d cloud resources.%s We recommend reviewing rightsizing opportunities in Cost Management.", snapshot.MonthlySpend, snapshot.TotalResources, topDrivers), nil
	}

	if strings.Contains(lastMsg, "ai") || strings.Contains(lastMsg, "model") || strings.Contains(lastMsg, "bedrock") || strings.Contains(lastMsg, "vertex") {
		aiList := ""
		for _, r := range snapshot.SampleResources {
			if r.Type == "ai_model" || r.Type == "ai_endpoint" {
				aiList += fmt.Sprintf("\n- **%s** (%s %s, $%.2f/mo)", r.Name, strings.ToUpper(r.Provider), r.Service, r.Cost)
			}
		}
		if aiList == "" {
			return fmt.Sprintf("You currently have **%d active AI workloads** running. Check the AI Workloads Hub for model deployment details.", snapshot.ActiveAIWorkloads), nil
		}
		return fmt.Sprintf("You currently have **%d active AI workloads** running:%s\n\nPrompt caching and autoscaling are recommended to optimize operational token velocity.", snapshot.ActiveAIWorkloads, aiList), nil
	}

	if strings.Contains(lastMsg, "security") || strings.Contains(lastMsg, "finding") || strings.Contains(lastMsg, "compliance") {
		findingsList := ""
		for _, f := range snapshot.TopFindings {
			findingsList += fmt.Sprintf("\n- **%s** (%s): %s on resource `%s`", f.RuleName, strings.ToUpper(f.Severity), f.Description, f.ResourceName)
		}
		if findingsList == "" {
			return fmt.Sprintf("Your overall compliance score is **%.1f%%**. There are currently no open critical policy violations in this workspace! All scanned assets adhere to guardrails.", snapshot.ComplianceScore), nil
		}
		return fmt.Sprintf("Your overall compliance score is **%.1f%%**. Active findings include:%s\n\nWould you like me to generate the Terraform remediation snippet?", snapshot.ComplianceScore, findingsList), nil
	}

	return fmt.Sprintf("I analyzed your workspace: %d resources, monthly spend of $%.2f, %d active AI workloads, and a compliance score of %.1f%%. Ask me about cost optimization, AI model usage, or security findings!", snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ActiveAIWorkloads, snapshot.ComplianceScore), nil
}

func (m *MockProvider) ExplainFinding(_ context.Context, finding FindingContext) (string, error) {
	return fmt.Sprintf(
		"### Analysis for %s (%s)\n\n"+
			"**Rule:** %s\n"+
			"**Resource:** `%s` on `%s` (%s)\n\n"+
			"#### Why this is important\n"+
			"This policy violation poses a security or compliance risk. Unencrypted data or open network ingress allows unauthorized access or regulatory non-compliance.\n\n"+
			"#### Remediation CLI\n"+
			"```bash\n# Remediate %s on %s\naws %s update or apply configuration\n```\n\n"+
			"#### Terraform Fix\n"+
			"```hcl\n# Automated remediation blueprint for %s\nresource \"cloud_%s_config\" \"remediation\" {\n  target = \"%s\"\n}\n```",
		finding.RuleName, finding.Severity,
		finding.RuleName,
		finding.ResourceName, finding.Service, finding.Provider,
		finding.RuleName, finding.ResourceName, strings.ToLower(finding.Service),
		finding.RuleName, strings.ToLower(finding.Service), finding.ResourceName,
	), nil
}
