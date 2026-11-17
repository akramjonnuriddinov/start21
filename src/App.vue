<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside, useDark, useToggle } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { BookA, CloudOff, Flame, Gem, House, LogOut, Moon, Sun, Trophy } from '@lucide/vue'
import Mascot from './components/Mascot.vue'
import Avatar from './components/Avatar.vue'
import { syncError, useStats } from './composables/useProgress'
import { useAuth } from './composables/useAuth'

const isDark = useDark()
const toggleDark = useToggle(isDark)
const route = useRoute()
const router = useRouter()
const { streak, totalXp } = useStats()
const { user, logout } = useAuth()

const menuOpen = ref(false)
const menu = ref<HTMLElement>()
onClickOutside(menu, () => (menuOpen.value = false))

async function doLogout() {
  menuOpen.value = false
  await logout()
  router.replace('/welcome')
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Lesson and sign-in screens are full-focus. No top nav. -->
    <header v-if="user && !['lesson', 'welcome', 'practice'].includes(String(route.name))" class="sticky top-0 z-30 border-b-2 border-line bg-bg/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <div class="flex items-center gap-1 sm:gap-4">
          <RouterLink to="/" class="mr-2 flex items-center gap-2">
            <Mascot :size="38" />
            <span class="hidden text-2xl font-black tracking-tight text-wave sm:inline">echo</span>
          </RouterLink>
          <RouterLink
            to="/"
            class="flex items-center gap-1.5 rounded-xl border-2 border-transparent px-3 py-1.5 text-sm font-extrabold text-mute-2 uppercase hover:bg-card-2"
            exact-active-class="border-wave! bg-wave-tint text-wave-dark!"
          >
            <House :size="18" :stroke-width="2.5" /> <span class="hidden sm:inline">Learn</span>
          </RouterLink>
          <RouterLink
            to="/words"
            class="flex items-center gap-1.5 rounded-xl border-2 border-transparent px-3 py-1.5 text-sm font-extrabold text-mute-2 uppercase hover:bg-card-2"
            active-class="border-plum! bg-plum-tint text-plum-dark!"
          >
            <BookA :size="18" :stroke-width="2.5" /> <span class="hidden sm:inline">Words</span>
          </RouterLink>
          <RouterLink
            to="/group"
            class="flex items-center gap-1.5 rounded-xl border-2 border-transparent px-3 py-1.5 text-sm font-extrabold text-mute-2 uppercase hover:bg-card-2"
            active-class="border-sun! bg-sun-tint text-sun-dark!"
          >
            <Trophy :size="18" :stroke-width="2.5" /> <span class="hidden sm:inline">League</span>
          </RouterLink>
        </div>

        <div class="flex items-center gap-1 sm:gap-3">
          <span v-if="syncError" class="text-cherry" title="Not saved yet. Will retry automatically"><CloudOff :size="20" /></span>
          <span class="flex items-center gap-1 px-1 text-lg font-extrabold" :class="streak ? 'text-fox' : 'text-mute'" title="Day streak">
            <Flame :size="22" :fill="streak ? 'currentColor' : 'none'" /> {{ streak }}
          </span>
          <span class="flex items-center gap-1 px-1 text-lg font-extrabold text-wave" title="Total XP">
            <Gem :size="20" fill="currentColor" /> {{ totalXp }}
          </span>

          <div ref="menu" class="relative">
            <button class="ml-1 rounded-full ring-wave/40 transition hover:ring-4" aria-label="Account" @click="menuOpen = !menuOpen">
              <Avatar :name="user.name" :seed="user.username" :size="36" />
            </button>
            <div v-if="menuOpen" class="animate-pop absolute top-12 right-0 w-60 rounded-2xl border-2 border-line bg-card p-2 shadow-xl shadow-black/5">
              <div class="flex items-center gap-3 px-2 py-2">
                <Avatar :name="user.name" :seed="user.username" :size="40" />
                <div class="min-w-0">
                  <p class="truncate font-extrabold text-ink-strong">{{ user.name }}</p>
                  <p class="truncate text-sm text-mute-2">@{{ user.username }}</p>
                </div>
              </div>
              <hr class="my-1 border-t-2 border-line" />
              <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-mute-2 hover:bg-card-2" @click="toggleDark()">
                <Sun v-if="isDark" :size="18" /><Moon v-else :size="18" /> {{ isDark ? 'Light mode' : 'Dark mode' }}
              </button>
              <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-cherry hover:bg-cherry-tint" @click="doLogout">
                <LogOut :size="18" /> Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
    <RouterView v-slot="{ Component, route: r }">
      <component :is="Component" :key="r.fullPath" />
    </RouterView>
  </div>
</template>
