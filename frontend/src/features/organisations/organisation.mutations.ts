import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { components } from '@/api/schema'
import { organisationQueryKeys, type Organisation } from './organisation.queries'
import { authQueryKeys } from '@/features/auth/auth.queries'
import { useWorkspaceStore } from '@/stores/workspace.store'

export type CreateOrganisationRequest = components['schemas']['CreateOrganisationRequest']
export type UpdateMemberRoleRequest = components['schemas']['UpdateMemberRoleRequest']
export type CreateInvitationRequest = components['schemas']['CreateInvitationRequest']

export function useCreateOrganisationMutation() {
  const queryClient = useQueryClient()
  const setActiveOrganisationId = useWorkspaceStore((state) => state.setActiveOrganisationId)

  return useMutation({
    mutationFn: (data: CreateOrganisationRequest) =>
      api.post<Organisation, CreateOrganisationRequest>('/api/v1/organisations', data),
    onSuccess: (newOrg) => {
      setActiveOrganisationId(newOrg.id)
      queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UpdateMemberRoleRequest['role'] }) =>
      api.post<{ status: string; role: string }, UpdateMemberRoleRequest>(
        `/api/v1/organisations/members/${userId}/role`,
        { role }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all })
    },
  })
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/v1/organisations/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all })
    },
  })
}

export function useInviteMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateInvitationRequest) =>
      api.post<components['schemas']['OrganisationInvitation'], CreateInvitationRequest>(
        '/api/v1/organisations/invitations',
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all })
    },
  })
}

export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`/api/v1/organisations/invitations/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organisationQueryKeys.all })
    },
  })
}
