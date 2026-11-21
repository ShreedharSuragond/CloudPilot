package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type GeminiProvider struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewGeminiProvider(apiKey, model string) *GeminiProvider {
	return &GeminiProvider{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (g *GeminiProvider) Name() string {
	return "gemini"
}

type geminiRequest struct {
	Contents         []geminiContent `json:"contents"`
	GenerationConfig *geminiConfig   `json:"generationConfig,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiConfig struct {
	Temperature     float64 `json:"temperature,omitempty"`
	ResponseMimeType string  `json:"responseMimeType,omitempty"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (g *GeminiProvider) GenerateInsights(ctx context.Context, snapshot CloudSnapshot) ([]Insight, error) {
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

	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
		GenerationConfig: &geminiConfig{
			Temperature:      0.2,
			ResponseMimeType: "application/json",
		},
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", g.model, g.apiKey)
	resText, err := g.callAPI(ctx, url, reqBody)
	if err != nil {
		// Fallback to mock insights if API key fails or network times out
		return NewMockProvider().GenerateInsights(ctx, snapshot)
	}

	var insights []Insight
	if err := json.Unmarshal([]byte(resText), &insights); err != nil {
		return NewMockProvider().GenerateInsights(ctx, snapshot)
	}

	return insights, nil
}

func (g *GeminiProvider) Chat(ctx context.Context, messages []ChatMessage, snapshot CloudSnapshot) (string, error) {
	systemPrompt := fmt.Sprintf(
		"You are CloudPilot Copilot, an intelligent multi-cloud observability assistant. "+
			"Current environment snapshot: %d cloud resources, $%.2f monthly spend, %d active AI models, %.1f%% compliance score. "+
			"Provide concise, professional engineering advice with CLI commands or Terraform where relevant.",
		snapshot.TotalResources, snapshot.MonthlySpend, snapshot.ActiveAIWorkloads, snapshot.ComplianceScore,
	)

	contents := make([]geminiContent, 0, len(messages)+1)
	contents = append(contents, geminiContent{
		Role:  "user",
		Parts: []geminiPart{{Text: systemPrompt}},
	})
	contents = append(contents, geminiContent{
		Role:  "model",
		Parts: []geminiPart{{Text: "Understood. I am ready to assist with cloud governance, AI workloads, and FinOps metrics."}},
	})

	for _, msg := range messages {
		role := "user"
		if msg.Role == "assistant" {
			role = "model"
		}
		contents = append(contents, geminiContent{
			Role:  role,
			Parts: []geminiPart{{Text: msg.Content}},
		})
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", g.model, g.apiKey)
	reqBody := geminiRequest{
		Contents: contents,
		GenerationConfig: &geminiConfig{
			Temperature: 0.3,
		},
	}

	resp, err := g.callAPI(ctx, url, reqBody)
	if err != nil {
		return NewMockProvider().Chat(ctx, messages, snapshot)
	}
	return resp, nil
}

func (g *GeminiProvider) ExplainFinding(ctx context.Context, finding FindingContext) (string, error) {
	prompt := fmt.Sprintf(
		"Explain this cloud policy finding and generate concrete remediation code in both AWS/GCP CLI and Terraform:\n"+
			"Rule: %s\nSeverity: %s\nResource: %s\nService: %s\nProvider: %s\nDescription: %s",
		finding.RuleName, finding.Severity, finding.ResourceName, finding.Service, finding.Provider, finding.Description,
	)

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", g.model, g.apiKey)
	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
		GenerationConfig: &geminiConfig{
			Temperature: 0.2,
		},
	}

	resp, err := g.callAPI(ctx, url, reqBody)
	if err != nil {
		return NewMockProvider().ExplainFinding(ctx, finding)
	}
	return resp, nil
}

func (g *GeminiProvider) callAPI(ctx context.Context, url string, reqBody geminiRequest) (string, error) {
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := g.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	if res.StatusCode >= 400 {
		return "", fmt.Errorf("gemini api error (HTTP %d): %s", res.StatusCode, string(bodyBytes))
	}

	var parsed geminiResponse
	if err := json.Unmarshal(bodyBytes, &parsed); err != nil {
		return "", err
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("gemini error: %s", parsed.Error.Message)
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini returned empty response")
	}

	return parsed.Candidates[0].Content.Parts[0].Text, nil
}
