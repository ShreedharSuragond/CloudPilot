import { useQuery } from '@tanstack/react-query'
import type { components } from '../../api/schema'
import { api } from '../../lib/api'

export type HealthResponse = components['schemas']['Health']

export const systemQueryKeys = {
  all: ['system'] as const,
  readiness: () => [...systemQueryKeys.all, 'readiness'] as const,
}

export function useReadinessQuery() {
  return useQuery({
    queryKey: systemQueryKeys.readiness(),
    queryFn: ({ signal }) => api.get<HealthResponse>('/readyz', { signal }),
    refetchInterval: 30_000,
    retry: 1,
  })
}
