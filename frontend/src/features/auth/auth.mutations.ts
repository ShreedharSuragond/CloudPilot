import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

type LogoutResponse = { status: string }

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
