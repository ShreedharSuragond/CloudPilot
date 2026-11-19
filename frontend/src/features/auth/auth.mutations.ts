import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { authQueryKeys, type AuthMe } from './auth.queries'

type LogoutResponse = { status: string }

export function useDevLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.post<AuthMe, object>('/auth/dev-login', {}),
    onSuccess: async (data) => {
      queryClient.setQueryData(authQueryKeys.me(), data)
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me() })
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      try {
        return await api.post<LogoutResponse, object>('/auth/logout', {})
      } catch (err) {
        console.warn('Logout API error:', err)
        return { status: 'logged_out' }
      }
    },
    onSettled: () => {
      queryClient.clear()
      window.location.replace('/login')
    },
  })
}
