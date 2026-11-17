<script setup lang="ts">
import { TYPE_META, type LessonType } from '../data/lessons'

defineProps<{ type: LessonType }>()

const COLORS: Record<LessonType, string> = {
  tf: 'bg-leaf-tint text-leaf-dark',
  tfng: 'bg-sun-tint text-sun-dark',
  matching: 'bg-plum-tint text-plum-dark',
  mc: 'bg-wave-tint text-wave-dark',
}
</script>

<template>
  <span class="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-extrabold tracking-wide uppercase" :class="COLORS[type]">
    {{ TYPE_META[type].label }}
  </span>
</template>
