<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { Bookmark, Check, Headphones, KeyRound, NotebookPen, Target, Timer, Trash, X, Zap } from '@lucide/vue'
import AudioPlayer from '../components/AudioPlayer.vue'
import AnswerSheet from '../components/AnswerSheet.vue'
import Mascot from '../components/Mascot.vue'
import TypeBadge from '../components/TypeBadge.vue'
import { LESSONS, TYPE_META, findLesson, formatTime } from '../data/lessons'
import { addXp, getProgress, resetLesson, touch, xpFor } from '../composables/useProgress'

const props = defineProps<{ id: string }>()
const router = useRouter()

const lesson = findLesson(props.id)
if (!lesson) router.replace('/')
if (lesson) getProgress(lesson)
const progress = computed(() => (lesson ? getProgress(lesson) : null))

const idx = LESSONS.findIndex((l) => l.id === props.id)
const next = LESSONS[idx + 1]

const player = ref<InstanceType<typeof AudioPlayer>>()
const mode = ref<'answer' | 'key'>('answer')
const pendingCheck = ref(false)
const showResult = ref(false)
const startedAt = Date.now()
const sessionSeconds = ref(0)

const answered = computed(() => progress.value?.answers.filter(Boolean).length ?? 0)
const keyCount = computed(() => progress.value?.key.filter(Boolean).length ?? 0)
const keyComplete = computed(() => !!progress.value && keyCount.value === progress.value.questionCount)
const barPct = computed(() => {
  const p = progress.value
  if (!p) return 0
  if (p.checked) return 100
  return ((mode.value === 'key' ? keyCount.value : answered.value) / p.questionCount) * 100
})

const lastAttempt = computed(() => progress.value?.attempts.at(-1))
const accuracy = computed(() => {
  const a = lastAttempt.value
  return a && a.total ? Math.round((a.correct / a.total) * 100) : 0
})
const good = computed(() => accuracy.value >= 70)

const PRAISE = ['Excellent!', 'Amazing!', 'Great job!', 'Nailed it!']
const praise = computed(() =>
  accuracy.value === 100 ? 'Perfect!' : good.value ? PRAISE[(lastAttempt.value?.date ?? 0) % PRAISE.length] : 'Keep practicing!',
)

function check() {
  const p = progress.value!
  if (!answered.value) return
  if (!keyComplete.value) {
    pendingCheck.value = true
    mode.value = 'key'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  let correct = 0
  p.key.forEach((k, i) => k && p.answers[i] === k && correct++)
  const total = p.questionCount
  const xp = xpFor(correct, total)
  p.attempts.push({ date: Date.now(), correct, total, xp })
  p.checked = true
  addXp(xp)
  touch(p)
  sessionSeconds.value = Math.round((Date.now() - startedAt) / 1000)
  showResult.value = true
}

function saveKey() {
  mode.value = 'answer'
  if (pendingCheck.value) {
    pendingCheck.value = false
    check()
  }
}

function retry() {
  const p = progress.value!
  p.checked = false
  p.answers = Array(p.questionCount).fill(null)
  showResult.value = false
  player.value?.seek(0)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goNext() {
  router.push(next ? `/lesson/${next.id}` : '/')
}

function addBookmark(t: number) {
  const p = progress.value!
  const r = Math.round(t * 10) / 10
  if (p.bookmarks.some((b) => Math.abs(b - r) < 1)) return
  p.bookmarks.push(r)
  p.bookmarks.sort((a, b) => a - b)
  touch(p)
}

let touched = false
function onTick(s: number) {
  progress.value!.secondsListened += s
  if (!touched) {
    touched = true
    touch(progress.value!)
  }
}
function onEnded() {
  progress.value!.plays++
  addXp(5)
  touch(progress.value!)
}

const confirmReset = ref(false)
function doReset() {
  if (!lesson) return
  if (confirmReset.value) {
    resetLesson(lesson)
    confirmReset.value = false
    mode.value = 'answer'
  } else {
    confirmReset.value = true
    setTimeout(() => (confirmReset.value = false), 3000)
  }
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  const el = e.target as HTMLElement
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
  if (e.key === 'Enter') {
    e.preventDefault()
    if (showResult.value) showResult.value = false
    else if (mode.value === 'key') keyComplete.value && saveKey()
    else if (progress.value?.checked) goNext()
    else check()
  }
  if (e.key === 'Escape' && showResult.value) showResult.value = false
})
</script>

<template>
  <div v-if="lesson && progress" class="min-h-screen pb-44">
    <!-- Top bar -->
    <div class="sticky top-0 z-30 bg-bg/95 backdrop-blur">
      <div class="mx-auto flex h-20 max-w-3xl items-center gap-4 px-4">
        <RouterLink to="/" class="rounded-xl p-1 text-mute hover:text-mute-2" aria-label="Close lesson">
          <X :size="28" :stroke-width="3" />
        </RouterLink>
        <div class="relative h-4 flex-1 overflow-hidden rounded-full bg-line">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="mode === 'key' ? 'bg-plum' : 'bg-leaf'"
            :style="{ width: `${Math.max(barPct, 3)}%` }"
          >
            <div class="mx-2 mt-1 h-1 rounded-full bg-white/30" />
          </div>
        </div>
        <span class="flex items-center gap-1.5 font-extrabold text-wave" title="Times listened to the end">
          <Headphones :size="22" :stroke-width="2.5" /> {{ progress.plays }}
        </span>
      </div>
    </div>

    <main class="mx-auto max-w-3xl px-4">
      <!-- Heading -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-black text-ink-strong sm:text-3xl">
          {{ mode === 'key' ? 'Set the answer key' : 'Listen and answer' }}
        </h1>
        <TypeBadge :type="lesson.type" />
      </div>
      <p class="mt-1 text-mute-2">Lesson {{ lesson.number }} · {{ formatTime(lesson.duration) }}</p>

      <!-- Mascot + tip bubble -->
      <div class="mt-6 flex items-end gap-3">
        <Mascot :size="88" :mood="mode === 'key' ? 'wow' : 'happy'" class="shrink-0" />
        <div class="relative mb-4 rounded-2xl border-2 border-line px-4 py-3 text-[15px] leading-snug text-ink">
          <span class="absolute top-1/2 -left-[9px] size-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-bg" />
          <template v-if="mode === 'key'">
            Tap the <span class="text-plum-dark">correct answers</span> from your book or teacher. I'll remember them,
            so you only do this once.
          </template>
          <template v-else>{{ TYPE_META[lesson.type].tip }}</template>
        </div>
      </div>

      <!-- Player -->
      <div class="panel mt-4 p-4 sm:p-6">
        <AudioPlayer
          ref="player"
          :src="lesson.src"
          :duration="lesson.duration"
          :peaks="lesson.peaks"
          :bookmarks="progress.bookmarks"
          :start-at="progress.lastPosition"
          @tick="onTick"
          @ended="onEnded"
          @position="(t) => (progress!.lastPosition = t)"
          @bookmark="addBookmark"
        />
      </div>

      <!-- Questions -->
      <div class="mt-8">
        <AnswerSheet :lesson="lesson" :progress="progress" :mode="mode" />
      </div>

      <!-- Extras -->
      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <div class="panel p-4 sm:col-span-2">
          <p class="mb-2 flex items-center gap-2 font-extrabold text-ink-strong">
            <NotebookPen :size="20" class="text-fox" /> My notes
          </p>
          <textarea
            v-model="progress.notes"
            rows="4"
            placeholder="New words, phrases you misheard…"
            class="w-full resize-y rounded-xl border-2 border-line bg-card-2 p-3 font-semibold text-ink outline-none placeholder:text-mute focus:border-wave"
            @input="touch(progress)"
          />
        </div>

        <div class="panel p-4">
          <p class="mb-3 flex items-center gap-2 font-extrabold text-ink-strong">
            <Bookmark :size="20" class="text-cherry" /> Bookmarks
          </p>
          <div v-if="progress.bookmarks.length" class="flex flex-wrap gap-2">
            <span v-for="(b, i) in progress.bookmarks" :key="b" class="inline-flex overflow-hidden rounded-xl border-2 border-b-4 border-line">
              <button class="px-2.5 py-1 text-sm tabular-nums hover:bg-card-2" @click="player?.seek(b)">{{ formatTime(b) }}</button>
              <button class="border-l-2 border-line px-1.5 text-mute hover:bg-card-2 hover:text-cherry" aria-label="Remove" @click="progress.bookmarks.splice(i, 1)">
                <X :size="14" :stroke-width="3" />
              </button>
            </span>
          </div>
          <p v-else class="text-sm text-mute-2">Press <span class="rounded-md border-2 border-line px-1.5">B</span> while listening to mark a moment.</p>
        </div>

        <div class="panel p-4">
          <p class="mb-3 flex items-center gap-2 font-extrabold text-ink-strong">
            <Target :size="20" class="text-leaf" /> Attempts
          </p>
          <ul v-if="progress.attempts.length" class="space-y-2">
            <li v-for="(a, i) in [...progress.attempts].reverse().slice(0, 5)" :key="a.date" class="flex items-center gap-3 text-sm">
              <span class="w-6 text-mute">#{{ progress.attempts.length - i }}</span>
              <div class="h-3 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  class="h-full rounded-full"
                  :class="a.correct / a.total >= 0.7 ? 'bg-leaf' : 'bg-cherry'"
                  :style="{ width: `${(a.correct / a.total) * 100}%` }"
                />
              </div>
              <span class="w-10 text-right tabular-nums">{{ a.correct }}/{{ a.total }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-mute-2">No attempts yet.</p>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-mute">
        <span>
          <kbd class="rounded-md border-2 border-line px-1.5">Space</kbd> play ·
          <kbd class="rounded-md border-2 border-line px-1.5">← →</kbd> 5s ·
          <kbd class="rounded-md border-2 border-line px-1.5">Enter</kbd> check
        </span>
        <button class="flex items-center gap-1.5 hover:text-cherry" @click="doReset">
          <Trash :size="14" /> {{ confirmReset ? 'Tap again to reset' : 'Reset lesson' }}
        </button>
      </div>
    </main>

    <!-- Footer -->
    <footer
      class="fixed inset-x-0 bottom-0 z-40 border-t-2"
      :class="
        progress.checked && mode === 'answer'
          ? good
            ? 'animate-slide-up border-transparent bg-leaf-tint'
            : 'animate-slide-up border-transparent bg-cherry-tint'
          : 'border-line bg-bg'
      "
    >
      <div class="mx-auto flex min-h-28 max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-5">
        <!-- key mode -->
        <template v-if="mode === 'key'">
          <span class="flex items-center gap-2 text-plum-dark">
            <KeyRound :size="22" /> {{ keyCount }}/{{ progress.questionCount }} answers set
          </span>
          <button class="btn-plum min-w-40" :disabled="!keyComplete" @click="saveKey">
            {{ pendingCheck ? 'Save & check' : 'Save key' }}
          </button>
        </template>

        <!-- checked -->
        <template v-else-if="progress.checked">
          <div class="flex items-center gap-4">
            <span class="grid size-16 place-items-center rounded-full bg-white dark:bg-bg" :class="good ? 'text-leaf' : 'text-cherry'">
              <Check v-if="good" :size="36" :stroke-width="4" />
              <X v-else :size="36" :stroke-width="4" />
            </span>
            <div :class="good ? 'text-leaf-dark' : 'text-cherry-dark'">
              <p class="text-2xl font-black">{{ praise }}</p>
              <p class="font-extrabold">{{ lastAttempt?.correct }}/{{ lastAttempt?.total }} correct · +{{ lastAttempt?.xp ?? 0 }} XP</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button class="btn-ghost" @click="retry">Try again</button>
            <button :class="good ? 'btn-leaf' : 'btn-cherry'" class="min-w-36" @click="goNext">
              {{ next ? 'Continue' : 'Finish' }}
            </button>
          </div>
        </template>

        <!-- answering -->
        <template v-else>
          <button class="btn-ghost" @click="mode = 'key'"><KeyRound :size="18" /> Answer key</button>
          <button class="btn-leaf min-w-40" :disabled="!answered" @click="check">Check</button>
        </template>
      </div>
    </footer>

    <!-- Lesson complete -->
    <div v-if="showResult && lastAttempt" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg px-4 py-10">
      <div class="flex w-full max-w-md flex-col items-center text-center">
        <Mascot :size="150" :mood="good ? 'wow' : 'sad'" class="animate-pop" bob />
        <h2 class="animate-pop mt-6 text-3xl font-black" :class="good ? 'text-sun-dark' : 'text-wave'">
          {{ good ? 'Lesson complete!' : 'Good effort!' }}
        </h2>
        <p class="mt-2 text-mute-2">
          {{ good ? 'Your ears are getting sharper.' : 'Listen once more with the turtle on. You\'ll get it.' }}
        </p>

        <div class="mt-8 grid w-full grid-cols-3 gap-3">
          <div class="animate-pop overflow-hidden rounded-2xl border-2 border-sun bg-sun" style="animation-delay: 0.1s">
            <p class="py-1 text-xs font-black tracking-wide text-white uppercase">Total XP</p>
            <p class="flex items-center justify-center gap-1 rounded-t-xl bg-bg py-3 text-xl font-black text-sun-dark">
              <Zap :size="20" fill="currentColor" /> {{ lastAttempt.xp }}
            </p>
          </div>
          <div
            class="animate-pop overflow-hidden rounded-2xl border-2"
            :class="good ? 'border-leaf bg-leaf' : 'border-cherry bg-cherry'"
            style="animation-delay: 0.2s"
          >
            <p class="py-1 text-xs font-black tracking-wide text-white uppercase">{{ good ? 'Great' : 'Accuracy' }}</p>
            <p class="flex items-center justify-center gap-1 rounded-t-xl bg-bg py-3 text-xl font-black" :class="good ? 'text-leaf' : 'text-cherry'">
              <Target :size="20" /> {{ accuracy }}%
            </p>
          </div>
          <div class="animate-pop overflow-hidden rounded-2xl border-2 border-wave bg-wave" style="animation-delay: 0.3s">
            <p class="py-1 text-xs font-black tracking-wide text-white uppercase">Time</p>
            <p class="flex items-center justify-center gap-1 rounded-t-xl bg-bg py-3 text-xl font-black text-wave">
              <Timer :size="20" /> {{ formatTime(sessionSeconds) }}
            </p>
          </div>
        </div>

        <div class="mt-10 flex w-full flex-col gap-3 sm:flex-row">
          <button class="btn-ghost flex-1" @click="showResult = false">Review answers</button>
          <button class="btn-leaf flex-1" @click="goNext">{{ next ? 'Continue' : 'Finish' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
