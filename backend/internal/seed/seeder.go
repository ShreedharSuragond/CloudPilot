package seed

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func EnsureSampleData(ctx context.Context, pool *pgxpool.Pool, orgID string) error {
	var count int
	err := pool.QueryRow(ctx, `SELECT count(*) FROM cloud_accounts WHERE organisation_id = $1::uuid`, orgID).Scan(&count)
	if err != nil || count > 0 {
		return err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Create AWS Production Account
	var awsAccountID string
	err = tx.QueryRow(ctx, `
		INSERT INTO cloud_accounts (organisation_id, provider, name, account_identifier, role_arn, external_id, status, last_sync_at)
		VALUES ($1::uuid, 'aws', 'Production AWS Core', '123456789012', 'arn:aws:iam::123456789012:role/CloudPilotAuditRole', 'cp-ext-94a8c1f', 'connected', now())
		RETURNING id::text
	`, orgID).Scan(&awsAccountID)
	if err != nil {
		return fmt.Errorf("seed aws account: %w", err)
	}

	// 2. Create GCP Research Account
	var gcpAccountID string
	err = tx.QueryRow(ctx, `
		INSERT INTO cloud_accounts (organisation_id, provider, name, account_identifier, status, last_sync_at)
		VALUES ($1::uuid, 'gcp', 'AI Labs & Analytics', 'cloudpilot-ai-research-prod', 'connected', now())
		RETURNING id::text
	`, orgID).Scan(&gcpAccountID)
	if err != nil {
		return fmt.Errorf("seed gcp account: %w", err)
	}

	// 3. Insert Resources (Mix of Infra & Generative AI models)
	type sampleResource struct {
		accountID string
		provider  string
		service   string
		resType   string
		resID     string
		name      string
		region    string
		status    string
		cost      float64
		tags      string
	}

	resources := []sampleResource{
		// AI Workloads
		{
			accountID: awsAccountID,
			provider:  "aws",
			service:   "Amazon Bedrock",
			resType:   "ai_model",
			resID:     "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet",
			name:      "anthropic.claude-3-5-sonnet",
			region:    "us-east-1",
			status:    "active",
			cost:      412.30,
			tags:      `{"environment": "production", "team": "ai-platform", "tier": "critical"}`,
		},
		{
			accountID: gcpAccountID,
			provider:  "gcp",
			service:   "Vertex AI",
			resType:   "ai_endpoint",
			resID:     "projects/cloudpilot-ai-research-prod/locations/us-central1/endpoints/gemini-1-5-pro",
			name:      "gemini-1.5-pro-endpoint",
			region:    "us-central1",
			status:    "active",
			cost:      318.00,
			tags:      `{"environment": "production", "team": "data-science"}`,
		},
		{
			accountID: awsAccountID,
			provider:  "aws",
			service:   "AWS SageMaker",
			resType:   "ai_endpoint",
			resID:     "arn:aws:sagemaker:us-east-1:123456789012:endpoint/mistral-large-endpoint",
			name:      "mistral-large-endpoint",
			region:    "us-east-1",
			status:    "active",
			cost:      340.00,
			tags:      `{"environment": "production", "instance_type": "ml.g5.12xlarge"}`,
		},

		// Core Infrastructure
		{
			accountID: awsAccountID,
			provider:  "aws",
			service:   "Amazon EKS",
			resType:   "compute",
			resID:     "arn:aws:eks:us-east-1:123456789012:cluster/prod-api-cluster",
			name:      "prod-api-cluster-us-east",
			region:    "us-east-1",
			status:    "running",
			cost:      148.50,
			tags:      `{"environment": "production", "orchestrator": "kubernetes"}`,
		},
		{
			accountID: awsAccountID,
			provider:  "aws",
			service:   "Amazon RDS",
			resType:   "database",
			resID:     "arn:aws:rds:us-east-1:123456789012:db:cloudpilot-postgres-primary",
			name:      "cloudpilot-postgres-primary",
			region:    "us-east-1",
			status:    "running",
			cost:      210.00,
			tags:      `{"environment": "production", "engine": "postgres"}`,
		},
		{
			accountID: awsAccountID,
			provider:  "aws",
			service:   "Amazon S3",
			resType:   "storage",
			resID:     "arn:aws:s3:::customer-data-lake-raw",
			name:      "customer-data-lake-raw",
			region:    "us-east-1",
			status:    "active",
			cost:      84.10,
			tags:      `{"environment": "production", "data_tier": "raw"}`,
		},
		{
			accountID: gcpAccountID,
			provider:  "gcp",
			service:   "Cloud Run",
			resType:   "compute",
			resID:     "projects/cloudpilot-ai-research-prod/locations/us-central1/services/inference-gateway",
			name:      "inference-gateway",
			region:    "us-central1",
			status:    "running",
			cost:      65.20,
			tags:      `{"environment": "production", "runtime": "serverless"}`,
		},
		{
			accountID: gcpAccountID,
			provider:  "gcp",
			service:   "BigQuery",
			resType:   "database",
			resID:     "projects/cloudpilot-ai-research-prod/datasets/analytics_warehouse",
			name:      "analytics_warehouse",
			region:    "us-central1",
			status:    "active",
			cost:      124.00,
			tags:      `{"environment": "production", "workload": "analytics"}`,
		},
	}

	var s3ResourceID, sagemakerResourceID string
	for _, res := range resources {
		var createdID string
		err := tx.QueryRow(ctx, `
			INSERT INTO cloud_resources (
				organisation_id, cloud_account_id, provider, service, resource_type,
				resource_id, name, region, status, monthly_cost, tags
			)
			VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
			ON CONFLICT (organisation_id, cloud_account_id, resource_id) DO UPDATE SET
				name = EXCLUDED.name,
				status = EXCLUDED.status,
				monthly_cost = EXCLUDED.monthly_cost
			RETURNING id::text
		`, orgID, res.accountID, res.provider, res.service, res.resType, res.resID, res.name, res.region, res.status, res.cost, res.tags).Scan(&createdID)
		if err != nil {
			return fmt.Errorf("seed resource %s: %w", res.name, err)
		}

		if res.service == "Amazon S3" {
			s3ResourceID = createdID
		}
		if res.service == "AWS SageMaker" {
			sagemakerResourceID = createdID
		}
	}

	// 4. Policy Findings
	if s3ResourceID != "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO policy_findings (organisation_id, cloud_resource_id, severity, rule_name, description, remediation_guidance, status)
			VALUES (
				$1::uuid, $2::uuid, 'critical', 'S3 Bucket Default Encryption Disabled',
				'Bucket customer-data-lake-raw lacks server-side KMS encryption. Unencrypted data breaches SOC2 Type II compliance.',
				'Apply default SSE-KMS encryption via AWS CLI or Terraform aws_s3_bucket_server_side_encryption_configuration.',
				'open'
			)
		`, orgID, s3ResourceID)
		if err != nil {
			return fmt.Errorf("seed s3 finding: %w", err)
		}
	}

	if sagemakerResourceID != "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO policy_findings (organisation_id, cloud_resource_id, severity, rule_name, description, remediation_guidance, status)
			VALUES (
				$1::uuid, $2::uuid, 'high', 'Idle AI Dedicated GPU Endpoint',
				'Endpoint mistral-large-endpoint on ml.g5.12xlarge instance has experienced under 2% utilization over 7 days.',
				'Migrate endpoint to SageMaker Serverless Inference to eliminate $340.00/mo idle compute costs.',
				'open'
			)
		`, orgID, sagemakerResourceID)
		if err != nil {
			return fmt.Errorf("seed sagemaker finding: %w", err)
		}
	}

	// 5. Initial AI Insights
	_, err = tx.Exec(ctx, `
		INSERT INTO ai_insights (organisation_id, category, title, summary, estimated_savings, remediation_code)
		VALUES
		(
			$1::uuid, 'cost_optimization', 'Downscale Idle SageMaker GPU Endpoint',
			'SageMaker endpoint mistral-large-endpoint on ml.g5.12xlarge is idle. Converting to Serverless Inference saves $340.00/mo immediately.',
			340.00, 'aws sagemaker update-endpoint --endpoint-name mistral-large-endpoint --endpoint-config-name mistral-serverless'
		),
		(
			$1::uuid, 'security', 'Enable SSE-KMS on customer-data-lake-raw',
			'Customer data bucket lacks default KMS encryption. Apply default AWS-managed or customer-managed KMS key to satisfy audit requirements.',
			0.00, 'aws s3api put-bucket-encryption --bucket customer-data-lake-raw --server-side-encryption-configuration ''{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]}'''
		),
		(
			$1::uuid, 'ai_workload', 'Enable Bedrock Prompt Caching for Claude 3.5 Sonnet',
			'Claude 3.5 Sonnet tokens increased 42% week-over-week. Enabling Anthropic prompt caching reduces input token overhead by up to 40%.',
			165.00, '// Add header in Bedrock Anthropic SDK client:\n// anthropic-beta: prompt-caching-2024-07-31'
		)
	`, orgID)
	if err != nil {
		return fmt.Errorf("seed ai insights: %w", err)
	}

	// 6. Initial Sample Webhook Alert Integration
	_, _ = tx.Exec(ctx, `
		INSERT INTO organisation_integrations (
			organisation_id, name, provider, webhook_url, events, enabled, created_at, updated_at
		)
		VALUES (
			$1::uuid, 'DevOps SecOps Slack Alert', 'slack',
			'https://hooks.slack.com/services/T00000000/B00000000/sample-secret-token',
			ARRAY['policy.critical', 'policy.high', 'cost.anomaly'],
			true, now(), now()
		)
		ON CONFLICT DO NOTHING
	`, orgID)

	return tx.Commit(ctx)
}
