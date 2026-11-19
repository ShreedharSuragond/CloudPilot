import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type AuthConfig = {
  enabled: boolean
  clientConfigured: boolean
  devAuthEnabled?: boolean
}

export type AuthMe = {
  user: {
    id: string
    email: string
    name: string
  }
  memberships: Array<{
    organisationId: string
    organisationName: string
    role: string
  }>
}

export const authQueryKeys = {
  all: ['auth'] as const,
  config: () => [...authQueryKeys.all, 'config'] as const,
  me: () => [...authQueryKeys.all, 'me'] as const,
}

export function useAuthConfigQuery() {
  return useQuery({
    queryKey: authQueryKeys.config(),
    queryFn: () => api.get<AuthConfig>('/auth/config'),
    retry: false,
  })
}

export function useAuthMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: () => api.get<AuthMe>('/auth/me'),
    retry: false,
  })
}
