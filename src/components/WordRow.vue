<script setup lang="ts">
import { computed } from 'vue'
import { Check, Volume2 } from '@lucide/vue'
import { posShort, speak, type Word } from '../data/words'
import { setStatus, wordStatus } from '../composables/useWords'

const props = defineProps<{ word: Word; themeLabel?: string }>()
const status = computed(() => wordStatus(props.word.id))

function toggleKnown() {
  setStatus(props.word.id, status.value === 'known' ? 'learning' : 'known')
}
</script>

<template>
  <div class="flex items-start gap-3 px-4 py-3">
    <button
      class="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border-2 border-b-4 border-line text-wave transition hover:bg-wave-tint active:translate-y-[2px] active:border-b-2"
      :aria-label="`Say ${word.term}`"
      @click="speak(word.term)"
    >
      <Volume2 :size="20" :stroke-width="2.5" />
    </button>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-baseline gap-x-2">
        <span class="text-lg font-black text-ink-strong">{{ word.term }}</span>
        <span class="text-xs text-mute-2 italic">{{ posShort(word.partOfSpeech) }}</span>
        <span v-if="status === 'learning'" class="rounded-md bg-sun-tint px-1.5 text-xs text-sun-dark uppercase">learning</span>
        <span v-if="themeLabel" class="text-xs text-mute">· {{ themeLabel }}</span>
      </p>
      <p class="font-extrabold text-plum-dark">{{ word.translationUz }}</p>
      <p class="text-sm font-semibold text-mute-2">{{ word.definitionEn }}</p>
    </div>
    <button
      class="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border-2 border-b-4 transition active:translate-y-[2px] active:border-b-2"
      :class="status === 'known' ? 'border-leaf border-b-leaf-dark bg-leaf text-white' : 'border-line text-line hover:text-mute'"
      :aria-label="status === 'known' ? 'Mark as not learned' : 'Mark as learned'"
      :title="status === 'known' ? 'Learned' : 'Mark as learned'"
      @click="toggleKnown"
    >
      <Check :size="20" :stroke-width="3.5" />
    </button>
  </div>
</template>
