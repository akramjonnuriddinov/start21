<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Renders a recording's real loudness profile as bars.
 * `progress` (0–1) paints the played part in the foreground colour, and the
 * clip rect is the only thing that changes during playback.
 */
const props = withDefaults(
  defineProps<{
    peaks: number[]
    bars?: number
    progress?: number
    /** gap between bars as a fraction of slot width */
    gap?: number
    mirror?: boolean
  }>(),
  { bars: 120, progress: 0, gap: 0.4, mirror: true },
)

const id = useId()

const samples = computed(() => {
  const src = props.peaks.length ? props.peaks : Array(props.bars).fill(8)
  const n = props.bars
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * src.length) / n)
    const b = Math.max(a + 1, Math.floor(((i + 1) * src.length) / n))
    let m = 0
    for (let j = a; j < b; j++) m = Math.max(m, src[j] ?? 0)
    out.push(m)
  }
  return out
})

const W = computed(() => props.bars * 10)

const path = computed(() => {
  const bw = 10 * (1 - props.gap)
  return samples.value
    .map((p, i) => {
      const h = Math.max(4, (p / 100) * 100)
      const y = props.mirror ? 50 - h / 2 : 100 - h
      return `M${i * 10 + (10 - bw) / 2} ${y.toFixed(1)}h${bw.toFixed(2)}v${h.toFixed(1)}h-${bw.toFixed(2)}z`
    })
    .join('')
})
</script>

<template>
  <svg :viewBox="`0 0 ${W} 100`" preserveAspectRatio="none" class="block h-full w-full" aria-hidden="true">
    <defs>
      <clipPath :id="`${id}-played`">
        <rect x="0" y="0" :width="W * Math.min(1, Math.max(0, progress))" height="100" />
      </clipPath>
    </defs>
    <path :d="path" class="fill-current opacity-30" />
    <path :d="path" class="fill-current" :clip-path="`url(#${id}-played)`" />
  </svg>
</template>
