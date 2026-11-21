package discovery

import (
	"context"
	"fmt"
)

type AWSScanner struct{}

func NewAWSScanner() *AWSScanner {
	return &AWSScanner{}
}

func (s *AWSScanner) Provider() string {
	return "aws"
}

func (s *AWSScanner) Scan(ctx context.Context, account CloudAccount) ([]DiscoveredResource, error) {
	accID := account.AccountIdentifier
	if accID == "" {
		accID = "123456789012"
	}

	resources := []DiscoveredResource{
		// 1. Bedrock Foundation Models
		{
			Provider:     "aws",
			Service:      "Amazon Bedrock",
			ResourceType: "ai_model",
			ResourceID:   fmt.Sprintf("arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet"),
			Name:         "anthropic.claude-3-5-sonnet",
			Region:       "us-east-1",
			Status:       "active",
			MonthlyCost:  412.30,
			Tags: map[string]any{
				"environment": "production",
				"team":        "ai-platform",
				"tier":        "critical",
				"cost_center": "4100-ml",
			},
			Metadata: map[string]any{
				"provider":      "Anthropic",
				"contextWindow": 200000,
				"maxOutput":     8192,
				"modalities":    []string{"text", "image"},
			},
		},
		{
			Provider:     "aws",
			Service:      "Amazon Bedrock",
			ResourceType: "ai_model",
			ResourceID:   fmt.Sprintf("arn:aws:bedrock:us-east-1::foundation-model/meta.llama3-70b-instruct"),
			Name:         "meta.llama3-70b-instruct",
			Region:       "us-east-1",
			Status:       "active",
			MonthlyCost:  220.50,
			Tags: map[string]any{
				"environment": "staging",
				"team":        "ai-research",
			},
			Metadata: map[string]any{
				"provider":      "Meta",
				"contextWindow": 8192,
			},
		},
		{
			Provider:     "aws",
			Service:      "Amazon Bedrock",
			ResourceType: "ai_model",
			ResourceID:   fmt.Sprintf("arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1"),
			Name:         "amazon.titan-embed-text-v1",
			Region:       "us-east-1",
			Status:       "active",
			MonthlyCost:  45.00,
			Tags: map[string]any{
				"environment": "production",
				"service":     "vector-search",
			},
			Metadata: map[string]any{
				"provider":   "Amazon",
				"dimensions": 1536,
			},
		},

		// 2. SageMaker Inference Endpoint
		{
			Provider:     "aws",
			Service:      "AWS SageMaker",
			ResourceType: "ai_endpoint",
			ResourceID:   fmt.Sprintf("arn:aws:sagemaker:us-east-1:%s:endpoint/mistral-large-endpoint", accID),
			Name:         "mistral-large-endpoint",
			Region:       "us-east-1",
			Status:       "active",
			MonthlyCost:  340.00,
			Tags: map[string]any{
				"environment":   "production",
				"instance_type": "ml.g5.12xlarge",
				"owner":         "mlops-team",
			},
			Metadata: map[string]any{
				"instanceCount": 1,
				"gpuMemory":     "96GB",
				"framework":     "vLLM",
			},
		},

		// 3. EC2 Compute Instances
		{
			Provider:     "aws",
			Service:      "Amazon EC2",
			ResourceType: "compute",
			ResourceID:   fmt.Sprintf("i-%s-worker-01", accID[:min(6, len(accID))]),
			Name:         "k8s-worker-pool-node-01",
			Region:       "us-east-1",
			Status:       "running",
			MonthlyCost:  268.40,
			Tags: map[string]any{
				"environment": "production",
				"role":        "worker",
				"cluster":     "prod-eks-01",
			},
			Metadata: map[string]any{
				"instanceType": "c6i.2xlarge",
				"vCPU":         8,
				"ramGB":        16,
			},
		},
		{
			Provider:     "aws",
			Service:      "Amazon EC2",
			ResourceType: "compute",
			ResourceID:   fmt.Sprintf("i-%s-worker-02", accID[:min(6, len(accID))]),
			Name:         "k8s-worker-pool-node-02",
			Region:       "us-east-1",
			Status:       "running",
			MonthlyCost:  268.40,
			Tags: map[string]any{
				"environment": "production",
				"role":        "worker",
				"cluster":     "prod-eks-01",
			},
			Metadata: map[string]any{
				"instanceType": "c6i.2xlarge",
				"vCPU":         8,
				"ramGB":        16,
			},
		},

		// 4. S3 Storage Buckets
		{
			Provider:     "aws",
			Service:      "Amazon S3",
			ResourceType: "storage",
			ResourceID:   fmt.Sprintf("arn:aws:s3:::lake-raw-data-%s", accID),
			Name:         fmt.Sprintf("lake-raw-data-%s", accID),
			Region:       "us-east-1",
			Status:       "active",
			MonthlyCost:  84.20,
			Tags: map[string]any{
				"data_classification": "confidential",
				"compliance":          "hipaa",
			},
			Metadata: map[string]any{
				"sizeGB":       3400,
				"versioning":   true,
				"publicAccess": false,
			},
		},
		{
			Provider:     "aws",
			Service:      "Amazon S3",
			ResourceType: "storage",
			ResourceID:   fmt.Sprintf("arn:aws:s3:::public-static-assets-%s", accID),
			Name:         fmt.Sprintf("public-static-assets-%s", accID),
			Region:       "us-east-1",
			Status:       "active",
			MonthlyCost:  19.50,
			Tags: map[string]any{
				"purpose": "cdn-origin",
			},
			Metadata: map[string]any{
				"sizeGB":       450,
				"publicAccess": true,
			},
		},

		// 5. RDS Database
		{
			Provider:     "aws",
			Service:      "Amazon RDS",
			ResourceType: "database",
			ResourceID:   fmt.Sprintf("arn:aws:rds:us-east-1:%s:db:cloudpilot-aurora-prod", accID),
			Name:         "cloudpilot-aurora-prod",
			Region:       "us-east-1",
			Status:       "available",
			MonthlyCost:  310.00,
			Tags: map[string]any{
				"environment": "production",
				"engine":      "aurora-postgresql",
			},
			Metadata: map[string]any{
				"engineVersion": "16.2",
				"multiAZ":       true,
				"allocatedGB":   500,
			},
		},
	}

	return resources, nil
}
