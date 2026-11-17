<script setup lang="ts">
import { computed, ref } from "vue";
import { onClickOutside, useDark, useToggle } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import {
  BookA,
  CloudOff,
  Flame,
  Gem,
  Headphones,
  LogOut,
  Moon,
  NotebookPen,
  Sun,
  Trophy,
} from "@lucide/vue";
import Mascot from "./components/Mascot.vue";
import Avatar from "./components/Avatar.vue";
import { syncError, useStats } from "./composables/useProgress";
import { useAuth } from "./composables/useAuth";

const isDark = useDark();
const toggleDark = useToggle(isDark);
const route = useRoute();
const router = useRouter();
const { streak, totalXp } = useStats();
const { user, logout } = useAuth();

const menuOpen = ref(false);
const menu = ref<HTMLElement>();
onClickOutside(menu, () => (menuOpen.value = false));

// Main sections. Desktop: pills in the header. Phone: bottom tab bar with labels.
const TABS = [
  {
    to: "/",
    label: "Listen",
    icon: Headphones,
    match: (p: string) => p === "/" || p.startsWith("/lesson"),
    on: "border-wave bg-wave-tint text-wave-dark",
    mobile: "text-wave-dark",
    pill: "bg-wave-tint",
  },
  {
    to: "/words",
    label: "Words",
    icon: BookA,
    match: (p: string) => p.startsWith("/words"),
    on: "border-plum bg-plum-tint text-plum-dark",
    mobile: "text-plum-dark",
    pill: "bg-plum-tint",
  },
  {
    to: "/definitions",
    label: "Definitions",
    icon: NotebookPen,
    match: (p: string) => p.startsWith("/definitions"),
    on: "border-fox bg-sun-tint text-fox-dark",
    mobile: "text-fox-dark",
    pill: "bg-sun-tint",
  },
  {
    to: "/group",
    label: "League",
    icon: Trophy,
    match: (p: string) => p.startsWith("/group"),
    on: "border-sun bg-sun-tint text-sun-dark",
    mobile: "text-sun-dark",
    pill: "bg-sun-tint",
  },
];

// Lesson, practice and sign-in screens are full-focus: no navigation.
const showNav = computed(
  () =>
    !!user.value &&
    !["lesson", "welcome", "practice", "def-practice"].includes(
      String(route.name),
    ),
);

async function doLogout() {
  menuOpen.value = false;
  await logout();
  router.replace("/welcome");
}
</script>

<template>
  <div class="min-h-screen">
    <header
      v-if="user && showNav"
      class="sticky top-0 z-30 border-b-2 border-line bg-bg/95 backdrop-blur"
    >
      <div
        class="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4"
      >
        <div class="flex items-center gap-2 lg:gap-3">
          <RouterLink to="/" class="mr-2 flex items-center gap-2">
            <Mascot :size="38" />
            <span class="text-2xl font-black tracking-tight text-wave"
              >echo</span
            >
          </RouterLink>
          <nav class="hidden items-center gap-1 md:flex lg:gap-2">
            <RouterLink
              v-for="t in TABS"
              :key="t.to"
              :to="t.to"
              class="flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold uppercase"
              :class="
                t.match(route.path)
                  ? t.on
                  : 'border-transparent text-mute-2 hover:bg-card-2'
              "
            >
              <component :is="t.icon" :size="18" :stroke-width="2.5" />
              {{ t.label }}
            </RouterLink>
          </nav>
        </div>

        <div class="flex items-center gap-1 sm:gap-3">
          <span
            v-if="syncError"
            class="text-cherry"
            title="Not saved yet. Will retry automatically"
            ><CloudOff :size="20"
          /></span>
          <span
            class="flex items-center gap-1 px-1 text-lg font-extrabold"
            :class="streak ? 'text-fox' : 'text-mute'"
            title="Day streak"
          >
            <Flame :size="22" :fill="streak ? 'currentColor' : 'none'" />
            {{ streak }}
          </span>
          <span
            class="flex items-center gap-1 px-1 text-lg font-extrabold text-wave"
            title="Total XP"
          >
            <Gem :size="20" fill="currentColor" /> {{ totalXp }}
          </span>

          <div ref="menu" class="relative">
            <button
              class="ml-1 rounded-full ring-wave/40 transition hover:ring-4"
              aria-label="Account"
              @click="menuOpen = !menuOpen"
            >
              <Avatar :name="user.name" :seed="user.username" :size="36" />
            </button>
            <div
              v-if="menuOpen"
              class="animate-pop absolute top-12 right-0 w-60 rounded-2xl border-2 border-line bg-card p-2 shadow-xl shadow-black/5"
            >
              <div class="flex items-center gap-3 px-2 py-2">
                <Avatar :name="user.name" :seed="user.username" :size="40" />
                <div class="min-w-0">
                  <p class="truncate font-extrabold text-ink-strong">
                    {{ user.name }}
                  </p>
                  <p class="truncate text-sm text-mute-2">
                    @{{ user.username }}
                  </p>
                </div>
              </div>
              <hr class="my-1 border-t-2 border-line" />
              <button
                class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-mute-2 hover:bg-card-2"
                @click="toggleDark()"
              >
                <Sun v-if="isDark" :size="18" /><Moon v-else :size="18" />
                {{ isDark ? "Light mode" : "Dark mode" }}
              </button>
              <button
                class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-cherry hover:bg-cherry-tint"
                @click="doLogout"
              >
                <LogOut :size="18" /> Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div :class="showNav && 'pb-24 md:pb-0'">
      <RouterView v-slot="{ Component, route: r }">
        <component :is="Component" :key="r.fullPath" />
      </RouterView>
    </div>

    <!-- Phone: bottom tab bar, always with labels -->
    <nav
      v-if="showNav"
      class="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div class="mx-auto grid max-w-md grid-cols-4 px-1">
        <RouterLink
          v-for="t in TABS"
          :key="t.to"
          :to="t.to"
          class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold"
          :class="t.match(route.path) ? t.mobile : 'text-mute-2'"
          :aria-current="t.match(route.path) ? 'page' : undefined"
        >
          <span
            class="grid h-8 w-14 place-items-center rounded-full transition"
            :class="t.match(route.path) && t.pill"
          >
            <component :is="t.icon" :size="22" :stroke-width="2.5" />
          </span>
          {{ t.label }}
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
