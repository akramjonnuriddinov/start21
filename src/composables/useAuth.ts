import { ref } from 'vue'
import { useStorage, StorageSerializers } from '@vueuse/core'
import { api, setToken, token, handleUnauthorized } from '../api'
import { clearLocal, flush, hydrate, type ServerState } from './useProgress'

export interface User {
  id: number
  name: string
  username: string
  createdAt: string
}

const user = ref<User | null>(null)
let restored = false

/** The last account used on this device, so coming back only needs the PIN. */
const remembered = useStorage<{ name: string; username: string } | null>('echo:last-user', null, undefined, {
  serializer: StorageSerializers.object,
})

async function loadState() {
  const state = await api<ServerState & { user: User }>('GET', '/state')
  hydrate(state)
  user.value = state.user
  remembered.value = { name: state.user.name, username: state.user.username }
}

async function restore() {
  if (restored) return
  restored = true
  if (!token.value) return
  try {
    await loadState()
  } catch {
    // token invalid or server down: fall back to the login screen
    setToken(null)
    user.value = null
  }
}

async function start(path: '/login' | '/register', body: object) {
  const res = await api<{ token: string; user: User }>('POST', path, body)
  setToken(res.token)
  await loadState()
}

const login = (username: string, pin: string) => start('/login', { username, pin })
const register = (name: string, username: string, pin: string) => start('/register', { name, username, pin })

async function logout() {
  await flush().catch(() => {})
  await api('POST', '/logout').catch(() => {})
  setToken(null)
  user.value = null
  clearLocal()
}

function forgetDevice() {
  remembered.value = null
}

handleUnauthorized(() => {
  setToken(null)
  user.value = null
  clearLocal()
  if (!location.hash.startsWith('#/welcome')) location.hash = '#/welcome'
})

export function useAuth() {
  return { user, remembered, restore, login, register, logout, forgetDevice }
}
