package ai

import (
	"context"
	"strings"

	"github.com/your-org/cloudpilot/internal/config"
)

type Provider interface {
	Name() string
	GenerateInsights(ctx context.Context, snapshot CloudSnapshot) ([]Insight, error)
	Chat(ctx context.Context, messages []ChatMessage, snapshot CloudSnapshot) (string, error)
	ExplainFinding(ctx context.Context, finding FindingContext) (string, error)
}

type CloudSnapshot struct {
	TotalResources       int                    `json:"totalResources"`
	MonthlySpend         float64                `json:"monthlySpend"`
	ActiveAIWorkloads    int                    `json:"activeAiWorkloads"`
	ComplianceScore      float64                `json:"complianceScore"`
	TopProviders         []ProviderSpend        `json:"topProviders"`
	AIWorkloadCategories []CategorySpend        `json:"aiWorkloadCategories"`
	TopFindings          []FindingContext       `json:"topFindings"`
	SampleResources      []ResourceSummary      `json:"sampleResources"`
}

type ProviderSpend struct {
	Provider string  `json:"provider"`
	Spend    float64 `json:"spend"`
}

type CategorySpend struct {
	Category string  `json:"category"`
	Spend    float64 `json:"spend"`
}

type ResourceSummary struct {
	Name     string  `json:"name"`
	Provider string  `json:"provider"`
	Service  string  `json:"service"`
	Type     string  `json:"type"`
	Cost     float64 `json:"cost"`
	Status   string  `json:"status"`
}

type Insight struct {
	ID               string  `json:"id"`
	Category         string  `json:"category"`
	Title            string  `json:"title"`
	Summary          string  `json:"summary"`
	EstimatedSavings float64 `json:"estimatedSavings"`
	RemediationCode  string  `json:"remediationCode"`
}

type ChatMessage struct {
	Role    string `json:"role"` // "user", "assistant", "system"
	Content string `json:"content"`
}

type FindingContext struct {
	RuleName     string `json:"ruleName"`
	Severity     string `json:"severity"`
	ResourceName string `json:"resourceName"`
	ResourceID   string `json:"resourceId"`
	Provider     string `json:"provider"`
	Service      string `json:"service"`
	Description  string `json:"description"`
}

func New(cfg config.Config) Provider {
	providerName := strings.ToLower(strings.TrimSpace(cfg.AIProvider))
	switch providerName {
	case "gemini":
		if cfg.AIAPIKey != "" {
			model := cfg.AIModel
			if model == "" {
				model = "gemini-1.5-flash"
			}
			return NewGeminiProvider(cfg.AIAPIKey, model)
		}
	case "openai":
		if cfg.AIAPIKey != "" || cfg.AIBaseURL != "" {
			model := cfg.AIModel
			if model == "" {
				model = "gpt-4o-mini"
			}
			baseURL := cfg.AIBaseURL
			if baseURL == "" {
				baseURL = "https://api.openai.com/v1"
			}
			return NewOpenAIProvider(cfg.AIAPIKey, model, baseURL)
		}
	case "anthropic":
		if cfg.AIAPIKey != "" {
			model := cfg.AIModel
			if model == "" {
				model = "claude-3-5-sonnet-20241022"
			}
			return NewAnthropicProvider(cfg.AIAPIKey, model)
		}
	case "ollama":
		model := cfg.AIModel
		if model == "" {
			model = "llama3:8b"
		}
		baseURL := cfg.AIBaseURL
		if baseURL == "" {
			baseURL = "http://localhost:11434/v1"
		}
		return NewOpenAIProvider("", model, baseURL)
	}

	return NewMockProvider()
}
