<script setup lang="ts">
import { computed } from 'vue'
import { Check, Clock, Ear, Flame, Gem, ListChecks, Play, Star, Target, Trophy, Users, Zap } from '@lucide/vue'
import Mascot from '../components/Mascot.vue'
import Waveform from '../components/Waveform.vue'
import { LESSONS, TYPE_META, UNITS, formatTime, type Lesson, type LessonType } from '../data/lessons'
import { DAILY_GOAL, bestScore, statusOf, useStats } from '../composables/useProgress'

const { done, avgScore, minutesListened, streak, lastActive, store, totalXp, todayXp } = useStats()

const TYPE_ICON: Record<LessonType, typeof Check> = { tf: Check, tfng: Ear, matching: Users, mc: ListChecks }

/** 0 = not done, 1 = done, 2 = 70%+, 3 = perfect */
function stars(l: Lesson) {
  const p = store.value[l.id]
  if (statusOf(p) !== 'done') return 0
  const best = bestScore(p) ?? 0
  return best >= 1 ? 3 : best >= 0.7 ? 2 : 1
}
const isNext = (l: Lesson) => lastActive.value?.id === l.id
const unitDone = (lessons: Lesson[]) => lessons.filter((l) => statusOf(store.value[l.id]) === 'done').length

const nextUnit = computed(() => UNITS.find((u) => u.lessons.some((l) => l.id === lastActive.value?.id)) ?? UNITS[0]!)
const goalPct = computed(() => Math.min(100, (todayXp.value / DAILY_GOAL) * 100))
const pad = (n: number) => String(n).padStart(2, '0')
</script>
<template>
  <div class="mx-auto grid max-w-5xl gap-8 px-4 py-6 lg:grid-cols-[1fr_330px] lg:gap-12">
    <!-- Sidebar -->
    <aside class="space-y-5 lg:order-last lg:sticky lg:top-24 lg:self-start">
      <div class="panel p-5">
        <div class="flex items-center gap-3">
          <Zap :size="30" class="text-sun" fill="currentColor" />
          <div class="flex-1">
            <p class="text-lg font-extrabold text-ink-strong">Daily goal</p>
            <p class="text-sm text-mute-2">Earn {{ DAILY_GOAL }} XP today</p>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <div class="relative h-4 flex-1 overflow-hidden rounded-full bg-line">
            <div class="h-full rounded-full bg-sun transition-all duration-500" :style="{ width: `${goalPct}%` }">
              <div class="mx-2 mt-1 h-1 rounded-full bg-white/40" />
            </div>
          </div>
          <span class="text-sm text-mute-2 tabular-nums">{{ todayXp }}/{{ DAILY_GOAL }}</span>
        </div>
      </div>

      <div class="panel p-5">
        <p class="mb-4 text-lg font-extrabold text-ink-strong">Statistics</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center gap-2.5 rounded-2xl border-2 border-line p-3">
            <Flame :size="24" class="text-fox" :fill="streak ? 'currentColor' : 'none'" />
            <div>
              <p class="text-lg leading-tight font-extrabold text-ink-strong">{{ streak }}</p>
              <p class="text-xs text-mute-2">Day streak</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 rounded-2xl border-2 border-line p-3">
            <Gem :size="22" class="text-wave" fill="currentColor" />
            <div>
              <p class="text-lg leading-tight font-extrabold text-ink-strong">{{ totalXp }}</p>
              <p class="text-xs text-mute-2">Total XP</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 rounded-2xl border-2 border-line p-3">
            <Trophy :size="22" class="text-sun" fill="currentColor" />
            <div>
              <p class="text-lg leading-tight font-extrabold text-ink-strong">{{ done }}/{{ LESSONS.length }}</p>
              <p class="text-xs text-mute-2">Lessons</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 rounded-2xl border-2 border-line p-3">
            <Target :size="22" class="text-cherry" />
            <div>
              <p class="text-lg leading-tight font-extrabold text-ink-strong">
                {{ avgScore === null ? '–' : `${Math.round(avgScore * 100)}%` }}
              </p>
              <p class="text-xs text-mute-2">Accuracy</p>
            </div>
          </div>
          <div class="col-span-2 flex items-center gap-2.5 rounded-2xl border-2 border-line p-3">
            <Clock :size="22" class="text-plum" />
            <p class="text-sm text-mute-2">
              <span class="text-lg font-extrabold text-ink-strong">{{ minutesListened }} min</span> of listening
            </p>
          </div>
        </div>
      </div>

      <div class="panel hidden items-center gap-3 p-4 lg:flex">
        <Mascot :size="64" mood="wow" />
        <p class="text-sm text-mute-2">
          Tip: tap the <span class="text-wave">turtle</span> to slow the audio down when a part is hard to catch.
        </p>
      </div>
    </aside>

    <!-- Lesson board -->
    <section class="space-y-10 pb-16">
      <!-- Up next -->
      <RouterLink
        v-if="lastActive"
        :to="`/lesson/${lastActive.id}`"
        class="group relative flex items-center gap-4 overflow-hidden rounded-3xl border-b-[6px] p-5 text-white transition-transform active:translate-y-1 active:border-b-2 sm:gap-6 sm:p-6"
        :class="nextUnit.banner"
      >
        <div class="pointer-events-none absolute -top-10 -right-6 size-44 rounded-full bg-white/10" />
        <div class="pointer-events-none absolute right-24 -bottom-16 size-32 rounded-full bg-white/10" />
        <Mascot :size="92" class="relative shrink-0" mood="wow" />
        <div class="relative min-w-0 flex-1">
          <p class="text-sm font-extrabold tracking-wide uppercase opacity-85">
            {{ statusOf(store[lastActive.id]) === 'started' ? 'Pick up where you left off' : 'Up next' }}
          </p>
          <p class="text-2xl font-black sm:text-3xl">Lesson {{ pad(lastActive.number) }}</p>
          <p class="font-bold opacity-90">{{ TYPE_META[lastActive.type].label }} · {{ formatTime(lastActive.duration) }}</p>
        </div>
        <span
          class="relative grid size-16 shrink-0 place-items-center rounded-2xl border-b-4 border-black/15 bg-white transition-transform group-hover:scale-105"
          :class="nextUnit.text"
        >
          <Play :size="30" fill="currentColor" class="ml-1" />
        </span>
      </RouterLink>

      <div v-for="unit in UNITS" :key="unit.number">
        <!-- Unit header -->
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <span class="inline-block rounded-lg px-2 py-0.5 text-xs font-black tracking-wider text-white uppercase" :class="unit.node">
              Unit {{ unit.number }}
            </span>
            <h2 class="mt-1.5 text-2xl font-black text-ink-strong">{{ unit.title }}</h2>
            <p class="text-sm text-mute-2">{{ unit.subtitle }}</p>
          </div>
          <div class="w-28 shrink-0 text-right">
            <p class="text-sm font-extrabold text-mute-2">{{ unitDone(unit.lessons) }}/{{ unit.lessons.length }} done</p>
            <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-line">
              <div class="h-full rounded-full transition-all" :class="unit.node" :style="{ width: `${(unitDone(unit.lessons) / unit.lessons.length) * 100}%` }" />
            </div>
          </div>
        </div>

        <!-- Cards -->
        <div class="grid gap-3 sm:grid-cols-2">
          <RouterLink
            v-for="lesson in unit.lessons"
            :key="lesson.id"
            :to="`/lesson/${lesson.id}`"
            class="group relative flex items-center gap-4 rounded-2xl border-2 border-b-[5px] bg-card p-3.5 transition-[transform,background-color] hover:bg-card-2 active:translate-y-[3px] active:border-b-2"
            :class="isNext(lesson) ? unit.border : 'border-line'"
          >
            <span
              v-if="isNext(lesson)"
              class="absolute -top-2.5 right-4 rounded-md px-2 py-0.5 text-[11px] font-black tracking-wider text-white uppercase"
              :class="unit.node"
            >
              Up next
            </span>

            <!-- number tile -->
            <span
              class="relative grid size-14 shrink-0 place-items-center rounded-xl text-xl font-black"
              :class="stars(lesson) ? `${unit.node} text-white` : `${unit.tint} ${unit.text}`"
              :style="stars(lesson) ? { boxShadow: `0 4px 0 ${unit.edge}` } : {}"
            >
              {{ pad(lesson.number) }}
            </span>

            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1.5 font-extrabold text-ink-strong">
                <component :is="TYPE_ICON[lesson.type]" :size="16" :stroke-width="3" :class="unit.text" />
                <span class="truncate">{{ TYPE_META[lesson.type].short }}</span>
              </span>
              <span class="mt-1.5 flex items-center gap-2.5">
                <span class="h-5 min-w-0 flex-1" :class="unit.text">
                  <Waveform :peaks="lesson.peaks" :bars="34" :progress="stars(lesson) ? 1 : 0" :gap="0.45" />
                </span>
                <span class="shrink-0 text-xs text-mute-2 tabular-nums">{{ formatTime(lesson.duration) }}</span>
              </span>
            </span>

            <!-- stars -->
            <span class="flex shrink-0 flex-col items-center gap-0.5 pl-1">
              <span class="flex">
                <Star
                  v-for="n in 3"
                  :key="n"
                  :size="16"
                  :stroke-width="2.5"
                  :class="n <= stars(lesson) ? 'text-sun' : 'text-line'"
                  :fill="n <= stars(lesson) ? 'currentColor' : 'none'"
                />
              </span>
              <span v-if="stars(lesson)" class="text-xs font-extrabold text-mute-2">
                {{ Math.round((bestScore(store[lesson.id]) ?? 0) * 100) }}%
              </span>
              <span v-else-if="statusOf(store[lesson.id]) === 'started'" class="text-[11px] font-extrabold text-wave uppercase">Started</span>
              <span v-else class="text-[11px] font-extrabold text-mute uppercase">New</span>
            </span>
          </RouterLink>
        </div>
      </div>

      <div class="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line p-5">
        <Trophy :size="44" class="shrink-0 text-sun" fill="currentColor" />
        <div>
          <p class="text-lg font-extrabold text-ink-strong">Collect all {{ LESSONS.length * 3 }} stars</p>
          <p class="text-sm text-mute-2">Score 100% on a lesson to earn all three.</p>
        </div>
      </div>
    </section>
  </div>
</template>
