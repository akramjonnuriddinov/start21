<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventListener, useStorage } from '@vueuse/core'
import { Bookmark, GraduationCap, Pause, Repeat, RotateCcw, RotateCw, Turtle, Volume2, X } from '@lucide/vue'
import Waveform from './Waveform.vue'
import { formatTime } from '../data/lessons'

const props = defineProps<{
  src: string
  duration: number
  peaks: number[]
  bookmarks: number[]
  startAt?: number
}>()

const emit = defineEmits<{
  ended: []
  tick: [seconds: number]
  position: [t: number]
  bookmark: [t: number]
}>()

const audio = ref<HTMLAudioElement>()
const playing = ref(false)
const current = ref(0)
const total = ref(props.duration)

const RATES = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5]
const rate = useStorage('listening-lab:rate', 1)
const volume = useStorage('listening-lab:volume', 1)

// A–B loop
const loopA = ref<number | null>(null)
const loopB = ref<number | null>(null)

// Exam mode: no pausing, seeking or speed change. Plays twice, like the real test.
const exam = ref(false)
const examPlay = ref(0)

let raf = 0
let lastT = 0

function frame() {
  const a = audio.value
  if (!a) return
  const t = a.currentTime
  if (playing.value) {
    const d = t - lastT
    if (d > 0 && d < 1) emit('tick', d)
  }
  lastT = t
  current.value = t
  if (loopA.value !== null && loopB.value !== null && t >= loopB.value) {
    a.currentTime = loopA.value
    lastT = loopA.value
  }
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  const a = audio.value!
  a.playbackRate = rate.value
  a.volume = volume.value
  if (props.startAt && props.startAt > 1 && props.startAt < props.duration - 2) {
    a.currentTime = props.startAt
    current.value = props.startAt
  }
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  emit('position', current.value)
})

watch(rate, (r) => audio.value && (audio.value.playbackRate = r))
watch(volume, (v) => audio.value && (audio.value.volume = v))

function onMeta() {
  if (audio.value && Number.isFinite(audio.value.duration)) total.value = audio.value.duration
}
function onEnded() {
  playing.value = false
  emit('ended')
  emit('position', 0)
  if (exam.value) {
    if (examPlay.value < 2) {
      examPlay.value++
      seek(0)
      setTimeout(() => audio.value?.play(), 1500)
    } else {
      exam.value = false
      examPlay.value = 0
    }
  }
}

function toggle() {
  const a = audio.value
  if (!a) return
  if (a.paused) {
    if (exam.value && examPlay.value === 0) examPlay.value = 1
    a.play()
  } else if (!exam.value) {
    a.pause()
    emit('position', a.currentTime)
  }
}

function seek(t: number) {
  const a = audio.value
  if (!a) return
  a.currentTime = Math.max(0, Math.min(total.value, t))
  current.value = a.currentTime
  lastT = a.currentTime
}
function skip(d: number) {
  if (!exam.value) seek(current.value + d)
}

function cycleRate(dir: 1 | -1) {
  const i = RATES.indexOf(rate.value)
  rate.value = RATES[Math.max(0, Math.min(RATES.length - 1, (i === -1 ? 3 : i) + dir))]!
}

function cycleLoop() {
  if (loopA.value === null) loopA.value = current.value
  else if (loopB.value === null) {
    if (current.value > loopA.value + 0.5) loopB.value = current.value
    else loopA.value = null
  } else {
    loopA.value = null
    loopB.value = null
  }
}
const loopLabel = computed(() =>
  loopA.value === null
    ? 'Loop'
    : loopB.value === null
      ? 'Set end'
      : `${formatTime(loopA.value)}–${formatTime(loopB.value)}`,
)

const slow = computed(() => rate.value < 1)
function toggleSlow() {
  rate.value = slow.value ? 1 : 0.75
}

function startExam() {
  loopA.value = loopB.value = null
  rate.value = 1
  seek(0)
  exam.value = true
  examPlay.value = 0
}
function stopExam() {
  audio.value?.pause()
  exam.value = false
  examPlay.value = 0
}

// Scrubbing on the waveform
const bar = ref<HTMLElement>()
const dragging = ref(false)
const hoverT = ref<number | null>(null)

function tFromEvent(e: PointerEvent) {
  const r = bar.value!.getBoundingClientRect()
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total.value
}
function onDown(e: PointerEvent) {
  if (exam.value) return
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  seek(tFromEvent(e))
}
function onMove(e: PointerEvent) {
  hoverT.value = tFromEvent(e)
  if (dragging.value) seek(hoverT.value)
}
function onUp() {
  dragging.value = false
}

const frac = (t: number) => t / (total.value || 1)
const pct = (t: number) => `${frac(t) * 100}%`

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  const el = e.target as HTMLElement
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault()
      toggle()
      break
    case 'ArrowLeft':
    case 'j':
      e.preventDefault()
      skip(-5)
      break
    case 'ArrowRight':
    case 'l':
      e.preventDefault()
      skip(5)
      break
    case '[':
      if (!exam.value) cycleRate(-1)
      break
    case ']':
      if (!exam.value) cycleRate(1)
      break
    case 'r':
      if (!exam.value) cycleLoop()
      break
    case 'b':
      emit('bookmark', current.value)
      break
  }
})

defineExpose({ seek, toggle, current })
</script>

<template>
  <div>
    <audio
      ref="audio"
      :src="src"
      preload="auto"
      @play="playing = true"
      @pause="playing = false"
      @loadedmetadata="onMeta"
      @ended="onEnded"
    />

    <!-- Exam banner -->
    <div
      v-if="exam"
      class="animate-pop mb-5 flex items-center justify-between rounded-2xl bg-cherry-tint px-4 py-3 text-cherry-dark"
    >
      <span class="flex items-center gap-2 font-extrabold">
        <GraduationCap :size="20" />
        Exam mode · {{ examPlay === 0 ? 'press play when ready' : `listening ${examPlay} of 2` }}
      </span>
      <button class="rounded-lg p-1 hover:bg-cherry/10" aria-label="Exit exam mode" @click="stopExam"><X :size="18" /></button>
    </div>

    <div class="flex items-center gap-4 sm:gap-6">
      <!-- Big speaker button -->
      <button
        class="relative grid size-24 shrink-0 place-items-center rounded-3xl border-b-[6px] border-wave-dark bg-wave text-white transition-transform hover:brightness-105 active:translate-y-1 active:border-b-2 disabled:opacity-60 sm:size-28"
        :disabled="exam && playing"
        :aria-label="playing ? 'Pause' : 'Play'"
        @click="toggle"
      >
        <span class="absolute inset-x-4 top-2.5 h-2.5 rounded-full bg-white/25" />
        <Pause v-if="playing" :size="44" fill="currentColor" :stroke-width="0" />
        <Volume2 v-else :size="50" :stroke-width="2.5" />
      </button>
      <!-- Turtle = slow -->
      <button
        class="relative grid size-16 shrink-0 place-items-center rounded-2xl border-b-4 transition-transform active:translate-y-1 active:border-b-0 disabled:opacity-40"
        :class="slow ? 'border-wave-dark bg-wave text-white' : 'border-[var(--node-off-edge)] bg-[var(--node-off)] text-wave'"
        :disabled="exam"
        title="Slow down (0.75×)"
        @click="toggleSlow"
      >
        <Turtle :size="32" :stroke-width="2.5" />
      </button>

      <!-- Waveform -->
      <div class="min-w-0 flex-1">
        <div
          ref="bar"
          class="relative h-16 touch-none select-none"
          :class="exam ? 'cursor-not-allowed' : 'cursor-pointer'"
          role="slider"
          aria-label="Seek"
          :aria-valuenow="Math.round(current)"
          :aria-valuemax="Math.round(total)"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointerleave="hoverT = null"
        >
          <div
            v-if="loopA !== null"
            class="absolute inset-y-0 rounded-lg bg-sun/30"
            :style="{ left: pct(loopA), width: pct(Math.max(0, (loopB ?? current) - loopA)) }"
          />
          <div class="absolute inset-0 text-wave">
            <Waveform :peaks="peaks" :bars="64" :progress="frac(current)" :gap="0.35" />
          </div>
          <div
            v-if="hoverT !== null && !exam && !dragging"
            class="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-lg bg-ink-strong px-1.5 py-0.5 text-xs text-bg"
            :style="{ left: pct(hoverT) }"
          >
            {{ formatTime(hoverT) }}
          </div>
          <button
            v-for="(b, i) in bookmarks"
            :key="i"
            class="absolute -bottom-3 z-10 -translate-x-1/2 text-cherry"
            :style="{ left: pct(b) }"
            :title="`Bookmark ${formatTime(b)}`"
            @pointerdown.stop
            @click.stop="!exam && seek(b)"
          >
            <Bookmark :size="14" fill="currentColor" />
          </button>
        </div>
        <div class="mt-2 flex justify-between text-sm text-mute-2 tabular-nums">
          <span>{{ formatTime(current) }}</span>
          <span>{{ formatTime(total) }}</span>
        </div>
      </div>
    </div>

    <!-- Tools -->
    <div class="mt-6 flex flex-wrap items-center gap-2">
      <button class="chip" :disabled="exam" title="Back 5 seconds (←)" @click="skip(-5)"><RotateCcw :size="16" :stroke-width="3" /> 5s</button>
      <button class="chip" :disabled="exam" title="Forward 5 seconds (→)" @click="skip(5)"><RotateCw :size="16" :stroke-width="3" /> 5s</button>
      <select
        v-model.number="rate"
        :disabled="exam"
        class="chip appearance-none pr-3 outline-none"
        title="Playback speed ([ and ])"
      >
        <option v-for="r in RATES" :key="r" :value="r">{{ r }}× speed</option>
      </select>
      <button
        class="chip"
        :class="loopA !== null && 'border-sun! border-b-sun-dark! bg-sun-tint! text-sun-dark!'"
        :disabled="exam"
        title="Repeat a part: press once for the start, again for the end (R)"
        @click="cycleLoop"
      >
        <Repeat :size="16" :stroke-width="3" /> {{ loopLabel }}
      </button>
      <button class="chip" title="Bookmark this moment (B)" @click="emit('bookmark', current)">
        <Bookmark :size="16" :stroke-width="3" /> Mark
      </button>
      <button v-if="!exam" class="chip" title="Listen twice with no pausing, like the real exam" @click="startExam">
        <GraduationCap :size="16" :stroke-width="3" /> Exam mode
      </button>
    </div>
  </div>
</template>
