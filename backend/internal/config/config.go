package config

import (
	"os"
	"strings"
)

type Config struct {
	HTTPAddr           string
	DatabaseURL        string
	OIDCIssuer         string
	OIDCClientID       string
	OIDCSecret         string
	OIDCAudience       string
	OIDCScopes         string
	OIDCRedirect       string
	CookieSecure       bool
	CORSAllowedOrigins []string
	AppEnv             string
	AIProvider         string
	AIAPIKey           string
	AIModel            string
	AIBaseURL          string
}

func Load() Config {
	loadDotEnv()

	rawOrigins := getEnv("CORS_ALLOWED_ORIGINS")
	origins := make([]string, 0)
	if rawOrigins != "" {
		for _, o := range strings.Split(rawOrigins, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	return Config{
		HTTPAddr:           getEnv("HTTP_ADDR"),
		DatabaseURL:        getEnv("DATABASE_URL"),
		OIDCIssuer:         getEnv("OIDC_ISSUER_URL"),
		OIDCClientID:       getEnv("OIDC_CLIENT_ID"),
		OIDCSecret:         getEnv("OIDC_CLIENT_SECRET"),
		OIDCAudience:       getEnv("OIDC_AUDIENCE"),
		OIDCScopes:         getEnv("OIDC_SCOPES"),
		OIDCRedirect:       getEnv("OIDC_CALLBACK_URL"),
		CookieSecure:       getEnv("COOKIE_SECURE") == "true",
		CORSAllowedOrigins: origins,
		AppEnv:             getEnv("APP_ENV"),
		AIProvider:         getEnv("AI_PROVIDER"),
		AIAPIKey:           getEnv("AI_API_KEY"),
		AIModel:            getEnv("AI_MODEL"),
		AIBaseURL:          getEnv("AI_BASE_URL"),
	}
}

func getEnv(key string) string {
	return strings.TrimSpace(os.Getenv(key))
}

func loadDotEnv() {
	paths := []string{".env", "../.env", "../../.env"}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err != nil {
			continue
		}
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				if os.Getenv(key) == "" {
					os.Setenv(key, val)
				}
			}
		}
		break
	}
}
