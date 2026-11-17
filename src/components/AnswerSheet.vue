<script setup lang="ts">
import { computed } from 'vue'
import { Check, Minus, Plus, X } from '@lucide/vue'
import { TYPE_META, optionsFor, type Lesson } from '../data/lessons'
import { touch, type LessonProgress } from '../composables/useProgress'

const props = defineProps<{ lesson: Lesson; progress: LessonProgress; mode: 'answer' | 'key' }>()

const meta = computed(() => TYPE_META[props.lesson.type])
const options = computed(() => optionsFor(props.lesson.type, props.progress.optionCount))
const isTF = computed(() => props.lesson.type === 'tf' || props.lesson.type === 'tfng')

const LONG: Record<string, string> = { T: 'True', F: 'False', NG: 'Not given' }

function resize(n: number) {
  const p = props.progress
  n = Math.max(1, Math.min(20, n))
  p.questionCount = n
  const fit = (arr: (string | null)[]) => {
    const out = arr.slice(0, n)
    while (out.length < n) out.push(null)
    return out
  }
  p.answers = fit(p.answers)
  p.key = fit(p.key)
}
function resizeOptions(n: number) {
  const p = props.progress
  p.optionCount = Math.max(2, Math.min(8, n))
  const valid = new Set(optionsFor(props.lesson.type, p.optionCount))
  p.answers = p.answers.map((a) => (a && valid.has(a) ? a : null))
  p.key = p.key.map((a) => (a && valid.has(a) ? a : null))
}

function pick(i: number, opt: string) {
  const p = props.progress
  if (props.mode === 'key') p.key[i] = p.key[i] === opt ? null : opt
  else {
    if (p.checked) return
    p.answers[i] = p.answers[i] === opt ? null : opt
  }
  touch(p)
}

type Cell = 'idle' | 'picked' | 'key' | 'right' | 'wrong' | 'missed' | 'dim'
function cell(i: number, opt: string): Cell {
  const p = props.progress
  if (props.mode === 'key') return p.key[i] === opt ? 'key' : 'idle'
  const mine = p.answers[i] === opt
  if (p.checked) {
    const isKey = p.key[i] === opt
    if (mine && isKey) return 'right'
    if (mine) return 'wrong'
    if (isKey) return 'missed'
    return 'dim'
  }
  return mine ? 'picked' : 'idle'
}
const CELL: Record<Cell, string> = {
  idle: 'border-line border-b-line bg-card text-ink hover:bg-card-2',
  picked: 'border-wave border-b-wave-dark bg-wave-tint text-wave-dark',
  key: 'border-plum border-b-plum-dark bg-plum-tint text-plum-dark',
  right: 'border-leaf border-b-leaf-dark bg-leaf-tint text-leaf-dark',
  wrong: 'border-cherry border-b-cherry-dark bg-cherry-tint text-cherry-dark',
  missed: 'border-leaf border-dashed border-b-leaf text-leaf-dark',
  dim: 'border-line border-b-line text-mute',
}

function rowState(i: number) {
  const p = props.progress
  if (!p.checked || props.mode === 'key' || !p.key[i]) return null
  return p.answers[i] === p.key[i]
}
</script>

<template>
  <div>
    <!-- setup -->
    <div class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-mute-2">
      <span class="flex items-center gap-2">
        {{ meta.itemLabel }}s
        <span class="flex items-center rounded-xl border-2 border-line">
          <button class="p-1.5 hover:text-ink" aria-label="Fewer" @click="resize(progress.questionCount - 1)"><Minus :size="14" :stroke-width="3" /></button>
          <span class="w-5 text-center text-ink-strong">{{ progress.questionCount }}</span>
          <button class="p-1.5 hover:text-ink" aria-label="More" @click="resize(progress.questionCount + 1)"><Plus :size="14" :stroke-width="3" /></button>
        </span>
      </span>
      <span v-if="meta.configurableOptions" class="flex items-center gap-2">
        Options
        <span class="flex items-center rounded-xl border-2 border-line">
          <button class="p-1.5 hover:text-ink" aria-label="Fewer options" @click="resizeOptions(progress.optionCount - 1)"><Minus :size="14" :stroke-width="3" /></button>
          <span class="w-9 text-center text-ink-strong">A–{{ options[options.length - 1] }}</span>
          <button class="p-1.5 hover:text-ink" aria-label="More options" @click="resizeOptions(progress.optionCount + 1)"><Plus :size="14" :stroke-width="3" /></button>
        </span>
      </span>
      <span class="text-xs">Match the numbers in your book.</span>
    </div>

    <ol class="space-y-3">
      <li
        v-for="i in progress.questionCount"
        :key="i"
        class="flex flex-col gap-3 rounded-2xl border-2 p-3 sm:flex-row sm:items-center sm:p-4"
        :class="
          rowState(i - 1) === true
            ? 'border-leaf/50'
            : rowState(i - 1) === false
              ? 'border-cherry/50'
              : 'border-line'
        "
      >
        <div class="flex w-36 shrink-0 items-center gap-2.5 whitespace-nowrap">
          <span
            class="grid size-8 place-items-center rounded-full text-sm font-black"
            :class="
              rowState(i - 1) === true
                ? 'bg-leaf text-white'
                : rowState(i - 1) === false
                  ? 'bg-cherry text-white'
                  : 'bg-card-2 text-mute-2'
            "
          >
            <Check v-if="rowState(i - 1) === true" :size="16" :stroke-width="4" />
            <X v-else-if="rowState(i - 1) === false" :size="16" :stroke-width="4" />
            <template v-else>{{ i }}</template>
          </span>
          <span class="font-extrabold text-ink-strong">{{ meta.itemLabel }} {{ i }}</span>
        </div>
        <div class="grid flex-1 gap-2" :class="isTF ? (options.length === 3 ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]'">
          <button
            v-for="opt in options"
            :key="opt"
            class="rounded-xl border-2 border-b-4 py-2.5 font-extrabold transition-[transform,background-color] active:translate-y-[2px] active:border-b-2"
            :class="CELL[cell(i - 1, opt)]"
            @click="pick(i - 1, opt)"
          >
            {{ isTF ? LONG[opt] : opt }}
          </button>
        </div>
      </li>
    </ol>
  </div>
</template>
