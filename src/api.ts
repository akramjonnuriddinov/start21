import { ref } from 'vue'

const TOKEN_KEY = 'echo:token'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const token = ref<string | null>(readToken())

export function setToken(t: string | null) {
  token.value = t
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode: stay logged in for this tab only */
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null
export function handleUnauthorized(fn: () => void) {
  onUnauthorized = fn
}

export async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  opts: { keepalive?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (token.value) headers.Authorization = `Bearer ${token.value}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      keepalive: opts.keepalive,
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your internet connection.")
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token.value && !path.startsWith('/login')) onUnauthorized?.()
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`)
  }
  return data as T
}
