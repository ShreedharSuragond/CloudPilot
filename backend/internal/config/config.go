package config

import "os"

type Config struct {
	HTTPAddr       string
	DatabaseURL    string
	OIDCIssuer     string
	OIDCClientID   string
	OIDCSecret     string
	OIDCAudience   string
	OIDCScopes     string
	OIDCRedirect   string
	CookieSecure   bool
	AppEnv         string
	DevAuthEnabled bool
}

func Load() Config {
	appEnv := envOr("APP_ENV", "development")
	devAuthDefault := "false"
	if appEnv != "production" {
		devAuthDefault = "true"
	}

	return Config{
		HTTPAddr:       envOr("HTTP_ADDR", ":8080"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		OIDCIssuer:     os.Getenv("OIDC_ISSUER_URL"),
		OIDCClientID:   os.Getenv("OIDC_CLIENT_ID"),
		OIDCSecret:     os.Getenv("OIDC_CLIENT_SECRET"),
		OIDCAudience:   os.Getenv("OIDC_AUDIENCE"),
		OIDCScopes:     envOr("OIDC_SCOPES", "openid profile email"),
		OIDCRedirect:   envOr("OIDC_CALLBACK_URL", "http://localhost:8080/auth/callback"),
		CookieSecure:   os.Getenv("COOKIE_SECURE") == "true",
		AppEnv:         appEnv,
		DevAuthEnabled: envOr("DEV_AUTH_ENABLED", devAuthDefault) == "true",
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
