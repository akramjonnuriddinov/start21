<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Layers, Zap } from '@lucide/vue'
import WordRow from '../components/WordRow.vue'
import { basePath, findTheme } from '../data/words'
import { useWords, wordStatus, type WordStatus } from '../composables/useWords'

const props = defineProps<{ theme: string }>()
const router = useRouter()
const t = findTheme(props.theme)
if (!t) router.replace('/words')
const base = t ? basePath(t) : '/words'

const { themeKnown } = useWords()

type Filter = 'all' | WordStatus
const filter = ref<Filter>('all')
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'learning', label: 'Learning' },
  { id: 'known', label: 'Learned' },
]
const count = (f: Filter) => (t ? (f === 'all' ? t.words.length : t.words.filter((w) => wordStatus(w.id) === f).length) : 0)
const list = computed(() => (t ? t.words.filter((w) => filter.value === 'all' || wordStatus(w.id) === filter.value) : []))
</script>

<template>
  <main v-if="t" class="mx-auto max-w-3xl px-4 pt-6 pb-16">
    <RouterLink :to="base" class="inline-flex items-center gap-1.5 text-sm text-mute-2 uppercase hover:text-ink">
      <ArrowLeft :size="18" /> {{ t.lesson ? 'All lessons' : 'All topics' }}
    </RouterLink>

    <!-- Banner -->
    <section class="mt-3 flex items-center gap-4 rounded-2xl p-5 text-white" :class="t.bg">
      <span class="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/20">
        <span v-if="t.lesson" class="text-3xl font-black tabular-nums">{{ String(t.lesson).padStart(2, '0') }}</span>
        <component :is="t.icon" v-else :size="34" :stroke-width="2.5" />
      </span>
      <div class="min-w-0">
        <p v-if="t.lesson" class="text-sm tracking-wide text-white/85 uppercase">Level 4 · Lesson {{ t.lesson }}</p>
        <h1 class="text-2xl leading-tight font-black">{{ t.title }}</h1>
        <p class="mt-1 font-extrabold text-white/85">{{ themeKnown(t) }} of {{ t.words.length }} learned</p>
      </div>
    </section>

    <!-- Practice -->
    <div class="mt-4 grid grid-cols-2 gap-3">
      <RouterLink :to="`${base}/${t.id}/cards`" class="btn-wave"><Layers :size="20" /> Flashcards</RouterLink>
      <RouterLink :to="`${base}/${t.id}/quiz`" class="btn-leaf"><Zap :size="20" /> Quiz</RouterLink>
    </div>

    <!-- Filter -->
    <div class="mt-8 flex flex-wrap gap-2">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        class="chip"
        :class="filter === f.id && 'border-wave! bg-wave-tint! text-wave-dark!'"
        @click="filter = f.id"
      >
        {{ f.label }} <span class="text-mute tabular-nums">{{ count(f.id) }}</span>
      </button>
    </div>

    <div v-if="list.length" class="panel mt-4 divide-y-2 divide-line">
      <WordRow v-for="w in list" :key="w.id" :word="w" />
    </div>
    <p v-else class="panel mt-4 p-6 text-center text-mute-2">No words here yet.</p>
  </main>
</template>
