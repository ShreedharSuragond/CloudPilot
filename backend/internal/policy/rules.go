package policy

import "strings"

func DefaultRules() []Rule {
	return []Rule{
		{
			ID:                  "CIS-S3-001",
			Name:                "s3-bucket-public-read-prohibited",
			Framework:           "cis",
			Severity:            "critical",
			Description:         "Storage bucket allows unrestricted public read/write access without identity verification.",
			RemediationGuidance: "Enable S3 Block Public Access on bucket settings and enforce IAM bucket policy restrictions.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "storage" {
					return false, ""
				}
				if pub, ok := res.Metadata["publicAccess"].(bool); ok && pub {
					return true, "Storage bucket metadata indicates public access is enabled."
				}
				if pub, ok := res.Tags["public"].(string); ok && strings.ToLower(pub) == "true" {
					return true, "Storage bucket is tagged as public."
				}
				return false, ""
			},
		},
		{
			ID:                  "CIS-EC2-002",
			Name:                "security-group-ingress-restricted",
			Framework:           "cis",
			Severity:            "critical",
			Description:         "Compute instance allows unrestricted inbound traffic from 0.0.0.0/0 on sensitive ports.",
			RemediationGuidance: "Restrict security group ingress rules to authorized corporate CIDR blocks or VPN bastions.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "compute" {
					return false, ""
				}
				if pub, ok := res.Tags["ingress"].(string); ok && pub == "open" {
					return true, "Security group has inbound 0.0.0.0/0 ingress."
				}
				return false, ""
			},
		},
		{
			ID:                  "SOC2-RDS-003",
			Name:                "rds-storage-encryption-enabled",
			Framework:           "soc2",
			Severity:            "high",
			Description:         "Relational database storage volume is unencrypted at rest.",
			RemediationGuidance: "Modify the database cluster configuration to enable KMS envelope encryption.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "database" {
					return false, ""
				}
				if enc, ok := res.Tags["encryption"].(string); ok && enc == "none" {
					return true, "Database is tagged with unencrypted storage."
				}
				return false, ""
			},
		},
		{
			ID:                  "AI-SAFE-001",
			Name:                "ai-endpoint-encryption-at-rest",
			Framework:           "ai_safety",
			Severity:            "high",
			Description:         "AI inference foundation model endpoint weights and response caches lack customer-managed KMS encryption.",
			RemediationGuidance: "Attach a customer-managed KMS key ARN to the foundation model endpoint configuration.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "ai_endpoint" && res.ResourceType != "ai_model" {
					return false, ""
				}
				// If tagged as critical tier or missing kmsKey in metadata
				if tier, ok := res.Tags["tier"].(string); ok && tier == "critical" {
					if _, hasKms := res.Metadata["kmsKey"]; !hasKms {
						return true, "Critical AI endpoint does not specify customer-managed KMS encryption key."
					}
				}
				return false, ""
			},
		},
		{
			ID:                  "AI-SAFE-002",
			Name:                "ai-model-data-lineage-tagged",
			Framework:           "ai_safety",
			Severity:            "medium",
			Description:         "Generative AI workload is missing mandatory cost center and team ownership metadata.",
			RemediationGuidance: "Apply FinOps and governance tags ('cost_center', 'team', and 'environment') to track model provenance.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "ai_endpoint" && res.ResourceType != "ai_model" {
					return false, ""
				}
				_, hasCostCenter := res.Tags["cost_center"]
				_, hasTeam := res.Tags["team"]
				if !hasCostCenter && !hasTeam {
					return true, "AI model is missing both cost_center and team ownership tags."
				}
				return false, ""
			},
		},
		{
			ID:                  "AI-SAFE-003",
			Name:                "ai-model-invocation-logging-enabled",
			Framework:           "ai_safety",
			Severity:            "high",
			Description:         "Foundation model invocation and prompt telemetry logging to CloudWatch or Cloud Logging is disabled.",
			RemediationGuidance: "Configure model invocation logging destination to record prompt hashes and latency metrics.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "ai_endpoint" && res.ResourceType != "ai_model" {
					return false, ""
				}
				if logging, ok := res.Metadata["invocationLogging"].(bool); ok && !logging {
					return true, "Model invocation logging is explicitly disabled in endpoint metadata."
				}
				return false, ""
			},
		},
		{
			ID:                  "AI-SAFE-004",
			Name:                "ai-guardrail-pii-masking-enabled",
			Framework:           "ai_safety",
			Severity:            "critical",
			Description:         "AI inference endpoint does not enforce automated PII filtering and sensitive data masking guardrails.",
			RemediationGuidance: "Attach Bedrock Guardrail, Vertex AI Safety Filter, or Azure Content Safety policy with regex PII redaction.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "ai_endpoint" && res.ResourceType != "ai_model" {
					return false, ""
				}
				if pii, ok := res.Metadata["piiMasking"].(bool); ok && !pii {
					return true, "Automated PII masking is disabled on this production inference endpoint."
				}
				return false, ""
			},
		},
		{
			ID:                  "HIPAA-STORAGE-001",
			Name:                "storage-access-logging-enabled",
			Framework:           "hipaa",
			Severity:            "medium",
			Description:         "Storage bucket storing regulated health or confidential data does not have immutable versioning enabled.",
			RemediationGuidance: "Enable object versioning and route audit access logs to a secure centralized logging account.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "storage" {
					return false, ""
				}
				isHipaa := false
				if comp, ok := res.Tags["compliance"].(string); ok && strings.ToLower(comp) == "hipaa" {
					isHipaa = true
				}
				if isHipaa {
					if vers, ok := res.Metadata["versioning"].(bool); !ok || !vers {
						return true, "HIPAA regulated storage bucket lacks object versioning."
					}
				}
				return false, ""
			},
		},
		{
			ID:                  "ISO-COMPUTE-001",
			Name:                "idle-compute-instance-governance",
			Framework:           "iso27001",
			Severity:            "low",
			Description:         "High-cost compute instance detected in a staging environment exceeding budget efficiency targets.",
			RemediationGuidance: "Downsize the compute instance family or configure automated shutdown schedules outside working hours.",
			Check: func(res ResourceTarget) (bool, string) {
				if res.ResourceType != "compute" {
					return false, ""
				}
				env, ok := res.Tags["environment"].(string)
				if ok && (env == "staging" || env == "dev") && res.MonthlyCost > 150.0 {
					return true, "High-cost compute instance (> $150/mo) running in non-production environment."
				}
				return false, ""
			},
		},
	}
}
