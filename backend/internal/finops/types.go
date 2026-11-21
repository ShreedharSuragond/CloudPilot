package finops

import "time"

type DailySpendItem struct {
	Date       string  `json:"date"`
	InfraSpend float64 `json:"infraSpend"`
	AISpend    float64 `json:"aiSpend"`
	TotalSpend float64 `json:"totalSpend"`
}

type CostTrend struct {
	MonthlyRunRate     float64          `json:"monthlyRunRate"`
	PreviousMonthSpend float64          `json:"previousMonthSpend"`
	PercentChange      float64          `json:"percentChange"`
	ProjectedSpend     float64          `json:"projectedSpend"`
	AISpendRatio       float64          `json:"aiSpendRatio"`
	DailySeries        []DailySpendItem `json:"dailySeries"`
}

type CostAnomaly struct {
	ID                  string    `json:"id"`
	ResourceID          string    `json:"resourceId"`
	ResourceName        string    `json:"resourceName"`
	Provider            string    `json:"provider"`
	Service             string    `json:"service"`
	ExpectedMonthlyCost float64   `json:"expectedMonthlyCost"`
	ActualMonthlyCost   float64   `json:"actualMonthlyCost"`
	SpikePercent        float64   `json:"spikePercent"`
	DetectedAt          time.Time `json:"detectedAt"`
	Explanation         string    `json:"explanation"`
}

type Budget struct {
	ID                    string    `json:"id"`
	OrganisationID        string    `json:"organisationId"`
	Name                  string    `json:"name"`
	Amount                float64   `json:"amount"`
	Period                string    `json:"period"` // monthly, quarterly, annual
	AlertThresholdPercent int       `json:"alertThresholdPercent"`
	CloudAccountID        *string   `json:"cloudAccountId,omitempty"`
	CurrentSpend          float64   `json:"currentSpend"`
	PercentUsed           float64   `json:"percentUsed"`
	Status                string    `json:"status"` // ok, warning, exceeded
	CreatedAt             time.Time `json:"createdAt"`
}

type CreateBudgetRequest struct {
	Name                  string  `json:"name"`
	Amount                float64 `json:"amount"`
	Period                string  `json:"period"`
	AlertThresholdPercent int     `json:"alertThresholdPercent"`
	CloudAccountID        *string `json:"cloudAccountId,omitempty"`
}
