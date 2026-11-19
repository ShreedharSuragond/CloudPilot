import { useAuthMeQuery } from './auth.queries'

export function useAuth() {
  const { data: authMe, isPending, isError } = useAuthMeQuery()
  const isAuthenticated = Boolean(authMe?.user?.id)

  return {
    isAuthenticated,
    isPending,
    isError,
    user: authMe?.user ?? null,
    memberships: authMe?.memberships ?? [],
  }
}
