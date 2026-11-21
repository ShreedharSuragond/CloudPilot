import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type AIWorkloadSummary = components['schemas']['AIWorkloadSummary']
export type AIWorkloadGuardrails = components['schemas']['AIWorkloadGuardrails']
export type AIWorkloadItem = components['schemas']['AIWorkloadItem']
export type AIWorkloadsResponse = components['schemas']['AIWorkloadsResponse']
export type ApplyRemediationRequest = components['schemas']['ApplyRemediationRequest']
export type ApplyRemediationResponse = components['schemas']['ApplyRemediationResponse']

export const aiWorkloadKeys = {
  all: ['ai-workloads'] as const,
  list: (orgId: string | null) => [...aiWorkloadKeys.all, 'list', orgId] as const,
}

export function useAIWorkloadsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: aiWorkloadKeys.list(activeOrgId),
    queryFn: () => api.get<AIWorkloadsResponse>('/api/v1/ai/workloads'),
    staleTime: 30 * 1000,
  })
}
