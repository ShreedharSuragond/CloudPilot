import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { dashboardKeys } from './dashboard.queries'
import type { components } from '@/api/schema'

export type ConnectAccountRequest = components['schemas']['ConnectAccountRequest']
export type ChatRequest = components['schemas']['ChatRequest']
export type ChatResponse = components['schemas']['ChatResponse']

export function useConnectAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ConnectAccountRequest) =>
      api.post<components['schemas']['CloudAccount'], ConnectAccountRequest>('/api/v1/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary() })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useSyncAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (accountId: string) =>
      api.post<{ status: string }>(`/api/v1/accounts/${accountId}/sync`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCopilotChatMutation() {
  return useMutation({
    mutationFn: (data: ChatRequest) =>
      api.post<ChatResponse, ChatRequest>('/api/v1/copilot/chat', data),
  })
}

export function useCopilotRemediateMutation() {
  return useMutation({
    mutationFn: (findingId: string) =>
      api.post<{ remediation?: string; remediationCode?: string }, { findingId: string }>('/api/v1/copilot/remediate', {
        findingId,
      }),
  })
}
