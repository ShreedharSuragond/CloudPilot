import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  settingsKeys,
  type CreateIntegrationRequest,
  type Integration,
  type TestIntegrationResponse,
} from './integrations.queries'
import { dashboardKeys } from '@/features/dashboard/dashboard.queries'

export function useCreateIntegrationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateIntegrationRequest) =>
      api.post<Integration, CreateIntegrationRequest>('/api/v1/settings/integrations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useDeleteIntegrationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ status: string }>(`/api/v1/settings/integrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useToggleIntegrationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: string; enabled: boolean }, Record<string, never>>(
        `/api/v1/settings/integrations/${id}/toggle`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useTestIntegrationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.post<TestIntegrationResponse, Record<string, never>>(
        `/api/v1/settings/integrations/${id}/test`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}

export function useDisconnectAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accountId: string) =>
      api.delete<{ status: string }>(`/api/v1/accounts/${accountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}
