<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import { Crown, Gem, Trophy } from '@lucide/vue'
import Avatar from '../components/Avatar.vue'
import Mascot from '../components/Mascot.vue'
import { LESSONS } from '../data/lessons'
import { api } from '../api'

interface Row {
  name: string
  username: string
  totalXp: number
  weekXp: number
  done: number
  accuracy: number | null
  me: boolean
}

const rows = ref<Row[]>([])
const loading = ref(true)
const failed = ref(false)
const period = ref<'week' | 'all'>('week')

onMounted(async () => {
  try {
    rows.value = await api<Row[]>('GET', '/leaderboard')
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

const sorted = computed(() => {
  const key = period.value === 'week' ? 'weekXp' : 'totalXp'
  return [...rows.value].sort((a, b) => b[key] - a[key] || b.done - a.done)
})
const xpOf = (r: Row) => (period.value === 'week' ? r.weekXp : r.totalXp)

const MEDAL = ['bg-sun text-white', 'bg-[#b8c2d6] text-white', 'bg-[#e0915a] text-white']

const { copy, copied } = useClipboard()
const appUrl = location.origin
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="flex flex-col items-center text-center">
      <span class="grid size-20 place-items-center rounded-3xl border-b-[6px] border-sun-dark bg-sun">
        <Trophy :size="40" class="text-white" fill="currentColor" />
      </span>
      <h1 class="mt-4 text-3xl font-black text-ink-strong">Group league</h1>
      <p class="mt-1 text-mute-2">Everyone in your group, ranked by XP.</p>
    </div>

    <div class="mx-auto mt-6 flex w-fit rounded-2xl border-2 border-line p-1">
      <button
        v-for="p in (['week', 'all'] as const)"
        :key="p"
        class="rounded-xl px-5 py-2 text-sm font-extrabold uppercase transition"
        :class="period === p ? 'bg-wave-tint text-wave-dark' : 'text-mute-2 hover:text-ink'"
        @click="period = p"
      >
        {{ p === 'week' ? 'This week' : 'All time' }}
      </button>
    </div>

    <div v-if="loading" class="mt-10 space-y-3">
      <div v-for="i in 4" :key="i" class="h-[72px] animate-pulse rounded-2xl bg-card-2" />
    </div>

    <p v-else-if="failed" class="mt-10 text-center text-cherry">Couldn't load the league. Try again in a moment.</p>

    <ol v-else class="mt-8 space-y-2">
      <li
        v-for="(r, i) in sorted"
        :key="r.username"
        class="flex items-center gap-3 rounded-2xl border-2 px-3 py-3 sm:gap-4 sm:px-4"
        :class="r.me ? 'border-wave bg-wave-tint' : 'border-transparent hover:bg-card-2'"
      >
        <span
          class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-black"
          :class="i < 3 && xpOf(r) > 0 ? MEDAL[i] : 'text-mute-2'"
        >
          <Crown v-if="i === 0 && xpOf(r) > 0" :size="16" fill="currentColor" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <Avatar :name="r.name" :seed="r.username" :size="44" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-extrabold text-ink-strong">
            {{ r.name }} <span v-if="r.me" class="text-sm text-wave">(you)</span>
          </p>
          <p class="truncate text-sm text-mute-2">
            @{{ r.username }} · {{ r.done }}/{{ LESSONS.length }} lessons<template v-if="r.accuracy !== null">
              · {{ Math.round(r.accuracy * 100) }}%</template
            >
          </p>
        </div>
        <span class="flex shrink-0 items-center gap-1 font-black text-ink-strong tabular-nums">
          <Gem :size="18" class="text-wave" fill="currentColor" /> {{ xpOf(r) }}
        </span>
      </li>
    </ol>

    <div class="panel mt-10 flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
      <Mascot :size="72" mood="wow" />
      <div class="flex-1">
        <p class="font-extrabold text-ink-strong">Invite your group</p>
        <p class="text-sm text-mute-2">Send them the link. Signing up takes 20 seconds.</p>
      </div>
      <button class="btn-wave shrink-0" @click="copy(appUrl)">{{ copied ? 'Copied!' : 'Copy link' }}</button>
    </div>
  </div>
</template>
