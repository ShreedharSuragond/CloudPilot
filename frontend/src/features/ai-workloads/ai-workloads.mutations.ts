import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  aiWorkloadKeys,
  type ApplyRemediationRequest,
  type ApplyRemediationResponse,
} from './ai-workloads.queries'
import { policyKeys } from '@/features/policies/policies.queries'

export function useApplyRemediationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ApplyRemediationRequest) =>
      api.post<ApplyRemediationResponse, ApplyRemediationRequest>(
        '/api/v1/copilot/remediate/apply',
        payload
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiWorkloadKeys.all })
      queryClient.invalidateQueries({ queryKey: policyKeys.all })
    },
  })
}
