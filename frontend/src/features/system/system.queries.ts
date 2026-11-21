import { useQuery } from '@tanstack/react-query'
import type { components } from '../../api/schema'
import { api } from '../../lib/api'

export interface DatabaseHealth {
  status: 'connected' | 'unavailable' | 'not_configured'
  latency?: string
  message?: string
  total_connections?: number
  idle_connections?: number
  active_connections?: number
}

export type DetailedHealthResponse = components['schemas']['Health'] & {
  timestamp?: string
  uptime?: string
  environment?: string
  version?: string
  database?: DatabaseHealth
}

export const systemQueryKeys = {
  all: ['system'] as const,
  health: () => [...systemQueryKeys.all, 'health'] as const,
}

export function useHealthQuery() {
  return useQuery({
    queryKey: systemQueryKeys.health(),
    queryFn: ({ signal }) => api.get<DetailedHealthResponse>('/healthz', { signal }),
    refetchInterval: 30_000,
    retry: 1,
  })
}
