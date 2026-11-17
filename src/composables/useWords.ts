import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { api } from '../api'
import { ALL_WORDS, type Theme } from '../data/words'
import { addXp, syncError, today } from './useProgress'

/** Saved on the server as the progress row "words". */
export interface WordsState {
  known: string[]
  learning: string[]
  quizzes: { date: number; theme: string; correct: number; total: number }[]
  updatedAt: number
}

const blank = (): WordsState => ({ known: [], learning: [], quizzes: [], updatedAt: 0 })

const state = ref<WordsState>(blank())
let synced = ''
let syncing = false

export function setWordsState(raw: unknown, enable = true) {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<WordsState>
  state.value = {
    known: Array.isArray(s.known) ? s.known : [],
    learning: Array.isArray(s.learning) ? s.learning : [],
    quizzes: Array.isArray(s.quizzes) ? s.quizzes : [],
    updatedAt: s.updatedAt ?? 0,
  }
  synced = JSON.stringify(state.value)
  syncing = enable
}

async function flush(keepalive = false) {
  if (!syncing) return
  const json = JSON.stringify(state.value)
  if (json === synced) return
  synced = json
  try {
    await api('PUT', '/progress/words', json, { keepalive })
  } catch {
    synced = ''
    syncError.value = true
  }
}

watch(state, useDebounceFn(() => flush(), 1000, { maxWait: 8000 }), { deep: true })
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush(true))
  setInterval(() => !synced && syncing && flush(), 15000)
  // The app may be open on a phone and a laptop: when coming back to this
  // tab, pick up newer progress saved elsewhere (if nothing is pending here).
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') return flush(true)
    if (!syncing || synced !== JSON.stringify(state.value)) return
    try {
      const s = await api<{ progress?: { words?: WordsState } }>('GET', '/state')
      const remote = s.progress?.words
      if (remote && remote.updatedAt > state.value.updatedAt && synced === JSON.stringify(state.value)) {
        setWordsState(remote)
      }
    } catch {
      /* offline: keep local */
    }
  })
}

const knownSet = computed(() => new Set(state.value.known))
const learningSet = computed(() => new Set(state.value.learning))

export type WordStatus = 'new' | 'learning' | 'known'

export function wordStatus(id: string): WordStatus {
  if (knownSet.value.has(id)) return 'known'
  if (learningSet.value.has(id)) return 'learning'
  return 'new'
}

function touch() {
  state.value.updatedAt = Date.now()
}

export function setStatus(id: string, s: WordStatus) {
  const st = state.value
  const wasKnown = knownSet.value.has(id)
  st.known = st.known.filter((x) => x !== id)
  st.learning = st.learning.filter((x) => x !== id)
  if (s === 'known') st.known.push(id)
  if (s === 'learning') st.learning.push(id)
  touch()
  // 1 XP the first time a word becomes known
  if (s === 'known' && !wasKnown) addXp(1)
}

/** Quiz: 2 XP per correct answer, +5 for a perfect round. */
export function recordQuiz(theme: string, correct: number, total: number) {
  const xp = correct * 2 + (total > 0 && correct === total ? 5 : 0)
  state.value.quizzes.push({ date: Date.now(), theme, correct, total })
  if (state.value.quizzes.length > 50) state.value.quizzes.splice(0, state.value.quizzes.length - 50)
  touch()
  addXp(xp)
  return xp
}

export function useWords() {
  const knownCount = computed(() => ALL_WORDS.filter((w) => knownSet.value.has(w.id)).length)
  const learningCount = computed(() => ALL_WORDS.filter((w) => learningSet.value.has(w.id)).length)
  const themeKnown = (t: Theme) => t.words.filter((w) => knownSet.value.has(w.id)).length
  const bestQuiz = (theme: string) => {
    const qs = state.value.quizzes.filter((q) => q.theme === theme && q.total)
    return qs.length ? Math.max(...qs.map((q) => q.correct / q.total)) : null
  }
  return { state, knownCount, learningCount, themeKnown, bestQuiz, today }
}
