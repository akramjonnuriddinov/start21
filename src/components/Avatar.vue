<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; seed?: string; size?: number }>(), { size: 40 })

const COLORS = ['bg-leaf', 'bg-wave', 'bg-plum', 'bg-fox', 'bg-cherry', 'bg-sun']
const color = computed(() => {
  const s = props.seed ?? props.name
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
})
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join(''),
)
</script>

<template>
  <span
    class="grid shrink-0 place-items-center rounded-full font-black text-white"
    :class="color"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.4}px` }"
  >
    {{ initials || '?' }}
  </span>
</template>
