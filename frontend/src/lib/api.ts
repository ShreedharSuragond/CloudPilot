import { useWorkspaceStore } from '@/stores/workspace.store'

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  const activeOrgId = useWorkspaceStore.getState().activeOrganisationId
  if (activeOrgId && !headers.has('X-Organisation-ID')) {
    headers.set('X-Organisation-ID', activeOrgId)
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => undefined)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
        ? body.message
        : `Request failed (${response.status})`

    throw new ApiError(message, response.status, body)
  }

  return body as T
}

export const api = {
  get: <T>(path: string, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'GET' }),

  post: <TResponse, TBody = unknown>(path: string, data: TBody, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<TResponse>(path, {
      ...init,
      method: 'POST',
      body: JSON.stringify(data),
    }),

  patch: <TResponse, TBody = unknown>(path: string, data: TBody, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<TResponse>(path, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (path: string, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<void>(path, { ...init, method: 'DELETE' }),
}
