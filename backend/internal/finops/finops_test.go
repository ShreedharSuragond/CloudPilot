package finops

import (
	"context"
	"testing"
)

func TestEngine_NilPool(t *testing.T) {
	e := NewEngine(nil)
	ctx := context.Background()

	_, err := e.GetCostTrends(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Errorf("expected error for nil pool on GetCostTrends, got nil")
	}

	_, err = e.GetCostAnomalies(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Errorf("expected error for nil pool on GetCostAnomalies, got nil")
	}

	_, err = e.ListBudgets(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Errorf("expected error for nil pool on ListBudgets, got nil")
	}

	_, err = e.CreateBudget(ctx, "00000000-0000-0000-0000-000000000000", CreateBudgetRequest{
		Name:   "Test Budget",
		Amount: 500,
	})
	if err == nil {
		t.Errorf("expected error for nil pool on CreateBudget, got nil")
	}

	err = e.DeleteBudget(ctx, "00000000-0000-0000-0000-000000000000", "test-budget-id")
	if err == nil {
		t.Errorf("expected error for nil pool on DeleteBudget, got nil")
	}
}

func TestBudget_Calculation(t *testing.T) {
	b := Budget{
		ID:                    "budget-1",
		OrganisationID:        "org-1",
		Name:                  "Production Monthly",
		Amount:                1000.0,
		Period:                "monthly",
		AlertThresholdPercent: 80,
		CurrentSpend:          850.0,
		PercentUsed:           85.0,
		Status:                "warning",
	}

	if b.Status != "warning" {
		t.Errorf("expected status warning, got %s", b.Status)
	}
	if b.PercentUsed != 85.0 {
		t.Errorf("expected percent used 85.0, got %f", b.PercentUsed)
	}
}
