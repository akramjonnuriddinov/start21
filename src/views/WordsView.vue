<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookA, ChevronRight, NotebookPen, Search, Sparkles, Star, X } from '@lucide/vue'
import Mascot from '../components/Mascot.vue'
import WordRow from '../components/WordRow.vue'
import { GROUPS, basePath, findTheme, type ThemeGroup } from '../data/words'
import { useWords, wordStatus } from '../composables/useWords'

/** Same page for both: topic vocabulary (/words) and Level 4 definitions (/definitions). */
const props = withDefaults(defineProps<{ group?: ThemeGroup }>(), { group: 'bank' })

const { themeKnown, bestQuiz } = useWords()
const g = GROUPS.find((x) => x.id === props.group)!
const isDefs = props.group === 'level4'
const words = g.themes.flatMap((t) => t.words)
const total = words.length

const known = computed(() => words.filter((w) => wordStatus(w.id) === 'known').length)
const learning = computed(() => words.filter((w) => wordStatus(w.id) === 'learning').length)
const pct = computed(() => Math.round((known.value / total) * 100))

const q = ref('')
const results = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (s.length < 2) return []
  return words
    .filter(
      (w) =>
        w.term.toLowerCase().includes(s) ||
        w.translationUz.toLowerCase().includes(s) ||
        w.definitionEn.toLowerCase().includes(s),
    )
    .sort((a, b) => Number(!a.term.toLowerCase().startsWith(s)) - Number(!b.term.toLowerCase().startsWith(s)))
    .slice(0, 40)
})

const stars = (id: string) => {
  const b = bestQuiz(id)
  return b === null ? 0 : b >= 0.95 ? 3 : b >= 0.7 ? 2 : 1
}
const label = (id: string) => {
  const t = findTheme(id)
  return t?.lesson ? `Lesson ${t.lesson}` : t?.short
}
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 pt-6 pb-16">
    <!-- Hero -->
    <section class="panel flex flex-col gap-5 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6">
      <Mascot :size="96" :mood="isDefs ? 'happy' : 'wow'" class="shrink-0 self-center" bob />
      <div class="min-w-0 flex-1">
        <p
          class="flex items-center gap-2 text-sm font-extrabold tracking-wide uppercase"
          :class="isDefs ? 'text-fox-dark' : 'text-plum-dark'"
        >
          <NotebookPen v-if="isDefs" :size="18" />
          <BookA v-else :size="18" />
          {{ isDefs ? 'Level 4 · Daily definitions' : 'Word bank' }}
        </p>
        <h1 class="mt-1 text-2xl font-black text-ink-strong sm:text-3xl">{{ known }} of {{ total }} words learned</h1>
        <div class="mt-3 h-4 overflow-hidden rounded-full bg-line">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="isDefs ? 'bg-fox' : 'bg-plum'"
            :style="{ width: `${Math.max(pct, 2)}%` }"
          >
            <div class="mx-2 mt-1 h-1 rounded-full bg-white/30" />
          </div>
        </div>
        <p class="mt-2 text-sm text-mute-2">
          <span class="text-sun-dark">{{ learning }} still learning</span> ·
          {{ isDefs ? '12 words to define for each book lesson' : 'English → Uzbek, with short definitions' }}
        </p>
      </div>
    </section>

    <!-- Search -->
    <label class="mt-6 flex items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3 focus-within:border-wave">
      <Search :size="20" class="text-mute" />
      <input
        v-model="q"
        type="text"
        enterkeyhint="search"
        :placeholder="isDefs ? 'Search the Level 4 words…' : 'Search a word, translation or meaning…'"
        class="w-full bg-transparent font-bold text-ink outline-none placeholder:text-mute"
      />
      <button v-if="q" class="text-mute hover:text-ink" aria-label="Clear" @click="q = ''"><X :size="18" /></button>
    </label>

    <section v-if="q.trim().length >= 2" class="mt-4">
      <p class="mb-2 text-sm text-mute-2">{{ results.length }} {{ results.length === 1 ? 'match' : 'matches' }}</p>
      <div v-if="results.length" class="panel divide-y-2 divide-line">
        <WordRow v-for="w in results" :key="w.id" :word="w" :theme-label="label(w.theme)" />
      </div>
      <p v-else class="panel p-6 text-center text-mute-2">Nothing found.</p>
    </section>

    <!-- Topics / lessons -->
    <section v-else class="mt-8">
      <h2 class="mb-4 text-xl font-black text-ink-strong">{{ isDefs ? 'Lessons' : 'Topics' }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="t in g.themes"
          :key="t.id"
          :to="`${basePath(t)}/${t.id}`"
          class="group flex flex-col rounded-2xl border-2 border-b-4 border-line bg-card p-4 transition hover:bg-card-2 active:translate-y-[2px] active:border-b-2"
        >
          <div class="flex items-start gap-3">
            <span class="grid size-14 shrink-0 place-items-center rounded-2xl text-white" :class="t.bg">
              <span v-if="t.lesson" class="text-2xl font-black tabular-nums">{{ String(t.lesson).padStart(2, '0') }}</span>
              <component :is="t.icon" v-else :size="28" :stroke-width="2.5" />
            </span>
            <div class="min-w-0 flex-1">
              <p v-if="t.lesson" class="text-xs tracking-wide uppercase" :class="t.text">Lesson {{ t.lesson }}</p>
              <p class="leading-tight font-black text-ink-strong" :class="{ 'line-clamp-2 text-[15px]': t.lesson }">
                {{ t.title }}
              </p>
              <p class="mt-1 text-sm text-mute-2">{{ t.words.length }} words</p>
            </div>
            <ChevronRight :size="22" class="mt-1 text-mute transition group-hover:translate-x-0.5" />
          </div>
          <div class="mt-auto flex items-center gap-3 pt-4">
            <div class="h-3 flex-1 overflow-hidden rounded-full bg-line">
              <div class="h-full rounded-full" :class="t.bar" :style="{ width: `${(themeKnown(t) / t.words.length) * 100}%` }" />
            </div>
            <span class="text-sm tabular-nums" :class="t.text">{{ themeKnown(t) }}/{{ t.words.length }}</span>
          </div>
          <div class="mt-3 flex items-center gap-1">
            <Star v-for="i in 3" :key="i" :size="18" :class="i <= stars(t.id) ? 'text-sun' : 'text-line'" fill="currentColor" />
            <span class="ml-auto flex items-center gap-1 text-xs text-mute-2 uppercase">
              <Sparkles :size="14" /> {{ stars(t.id) ? 'Quiz best' : 'No quiz yet' }}
            </span>
          </div>
        </RouterLink>
      </div>
    </section>
  </main>
</template>
