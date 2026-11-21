import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type DashboardSummary = components['schemas']['DashboardSummary']
export type SpendBreakdown = components['schemas']['SpendBreakdown']
export type PolicyFinding = components['schemas']['PolicyFinding']
export type CloudAccount = components['schemas']['CloudAccount']
export type CloudResource = components['schemas']['CloudResource']
export type CopilotInsight = components['schemas']['CopilotInsight']

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (orgId?: string | null) => [...dashboardKeys.all, 'summary', orgId] as const,
  spend: (orgId?: string | null) => [...dashboardKeys.all, 'spend', orgId] as const,
  findings: (orgId?: string | null) => [...dashboardKeys.all, 'findings', orgId] as const,
  accounts: (orgId?: string | null) => ['accounts', orgId] as const,
  inventory: (orgId?: string | null, filters?: { provider?: string; type?: string }) => ['inventory', orgId, filters] as const,
  copilotInsights: (orgId?: string | null) => ['copilot', 'insights', orgId] as const,
}

export function useDashboardSummaryQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: dashboardKeys.summary(activeOrgId),
    queryFn: () => api.get<DashboardSummary>('/api/v1/dashboard/summary'),
    staleTime: 30_000,
  })
}

export function useSpendBreakdownQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: dashboardKeys.spend(activeOrgId),
    queryFn: () => api.get<SpendBreakdown>('/api/v1/dashboard/spend-breakdown'),
    staleTime: 30_000,
  })
}

export function useRecentFindingsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: dashboardKeys.findings(activeOrgId),
    queryFn: () => api.get<PolicyFinding[]>('/api/v1/dashboard/recent-findings'),
    staleTime: 30_000,
  })
}

export function useCloudAccountsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: dashboardKeys.accounts(activeOrgId),
    queryFn: () => api.get<CloudAccount[]>('/api/v1/accounts'),
    staleTime: 30_000,
  })
}

export function useInventoryQuery(filters?: { provider?: string; type?: string }) {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  const queryParams = new URLSearchParams()
  if (filters?.provider && filters.provider !== 'all') {
    queryParams.set('provider', filters.provider)
  }
  if (filters?.type && filters.type !== 'all') {
    queryParams.set('type', filters.type)
  }
  const queryString = queryParams.toString()
  const path = `/api/v1/inventory${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: dashboardKeys.inventory(activeOrgId, filters),
    queryFn: () => api.get<CloudResource[]>(path),
    staleTime: 30_000,
  })
}

export function useCopilotInsightsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: dashboardKeys.copilotInsights(activeOrgId),
    queryFn: () =>
      api.get<{ insights: CopilotInsight[] }>('/api/v1/copilot/insights').then((res) => res.insights),
    staleTime: 60_000,
  })
}
