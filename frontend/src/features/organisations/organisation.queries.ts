import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type Organisation = components['schemas']['Organisation']
export type OrganisationMember = components['schemas']['OrganisationMember']
export type OrganisationInvitation = components['schemas']['OrganisationInvitation']
export type AuditEvent = components['schemas']['AuditEvent']

export const organisationQueryKeys = {
  all: ['organisations'] as const,
  list: () => [...organisationQueryKeys.all, 'list'] as const,
  current: (orgId: string | null) => [...organisationQueryKeys.all, 'current', orgId] as const,
  members: (orgId: string | null) => [...organisationQueryKeys.all, 'members', orgId] as const,
  invitations: (orgId: string | null) => [...organisationQueryKeys.all, 'invitations', orgId] as const,
  auditEvents: (orgId: string | null) => [...organisationQueryKeys.all, 'auditEvents', orgId] as const,
}

export function useOrganisationsQuery() {
  return useQuery({
    queryKey: organisationQueryKeys.list(),
    queryFn: () => api.get<Organisation[]>('/api/v1/organisations'),
    staleTime: 60 * 1000,
  })
}

export function useCurrentOrganisationQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: organisationQueryKeys.current(activeOrgId),
    queryFn: () => api.get<Organisation>('/api/v1/organisations/current'),
    staleTime: 60 * 1000,
  })
}

export function useOrganisationMembersQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: organisationQueryKeys.members(activeOrgId),
    queryFn: () => api.get<OrganisationMember[]>('/api/v1/organisations/members'),
    staleTime: 30 * 1000,
  })
}

export function useOrganisationInvitationsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: organisationQueryKeys.invitations(activeOrgId),
    queryFn: () => api.get<OrganisationInvitation[]>('/api/v1/organisations/invitations'),
    staleTime: 30 * 1000,
  })
}

export function useAuditEventsQuery() {
  const activeOrgId = useWorkspaceStore((state) => state.activeOrganisationId)
  return useQuery({
    queryKey: organisationQueryKeys.auditEvents(activeOrgId),
    queryFn: () => api.get<AuditEvent[]>('/api/v1/audit/events'),
    staleTime: 15 * 1000,
  })
}
