const API_BASE = '/api'

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const url = `${API_BASE}${endpoint}`
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Request failed')
    }

    return { data: data as T, error: null, status: res.status }
  } catch (err) {
    clearTimeout(timeout)
    // Re-throw our own thrown errors; wrap unexpected network errors
    if (err instanceof Error) throw err
    throw new Error('Network error')
  }
}

/**
 * Safely extract an array from an API response that may be wrapped in
 * one or two layers of `{ data: ... }`.
 *
 * Handles these shapes:
 *   - `[...]`                          — raw array
 *   - `{ data: [...] }`                — unwrapped once (queryFn returns `res.data`)
 *   - `{ data: { data: [...] } }`      — full api.get() result (queryFn returns full response)
 *   - `{ data: { data: [...] }, ... }` — full api.get() result with extra fields
 */
export function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    // Try { data: [...] }
    const d = (raw as Record<string, unknown>).data
    if (Array.isArray(d)) return d as T[]
    // Try { data: { data: [...] } }
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const inner = (d as Record<string, unknown>).data
      if (Array.isArray(inner)) return inner as T[]
    }
  }
  return []
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
}
