<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { Delete } from '@lucide/vue'

const props = withDefaults(defineProps<{ length?: number; disabled?: boolean; color?: 'wave' | 'leaf' | 'plum' }>(), {
  length: 4,
  disabled: false,
  color: 'wave',
})
const emit = defineEmits<{ complete: [pin: string] }>()

const pin = ref('')
const shaking = ref(false)

function press(d: string) {
  if (props.disabled || pin.value.length >= props.length) return
  pin.value += d
  if (pin.value.length === props.length) {
    const value = pin.value
    // let the last dot fill before handing over
    setTimeout(() => emit('complete', value), 120)
  }
}
function back() {
  if (!props.disabled) pin.value = pin.value.slice(0, -1)
}

/** Clear the dots; with `shake` the pad wobbles to signal a wrong PIN. */
function reset(shake = false) {
  pin.value = ''
  if (shake) {
    shaking.value = true
    setTimeout(() => (shaking.value = false), 450)
  }
}
defineExpose({ reset })

watch(
  () => props.disabled,
  (d) => !d && pin.value.length === props.length && (pin.value = ''),
)

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  const el = e.target as HTMLElement
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
  if (/^[0-9]$/.test(e.key)) press(e.key)
  else if (e.key === 'Backspace') back()
})

const DOT: Record<string, string> = { wave: 'bg-wave border-wave', leaf: 'bg-leaf border-leaf', plum: 'bg-plum border-plum' }
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="flex gap-4" :class="shaking && 'animate-shake'" aria-live="polite" :aria-label="`${pin.length} of ${length} digits`">
      <span
        v-for="i in length"
        :key="i"
        class="size-5 rounded-full border-[3px] transition-all duration-150"
        :class="[i <= pin.length ? `${DOT[color]} scale-110` : 'border-line', shaking && 'border-cherry! bg-cherry!']"
      />
    </div>

    <div class="mt-8 grid grid-cols-3 gap-3">
      <template v-for="k in KEYS" :key="k">
        <span v-if="k === ''" />
        <button
          v-else-if="k === 'back'"
          class="grid h-16 w-20 place-items-center rounded-2xl text-mute-2 transition active:scale-95 disabled:opacity-40"
          :disabled="disabled || !pin.length"
          aria-label="Delete"
          @click="back"
        >
          <Delete :size="28" :stroke-width="2.5" />
        </button>
        <button
          v-else
          class="h-16 w-20 rounded-2xl border-2 border-b-4 border-line bg-card text-2xl font-black text-ink-strong transition-[transform,background-color] select-none hover:bg-card-2 active:translate-y-[2px] active:border-b-2 disabled:opacity-40"
          :disabled="disabled"
          @click="press(k)"
        >
          {{ k }}
        </button>
      </template>
    </div>
  </div>
</template>
