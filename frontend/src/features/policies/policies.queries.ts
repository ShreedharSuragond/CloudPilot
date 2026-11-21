import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type PolicyFindingDetail = components['schemas']['PolicyFindingDetail']
export type ComplianceSummaryDetail = components['schemas']['ComplianceSummaryDetail']

export interface PolicyFindingFilters {
  status?: string
  severity?: string
  framework?: string
  search?: string
}

export const policyKeys = {
  all: ['policies'] as const,
  findings: (orgId: string | null, filters?: PolicyFindingFilters) =>
    [...policyKeys.all, 'findings', orgId, filters] as const,
  summary: (orgId: string | null) => [...policyKeys.all, 'summary', orgId] as const,
}

export function usePolicyFindingsQuery(filters?: PolicyFindingFilters) {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.set('status', filters.status)
  if (filters?.severity && filters.severity !== 'all') queryParams.set('severity', filters.severity)
  if (filters?.framework && filters.framework !== 'all') queryParams.set('framework', filters.framework)
  if (filters?.search) queryParams.set('search', filters.search)

  const queryString = queryParams.toString()
  const path = `/api/v1/policies/findings${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: policyKeys.findings(activeOrgId, filters),
    queryFn: () => api.get<PolicyFindingDetail[]>(path),
    staleTime: 30 * 1000,
  })
}

export function useComplianceSummaryQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: policyKeys.summary(activeOrgId),
    queryFn: () => api.get<ComplianceSummaryDetail>('/api/v1/policies/compliance-summary'),
    staleTime: 30 * 1000,
  })
}
