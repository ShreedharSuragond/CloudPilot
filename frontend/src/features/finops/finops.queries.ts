import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type CostTrend = components['schemas']['CostTrend']
export type DailySpendItem = components['schemas']['DailySpendItem']
export type CostAnomaly = components['schemas']['CostAnomaly']
export type Budget = components['schemas']['Budget']
export type CreateBudgetRequest = components['schemas']['CreateBudgetRequest']

export const finopsKeys = {
  all: ['finops'] as const,
  trends: (orgId: string | null) => [...finopsKeys.all, 'trends', orgId] as const,
  anomalies: (orgId: string | null) => [...finopsKeys.all, 'anomalies', orgId] as const,
  budgets: (orgId: string | null) => [...finopsKeys.all, 'budgets', orgId] as const,
}

export function useCostTrendsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: finopsKeys.trends(activeOrgId),
    queryFn: () => api.get<CostTrend>('/api/v1/finops/trends'),
    staleTime: 60 * 1000,
  })
}

export function useCostAnomaliesQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: finopsKeys.anomalies(activeOrgId),
    queryFn: () => api.get<CostAnomaly[]>('/api/v1/finops/anomalies'),
    staleTime: 60 * 1000,
  })
}

export function useBudgetsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: finopsKeys.budgets(activeOrgId),
    queryFn: () => api.get<Budget[]>('/api/v1/finops/budgets'),
    staleTime: 30 * 1000,
  })
}
