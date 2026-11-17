<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { Check, RotateCcw, Volume2, X } from '@lucide/vue'
import Mascot from '../components/Mascot.vue'
import { basePath, findTheme, posShort, shuffle, speak, type Word } from '../data/words'
import { recordQuiz, setStatus, wordStatus } from '../composables/useWords'

const props = defineProps<{ theme: string; mode: string }>()
const router = useRouter()
const t = findTheme(props.theme)
if (!t || (props.mode !== 'cards' && props.mode !== 'quiz')) router.replace('/words')
const back = `${t ? basePath(t) : '/words'}/${props.theme}`

/* ---------------- flashcards ---------------- */

const deck = ref<Word[]>([])
const flipped = ref(false)
const knewCount = ref(0)

function newDeck() {
  if (!t) return
  const todo = t.words.filter((w) => wordStatus(w.id) !== 'known')
  deck.value = shuffle(todo.length ? todo : t.words)
  i.value = 0
  flipped.value = false
  knewCount.value = 0
  finished.value = false
}

function rate(know: boolean) {
  const w = deck.value[i.value]
  if (!w) return
  setStatus(w.id, know ? 'known' : 'learning')
  if (know) knewCount.value++
  advance()
}

/* ---------------- quiz ---------------- */

type Kind = 'toUz' | 'fromUz' | 'fromDef'
interface Question {
  word: Word
  kind: Kind
  options: string[]
  answer: string
}
const QUIZ_LEN = 10
const questions = ref<Question[]>([])
const picked = ref<string | null>(null)
const checked = ref(false)
const correctCount = ref(0)
const earned = ref(0)
const missed = ref<Word[]>([])

function makeQuestion(word: Word, pool: Word[]): Question {
  const kind: Kind = (['toUz', 'fromUz', 'fromDef'] as const)[Math.floor(Math.random() * 3)]!
  const text = (w: Word) => (kind === 'toUz' ? w.translationUz : w.term)
  const answer = text(word)
  const others = [...new Set(shuffle(pool.filter((w) => w.id !== word.id)).map(text))].filter((x) => x !== answer)
  return { word, kind, answer, options: shuffle([answer, ...others.slice(0, 3)]) }
}

function newQuiz() {
  if (!t) return
  // words you're still learning come first, then the rest
  const learning = shuffle(t.words.filter((w) => wordStatus(w.id) === 'learning'))
  const rest = shuffle(t.words.filter((w) => wordStatus(w.id) !== 'learning'))
  questions.value = [...learning, ...rest].slice(0, QUIZ_LEN).map((w) => makeQuestion(w, t.words))
  questions.value = shuffle(questions.value)
  i.value = 0
  picked.value = null
  checked.value = false
  correctCount.value = 0
  missed.value = []
  finished.value = false
}

const q = computed(() => questions.value[i.value])
const isRight = computed(() => !!q.value && picked.value === q.value.answer)

function checkAnswer() {
  if (!q.value || !picked.value || checked.value) return
  checked.value = true
  if (isRight.value) correctCount.value++
  else {
    missed.value.push(q.value.word)
    setStatus(q.value.word.id, 'learning')
  }
}

function nextQuestion() {
  picked.value = null
  checked.value = false
  advance()
}

/* ---------------- shared ---------------- */

const i = ref(0)
const finished = ref(false)
const length = computed(() => (props.mode === 'cards' ? deck.value.length : questions.value.length))
const pct = computed(() => (finished.value ? 100 : (i.value / Math.max(1, length.value)) * 100))

function advance() {
  flipped.value = false
  if (i.value + 1 < length.value) {
    i.value++
    return
  }
  finished.value = true
  if (props.mode === 'quiz' && t) earned.value = recordQuiz(t.id, correctCount.value, questions.value.length)
}

function restart() {
  if (props.mode === 'cards') newDeck()
  else newQuiz()
}
restart()

const card = computed(() => deck.value[i.value])
const good = computed(() => (props.mode === 'quiz' ? correctCount.value / Math.max(1, questions.value.length) >= 0.7 : true))

const PROMPT: Record<Kind, string> = {
  toUz: 'What does this word mean?',
  fromUz: 'Which English word is this?',
  fromDef: 'Which word matches the definition?',
}

useEventListener('keydown', (e: KeyboardEvent) => {
  if (finished.value || e.metaKey || e.ctrlKey) return
  if (props.mode === 'cards') {
    if (e.key === ' ') {
      e.preventDefault()
      flipped.value = !flipped.value
    } else if (flipped.value && (e.key === '1' || e.key === 'ArrowLeft')) rate(false)
    else if (flipped.value && (e.key === '2' || e.key === 'ArrowRight')) rate(true)
  } else if (q.value) {
    const n = Number(e.key)
    if (!checked.value && n >= 1 && n <= q.value.options.length) picked.value = q.value.options[n - 1]!
    if (e.key === 'Enter') checked.value ? nextQuestion() : checkAnswer()
  }
})
</script>

<template>
  <div v-if="t" class="min-h-screen pb-40">
    <!-- top bar -->
    <div class="mx-auto flex max-w-3xl items-center gap-4 px-4 pt-6">
      <RouterLink :to="back" class="rounded-xl p-1 text-mute hover:text-mute-2" aria-label="Close">
        <X :size="28" :stroke-width="3" />
      </RouterLink>
      <div class="h-4 flex-1 overflow-hidden rounded-full bg-line">
        <div class="h-full rounded-full transition-all duration-500" :class="t.bar" :style="{ width: `${Math.max(pct, 3)}%` }">
          <div class="mx-2 mt-1 h-1 rounded-full bg-white/30" />
        </div>
      </div>
      <span class="w-14 text-right font-extrabold text-mute-2 tabular-nums">{{ Math.min(i + 1, length) }}/{{ length }}</span>
    </div>

    <!-- ======== FLASHCARDS ======== -->
    <main v-if="mode === 'cards' && card && !finished" class="mx-auto max-w-xl px-4">
      <h1 class="mt-6 text-2xl font-black text-ink-strong">Do you know this word?</h1>
      <p class="mt-1 text-mute-2">Tap the card to see the meaning.</p>

      <button
        :key="card.id"
        class="animate-pop mt-6 flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border-2 border-b-[6px] p-6 text-center transition"
        :class="flipped ? `${t.border} ${t.tint}` : 'border-line bg-card hover:bg-card-2'"
        @click="flipped = !flipped"
      >
        <span class="text-xs text-mute-2 uppercase italic">{{ posShort(card.partOfSpeech) }}</span>
        <span class="mt-2 text-4xl font-black break-words text-ink-strong">{{ card.term }}</span>
        <template v-if="flipped">
          <span class="mt-5 text-2xl font-black" :class="t.text">{{ card.translationUz }}</span>
          <span class="mt-2 max-w-sm font-semibold text-mute-2">{{ card.definitionEn }}</span>
        </template>
        <span v-else class="mt-6 rounded-xl border-2 border-line px-3 py-1 text-sm text-mute-2 uppercase">Show meaning</span>
      </button>
      <div class="mt-4 flex justify-center">
        <button class="chip" @click="speak(card.term)"><Volume2 :size="18" /> Listen</button>
      </div>
    </main>

    <!-- ======== QUIZ ======== -->
    <main v-else-if="mode === 'quiz' && q && !finished" class="mx-auto max-w-xl px-4">
      <h1 class="mt-6 text-2xl font-black text-ink-strong">{{ PROMPT[q.kind] }}</h1>

      <div class="mt-6 flex items-end gap-3">
        <Mascot :size="80" class="shrink-0" />
        <div class="relative mb-3 flex items-center gap-2 rounded-2xl border-2 border-line px-4 py-3">
          <span class="absolute top-1/2 -left-[9px] size-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-line bg-bg" />
          <template v-if="q.kind === 'toUz'">
            <button class="text-wave" aria-label="Listen" @click="speak(q.word.term)"><Volume2 :size="22" /></button>
            <span class="text-2xl font-black text-ink-strong">{{ q.word.term }}</span>
          </template>
          <span v-else-if="q.kind === 'fromUz'" class="text-2xl font-black text-plum-dark">{{ q.word.translationUz }}</span>
          <span v-else class="text-lg leading-snug font-extrabold text-ink-strong">{{ q.word.definitionEn }}</span>
        </div>
      </div>

      <div class="mt-6 grid gap-3">
        <button
          v-for="(o, n) in q.options"
          :key="o"
          :disabled="checked"
          class="flex items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left text-lg font-extrabold transition active:translate-y-[2px] active:border-b-2"
          :class="
            checked && o === q.answer
              ? 'border-leaf bg-leaf-tint text-leaf-dark'
              : checked && o === picked
                ? 'border-cherry bg-cherry-tint text-cherry-dark'
                : picked === o
                  ? 'border-wave bg-wave-tint text-wave-dark'
                  : 'border-line bg-card text-ink hover:bg-card-2'
          "
          @click="picked = o"
        >
          <span class="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-current text-sm opacity-60">{{ n + 1 }}</span>
          {{ o }}
        </button>
      </div>
    </main>

    <!-- ======== DONE ======== -->
    <main v-else-if="finished" class="mx-auto flex max-w-md flex-col items-center px-4 pt-10 text-center">
      <Mascot :size="140" :mood="good ? 'wow' : 'sad'" class="animate-pop" bob />
      <template v-if="mode === 'cards'">
        <h2 class="animate-pop mt-6 text-3xl font-black text-sun-dark">Deck done!</h2>
        <p class="mt-2 text-mute-2">You knew {{ knewCount }} of {{ deck.length }} cards.</p>
      </template>
      <template v-else>
        <h2 class="animate-pop mt-6 text-3xl font-black" :class="good ? 'text-sun-dark' : 'text-wave'">
          {{ correctCount === questions.length ? 'Perfect!' : good ? 'Great job!' : 'Keep practicing!' }}
        </h2>
        <div class="mt-6 grid w-full grid-cols-2 gap-3">
          <div class="animate-pop overflow-hidden rounded-2xl border-2 border-sun bg-sun">
            <p class="py-1 text-xs text-white uppercase">Total XP</p>
            <p class="bg-card py-3 text-2xl font-black text-sun-dark">+{{ earned }}</p>
          </div>
          <div class="animate-pop overflow-hidden rounded-2xl border-2" :class="good ? 'border-leaf bg-leaf' : 'border-cherry bg-cherry'">
            <p class="py-1 text-xs text-white uppercase">Correct</p>
            <p class="bg-card py-3 text-2xl font-black" :class="good ? 'text-leaf-dark' : 'text-cherry-dark'">
              {{ correctCount }}/{{ questions.length }}
            </p>
          </div>
        </div>
        <div v-if="missed.length" class="panel mt-6 w-full p-4 text-left">
          <p class="mb-2 font-extrabold text-ink-strong">Review these</p>
          <p v-for="w in missed" :key="w.id" class="py-1">
            <span class="font-black text-ink-strong">{{ w.term }}</span>
            <span class="text-mute-2"> — {{ w.translationUz }}</span>
          </p>
        </div>
      </template>
      <div class="mt-8 flex w-full gap-3">
        <button class="btn-ghost flex-1" @click="restart"><RotateCcw :size="18" /> Again</button>
        <RouterLink :to="back" class="btn-leaf flex-1">Continue</RouterLink>
      </div>
    </main>

    <!-- footer -->
    <footer
      v-if="!finished"
      class="fixed inset-x-0 bottom-0 z-40 border-t-2"
      :class="
        mode === 'quiz' && checked
          ? isRight
            ? 'animate-slide-up border-transparent bg-leaf-tint'
            : 'animate-slide-up border-transparent bg-cherry-tint'
          : 'border-line bg-bg'
      "
    >
      <div class="mx-auto flex min-h-28 max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-5">
        <template v-if="mode === 'cards'">
          <button class="btn-ghost flex-1 sm:flex-none" :disabled="!flipped" @click="rate(false)">Still learning</button>
          <button class="btn-leaf flex-1 sm:min-w-40 sm:flex-none" :disabled="!flipped" @click="rate(true)">I know it</button>
        </template>
        <template v-else-if="q && checked">
          <div class="flex items-center gap-4">
            <span class="grid size-14 shrink-0 place-items-center rounded-full bg-white dark:bg-bg" :class="isRight ? 'text-leaf' : 'text-cherry'">
              <Check v-if="isRight" :size="32" :stroke-width="4" />
              <X v-else :size="32" :stroke-width="4" />
            </span>
            <div :class="isRight ? 'text-leaf-dark' : 'text-cherry-dark'">
              <p class="text-xl font-black">{{ isRight ? 'Correct!' : 'Correct answer:' }}</p>
              <p class="font-extrabold">
                <template v-if="isRight">{{ q.word.term }} — {{ q.word.translationUz }}</template>
                <template v-else>{{ q.answer }}</template>
              </p>
            </div>
          </div>
          <button :class="isRight ? 'btn-leaf' : 'btn-cherry'" class="min-w-36 flex-1 sm:flex-none" @click="nextQuestion">Continue</button>
        </template>
        <template v-else>
          <span class="hidden text-sm text-mute sm:inline">
            <kbd class="rounded-md border-2 border-line px-1.5">1–4</kbd> pick ·
            <kbd class="rounded-md border-2 border-line px-1.5">Enter</kbd> check
          </span>
          <button class="btn-leaf min-w-40 flex-1 sm:flex-none" :disabled="!picked" @click="checkAnswer">Check</button>
        </template>
      </div>
    </footer>
  </div>
</template>
