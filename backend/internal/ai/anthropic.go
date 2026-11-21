package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type AnthropicProvider struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewAnthropicProvider(apiKey, model string) *AnthropicProvider {
	return &AnthropicProvider{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (a *AnthropicProvider) Name() string {
	return "anthropic"
}

type anthropicRequest struct {
	Model       string             `json:"model"`
	Messages    []anthropicMessage `json:"messages"`
	System      string             `json:"system,omitempty"`
	MaxTokens   int                `json:"max_tokens"`
	Temperature float64            `json:"temperature"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (a *AnthropicProvider) GenerateInsights(ctx context.Context, snapshot CloudSnapshot) ([]Insight, error) {
	if snapshot.TotalResources == 0 {
		return []Insight{}, nil
	}

	prompt := fmt.Sprintf(
		"Analyze this cloud and AI workload snapshot:\n"+
			"Total Resources: %d, Monthly Spend: $%.2f, Active AI Models: %d, Compliance: %.1f%%\n\n"+
			"Output 3-4 FinOps and security insights. Respond ONLY with a valid JSON array matching:\n"+
			`[{"category":"cost_optimization"|"security"|"ai_workload"|"architecture", "title":"...", "summary":"...", "estimatedSavings":0.00, "remediationCode":"..."}]`,
		snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ActiveAIWorkloads, snapshot.ComplianceScore,
	)

	res, err := a.callAPI(ctx, "You are CloudPilot AI Copilot. Output only raw JSON arrays.", []anthropicMessage{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return NewMockProvider().GenerateInsights(ctx, snapshot)
	}

	cleaned := strings.TrimSpace(res)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var insights []Insight
	if err := json.Unmarshal([]byte(cleaned), &insights); err != nil {
		return NewMockProvider().GenerateInsights(ctx, snapshot)
	}
	return insights, nil
}

func (a *AnthropicProvider) Chat(ctx context.Context, messages []ChatMessage, snapshot CloudSnapshot) (string, error) {
	systemPrompt := fmt.Sprintf(
		"You are CloudPilot Copilot, an intelligent cloud governance and FinOps assistant. "+
			"Current environment: %d resources, $%.2f monthly spend, %d active AI workloads, %.1f%% compliance score.",
		snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ActiveAIWorkloads, snapshot.ComplianceScore,
	)

	formatted := make([]anthropicMessage, 0, len(messages))
	for _, msg := range messages {
		formatted = append(formatted, anthropicMessage{Role: msg.Role, Content: msg.Content})
	}

	res, err := a.callAPI(ctx, systemPrompt, formatted)
	if err != nil {
		return NewMockProvider().Chat(ctx, messages, snapshot)
	}
	return res, nil
}

func (a *AnthropicProvider) ExplainFinding(ctx context.Context, finding FindingContext) (string, error) {
	prompt := fmt.Sprintf(
		"Explain this cloud policy finding and generate remediation code in CLI and Terraform:\n"+
			"Rule: %s\nSeverity: %s\nResource: %s\nService: %s\nProvider: %s\nDescription: %s",
		finding.RuleName, finding.Severity, finding.ResourceName, finding.Service, finding.Provider, finding.Description,
	)

	res, err := a.callAPI(ctx, "You are a cloud security architect.", []anthropicMessage{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		return NewMockProvider().ExplainFinding(ctx, finding)
	}
	return res, nil
}

func (a *AnthropicProvider) callAPI(ctx context.Context, system string, messages []anthropicMessage) (string, error) {
	reqBody := anthropicRequest{
		Model:       a.model,
		Messages:    messages,
		System:      system,
		MaxTokens:   2048,
		Temperature: 0.2,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", a.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	res, err := a.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	if res.StatusCode >= 400 {
		return "", fmt.Errorf("anthropic api error (HTTP %d): %s", res.StatusCode, string(bodyBytes))
	}

	var parsed anthropicResponse
	if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
		return "", err
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("anthropic error: %s", parsed.Error.Message)
	}
	if len(parsed.Content) == 0 {
		return "", fmt.Errorf("anthropic returned 0 content items")
	}

	return parsed.Content[0].Text, nil
}
