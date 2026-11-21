import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { finopsKeys, type Budget, type CreateBudgetRequest } from './finops.queries'

export function useCreateBudgetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBudgetRequest) =>
      api.post<Budget, CreateBudgetRequest>('/api/v1/finops/budgets', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: finopsKeys.all })
    },
  })
}

export function useDeleteBudgetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (budgetId: string) =>
      api.delete<{ status: string }>(`/api/v1/finops/budgets/${budgetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: finopsKeys.all })
    },
  })
}
