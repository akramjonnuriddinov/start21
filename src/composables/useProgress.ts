import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { LESSONS, TYPE_META, type Lesson } from '../data/lessons'
import { api } from '../api'
import { setWordsState } from './useWords'

export interface Attempt {
  date: number
  correct: number
  total: number
  xp?: number
}

export interface LessonProgress {
  questionCount: number
  optionCount: number
  answers: (string | null)[]
  key: (string | null)[]
  checked: boolean
  notes: string
  bookmarks: number[]
  plays: number
  secondsListened: number
  lastPosition: number
  attempts: Attempt[]
  updatedAt: number
}

export interface ServerState {
  progress: Record<string, LessonProgress>
  xp: Record<string, number>
}

/* ------------------------------------------------------------------
   State lives in memory and is mirrored to the server.
   Every lesson is saved on its own (PUT /api/progress/:id) shortly after
   it changes; XP is sent as increments.
   ------------------------------------------------------------------ */

const store = ref<Record<string, LessonProgress>>({})
const xpByDay = ref<Record<string, number>>({})
export const DAILY_GOAL = 30

export const syncError = ref(false)
const synced = new Map<string, string>()
let syncing = false

export function hydrate(state: ServerState) {
  // the vocab state is saved under the id "words" and handled by useWords
  const { words, ...lessons } = (state.progress ?? {}) as Record<string, unknown>
  setWordsState(words)
  store.value = lessons as Record<string, LessonProgress>
  xpByDay.value = state.xp ?? {}
  synced.clear()
  for (const [id, p] of Object.entries(store.value)) synced.set(id, JSON.stringify(p))
  syncing = true
}

export function clearLocal() {
  syncing = false
  setWordsState(undefined, false)
  store.value = {}
  xpByDay.value = {}
  synced.clear()
}

export async function flush(keepalive = false) {
  if (!syncing) return
  const jobs: Promise<unknown>[] = []
  for (const [id, p] of Object.entries(store.value)) {
    const json = JSON.stringify(p)
    if (synced.get(id) === json) continue
    // don't save lessons that were only opened
    if (!synced.has(id) && !p.updatedAt && !p.secondsListened) continue
    synced.set(id, json)
    jobs.push(
      api('PUT', `/progress/${id}`, json, { keepalive }).catch(() => {
        synced.delete(id)
        syncError.value = true
      }),
    )
  }
  await Promise.all(jobs)
  if (jobs.length && ![...Object.entries(store.value)].some(([id, p]) => synced.get(id) !== JSON.stringify(p))) {
    syncError.value = false
  }
}

const scheduleFlush = useDebounceFn(() => flush(), 1000, { maxWait: 8000 })
watch(store, scheduleFlush, { deep: true })

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush(true))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true))
  // retry failed saves every 15s
  setInterval(() => syncError.value && flush(), 15000)
}

export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function blank(lesson: Lesson): LessonProgress {
  const meta = TYPE_META[lesson.type]
  return {
    questionCount: meta.defaultQuestions,
    optionCount: meta.defaultOptions,
    answers: Array(meta.defaultQuestions).fill(null),
    key: Array(meta.defaultQuestions).fill(null),
    checked: false,
    notes: '',
    bookmarks: [],
    plays: 0,
    secondsListened: 0,
    lastPosition: 0,
    attempts: [],
    updatedAt: 0,
  }
}

export function getProgress(lesson: Lesson): LessonProgress {
  if (!store.value[lesson.id]) store.value[lesson.id] = blank(lesson)
  return store.value[lesson.id]!
}

export function peekProgress(id: string): LessonProgress | undefined {
  return store.value[id]
}

export function addXp(n: number) {
  const day = today()
  xpByDay.value[day] = (xpByDay.value[day] ?? 0) + n
  api('POST', '/xp', { day, amount: n }).catch(() => {
    /* XP is best-effort; the lesson data itself is retried */
  })
}

/** Marks today as an active day (for the streak). */
export function touch(p: LessonProgress) {
  p.updatedAt = Date.now()
  if (!(today() in xpByDay.value)) addXp(0)
}

/** 10 XP per correct answer, +10 bonus for a perfect sheet */
export function xpFor(correct: number, total: number) {
  return correct * 10 + (total > 0 && correct === total ? 10 : 0)
}

export function resetLesson(lesson: Lesson) {
  store.value[lesson.id] = { ...blank(lesson), updatedAt: Date.now() }
}

export function bestScore(p?: LessonProgress) {
  if (!p || !p.attempts.length) return null
  return Math.max(...p.attempts.map((a) => (a.total ? a.correct / a.total : 0)))
}

export type Status = 'new' | 'started' | 'done'
export function statusOf(p?: LessonProgress): Status {
  if (!p) return 'new'
  if (p.attempts.length) return 'done'
  if (p.plays || p.secondsListened > 5 || p.answers.some(Boolean)) return 'started'
  return 'new'
}

export function useStats() {
  const done = computed(() => LESSONS.filter((l) => statusOf(store.value[l.id]) === 'done').length)

  const avgScore = computed(() => {
    const scores = LESSONS.map((l) => bestScore(store.value[l.id])).filter((s): s is number => s !== null)
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  })

  const minutesListened = computed(() =>
    Math.round(Object.values(store.value).reduce((a, p) => a + (p.secondsListened || 0), 0) / 60),
  )

  const streak = computed(() => {
    const set = new Set(Object.keys(xpByDay.value))
    const fmt = (x: Date) =>
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    const d = new Date()
    // the streak survives until you practise today
    if (!set.has(fmt(d))) d.setDate(d.getDate() - 1)
    let n = 0
    while (set.has(fmt(d))) {
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  })

  const lastActive = computed(() => {
    let best: Lesson | undefined
    let t = 0
    for (const l of LESSONS) {
      const p = store.value[l.id]
      if (p && p.updatedAt > t && statusOf(p) !== 'done') {
        t = p.updatedAt
        best = l
      }
    }
    return best ?? LESSONS.find((l) => statusOf(store.value[l.id]) === 'new')
  })

  const totalXp = computed(() => Object.values(xpByDay.value).reduce((a, b) => a + b, 0))
  const todayXp = computed(() => xpByDay.value[today()] ?? 0)

  return { done, avgScore, minutesListened, streak, lastActive, store, totalXp, todayXp }
}
