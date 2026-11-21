import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { policyKeys } from './policies.queries'
import { dashboardKeys } from '@/features/dashboard/dashboard.queries'

export function useSuppressFindingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ findingId, reason }: { findingId: string; reason: string }) =>
      api.post<{ status: string; reason: string }, { reason: string }>(
        `/api/v1/policies/findings/${findingId}/suppress`,
        { reason }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

export function useResolveFindingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (findingId: string) =>
      api.post<{ status: string }, Record<string, never>>(
        `/api/v1/policies/findings/${findingId}/resolve`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}

export function useEvaluatePoliciesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      api.post<{ status: string; totalViolations: number }, Record<string, never>>(
        '/api/v1/policies/evaluate',
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
  })
}
