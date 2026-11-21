import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type Integration = components['schemas']['Integration']
export type CreateIntegrationRequest = components['schemas']['CreateIntegrationRequest']
export type TestIntegrationResponse = components['schemas']['TestIntegrationResponse']
export type AuditEvent = components['schemas']['AuditEvent']

export const settingsKeys = {
  all: ['settings'] as const,
  integrations: (orgId: string | null) => [...settingsKeys.all, 'integrations', orgId] as const,
  audit: (orgId: string | null) => [...settingsKeys.all, 'audit', orgId] as const,
}

export function useIntegrationsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: settingsKeys.integrations(activeOrgId),
    queryFn: () => api.get<Integration[]>('/api/v1/settings/integrations'),
    staleTime: 30 * 1000,
  })
}

export function useAuditEventsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)

  return useQuery({
    queryKey: settingsKeys.audit(activeOrgId),
    queryFn: () => api.get<AuditEvent[]>('/api/v1/audit/events'),
    staleTime: 15 * 1000,
  })
}
