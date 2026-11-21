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

type OpenAIProvider struct {
	apiKey     string
	model      string
	baseURL    string
	httpClient *http.Client
}

func NewOpenAIProvider(apiKey, model, baseURL string) *OpenAIProvider {
	trimmedBase := strings.TrimRight(baseURL, "/")
	return &OpenAIProvider{
		apiKey:  apiKey,
		model:   model,
		baseURL: trimmedBase,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (o *OpenAIProvider) Name() string {
	return "openai"
}

type openAIChatRequest struct {
	Model       string               `json:"model"`
	Messages    []openAIChatMessage  `json:"messages"`
	Temperature float64              `json:"temperature"`
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (o *OpenAIProvider) GenerateInsights(ctx context.Context, snapshot CloudSnapshot) ([]Insight, error) {
	if snapshot.TotalResources == 0 {
		return []Insight{}, nil
	}

	prompt := fmt.Sprintf(
		"You are CloudPilot AI Copilot, an expert cloud governance and FinOps AI assistant.\n"+
			"Analyze this multi-cloud infrastructure and AI workload snapshot:\n"+
			"Total Resources: %d\n"+
			"Monthly Spend: $%.2f\n"+
			"Active AI Workloads: %d\n"+
			"Compliance Score: %.1f%%\n\n"+
			"Generate 3 to 4 actionable, highly realistic FinOps and Security insights.\n"+
			"Return ONLY a JSON array matching this schema without markdown fences:\n"+
			`[{"category":"cost_optimization"|"security"|"ai_workload"|"architecture", "title":"...", "summary":"...", "estimatedSavings":0.00, "remediationCode":"..."}]`,
		snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ActiveAIWorkloads, snapshot.ComplianceScore,
	)

	messages := []openAIChatMessage{
		{Role: "system", Content: "You are CloudPilot AI Copilot. Output only valid JSON arrays."},
		{Role: "user", Content: prompt},
	}

	res, err := o.callChatAPI(ctx, messages, 0.2)
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

func (o *OpenAIProvider) Chat(ctx context.Context, messages []ChatMessage, snapshot CloudSnapshot) (string, error) {
	systemPrompt := fmt.Sprintf(
		"You are CloudPilot Copilot, an intelligent multi-cloud observability assistant. "+
			"Current environment snapshot: %d cloud resources, $%.2f monthly spend, %d active AI models, %.1f%% compliance score. "+
			"Provide concise, professional engineering advice with CLI commands or Terraform where relevant.",
		snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ActiveAIWorkloads, snapshot.ComplianceScore,
	)

	formatted := make([]openAIChatMessage, 0, len(messages)+1)
	formatted = append(formatted, openAIChatMessage{Role: "system", Content: systemPrompt})
	for _, msg := range messages {
		formatted = append(formatted, openAIChatMessage{Role: msg.Role, Content: msg.Content})
	}

	res, err := o.callChatAPI(ctx, formatted, 0.3)
	if err != nil {
		return NewMockProvider().Chat(ctx, messages, snapshot)
	}
	return res, nil
}

func (o *OpenAIProvider) ExplainFinding(ctx context.Context, finding FindingContext) (string, error) {
	prompt := fmt.Sprintf(
		"Explain this cloud policy finding and generate concrete remediation code in both AWS/GCP CLI and Terraform:\n"+
			"Rule: %s\nSeverity: %s\nResource: %s\nService: %s\nProvider: %s\nDescription: %s",
		finding.RuleName, finding.Severity, finding.ResourceName, finding.Service, finding.Provider, finding.Description,
	)

	messages := []openAIChatMessage{
		{Role: "system", Content: "You are a Cloud Security and Infrastructure as Code expert."},
		{Role: "user", Content: prompt},
	}

	res, err := o.callChatAPI(ctx, messages, 0.2)
	if err != nil {
		return NewMockProvider().ExplainFinding(ctx, finding)
	}
	return res, nil
}

func (o *OpenAIProvider) callChatAPI(ctx context.Context, messages []openAIChatMessage, temp float64) (string, error) {
	reqBody := openAIChatRequest{
		Model:       o.model,
		Messages:    messages,
		Temperature: temp,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	endpoint := o.baseURL + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if o.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+o.apiKey)
	}

	res, err := o.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	if res.StatusCode >= 400 {
		return "", fmt.Errorf("openai api error (HTTP %d): %s", res.StatusCode, string(bodyBytes))
	}

	var parsed openAIChatResponse
	if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
		return "", err
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("openai error: %s", parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("openai returned 0 choices")
	}

	return parsed.Choices[0].Message.Content, nil
}
