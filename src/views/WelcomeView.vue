<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import { ArrowLeft, Check, LoaderCircle, X } from '@lucide/vue'
import Mascot from '../components/Mascot.vue'
import PinPad from '../components/PinPad.vue'
import Avatar from '../components/Avatar.vue'
import { useAuth } from '../composables/useAuth'
import { api, ApiError } from '../api'

/** focus inputs when a step appears (autofocus only works on page load) */
const vFocus = { mounted: (el: HTMLElement) => el.focus() }

type Screen = 'landing' | 'quick' | 'login-user' | 'login-pin' | 'reg-name' | 'reg-user' | 'reg-pin' | 'reg-confirm'

const router = useRouter()
const route = useRoute()
const { login, register, remembered, forgetDevice } = useAuth()

const screen = ref<Screen>(remembered.value ? 'quick' : 'landing')
const history: Screen[] = []
function go(s: Screen) {
  history.push(screen.value)
  screen.value = s
  error.value = ''
}
function back() {
  screen.value = history.pop() ?? (remembered.value ? 'quick' : 'landing')
  error.value = ''
}

const name = ref('')
const username = ref('')
const firstPin = ref('')
const error = ref('')
const busy = ref(false)
const pad = ref<InstanceType<typeof PinPad>>()

const REG_STEPS: Screen[] = ['reg-name', 'reg-user', 'reg-pin', 'reg-confirm']
const regStep = computed(() => REG_STEPS.indexOf(screen.value))

async function finish(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    router.replace((route.query.next as string) || '/')
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Something went wrong'
    pad.value?.reset(true)
  } finally {
    busy.value = false
  }
}

/* ---------- login ---------- */
function onLoginPin(pin: string) {
  const u = screen.value === 'quick' ? remembered.value!.username : username.value
  finish(() => login(u, pin))
}
function submitLoginUser() {
  if (username.value.length < 3) return
  go('login-pin')
}

/* ---------- register ---------- */
const cleanName = computed(() => name.value.trim().replace(/\s+/g, ' '))
function submitName() {
  if (!cleanName.value) return
  if (!username.value) {
    const base = cleanName.value.toLowerCase().split(' ')[0]!.replace(/[^a-z0-9]/g, '').slice(0, 14)
    if (base.length >= 2) username.value = base + Math.floor(10 + Math.random() * 90)
  }
  go('reg-user')
}

type Avail = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid'
const avail = ref<Avail>('idle')
const checkAvail = useDebounceFn(async (u: string) => {
  try {
    const r = await api<{ available: boolean; valid: boolean }>('GET', `/username-available?u=${encodeURIComponent(u)}`)
    if (u !== username.value) return
    avail.value = !r.valid ? 'invalid' : r.available ? 'ok' : 'taken'
  } catch {
    avail.value = 'idle'
  }
}, 350)

watch(username, (u) => {
  const clean = u.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
  if (clean !== u) {
    username.value = clean
    return
  }
  if (!screen.value.startsWith('reg')) return
  if (clean.length < 3) {
    avail.value = clean ? 'invalid' : 'idle'
    return
  }
  avail.value = 'checking'
  checkAvail(clean)
})
watch(screen, (s) => s === 'reg-user' && username.value && (avail.value = 'checking', checkAvail(username.value)))

function onFirstPin(pin: string) {
  firstPin.value = pin
  go('reg-confirm')
}
async function onConfirmPin(pin: string) {
  if (pin !== firstPin.value) {
    error.value = "PINs don't match. Let's try again."
    await nextTick()
    pad.value?.reset(true)
    setTimeout(() => {
      firstPin.value = ''
      screen.value = 'reg-pin'
    }, 900)
    return
  }
  finish(() => register(cleanName.value, username.value, pin))
}

function switchAccount() {
  forgetDevice()
  username.value = ''
  screen.value = 'landing'
  history.length = 0
}

const bubble = computed(() => {
  switch (screen.value) {
    case 'landing':
      return "Hi! I'm Echo. Let's train your ears for the listening exam."
    case 'quick':
      return `Welcome back, ${remembered.value?.name.split(' ')[0]}! Enter your PIN.`
    case 'login-user':
      return "What's your username?"
    case 'login-pin':
      return `Enter the PIN for @${username.value}`
    case 'reg-name':
      return "What's your name?"
    case 'reg-user':
      return `Nice to meet you, ${cleanName.value.split(' ')[0]}! Pick a username.`
    case 'reg-pin':
      return 'Create a 4-digit PIN. Something easy for you to remember.'
    case 'reg-confirm':
      return 'Type the same PIN once more.'
  }
  return ''
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- top bar -->
    <div class="mx-auto flex h-20 w-full max-w-lg items-center gap-4 px-4">
      <button
        v-if="screen !== 'landing' && !(screen === 'quick' && !history.length)"
        class="rounded-xl p-1 text-mute hover:text-mute-2"
        aria-label="Back"
        @click="back"
      >
        <ArrowLeft :size="28" :stroke-width="3" />
      </button>
      <div v-if="regStep >= 0" class="h-4 flex-1 overflow-hidden rounded-full bg-line">
        <div class="h-full rounded-full bg-leaf transition-all duration-500" :style="{ width: `${((regStep + 1) / REG_STEPS.length) * 100}%` }">
          <div class="mx-2 mt-1 h-1 rounded-full bg-white/30" />
        </div>
      </div>
    </div>

    <main class="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 pb-10">
      <!-- mascot + speech -->
      <div class="flex flex-col items-center text-center">
        <Mascot :size="screen === 'landing' ? 150 : 104" :mood="error ? 'sad' : screen === 'landing' ? 'happy' : 'wow'" :bob="screen === 'landing'" />
        <div class="relative mt-4 rounded-2xl border-2 border-line px-4 py-3 text-lg font-extrabold text-ink-strong">
          <span class="absolute -top-[9px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-line bg-bg" />
          {{ bubble }}
        </div>
      </div>

      <div class="mt-8 flex flex-1 flex-col">
        <!-- LANDING -->
        <template v-if="screen === 'landing'">
          <div class="mt-auto space-y-3">
            <button class="btn-leaf w-full" @click="go('reg-name')">Get started</button>
            <button class="btn-ghost w-full text-wave" @click="go('login-user')">I already have an account</button>
          </div>
        </template>

        <!-- QUICK LOGIN (remembered device) -->
        <template v-else-if="screen === 'quick' && remembered">
          <div class="mb-8 flex items-center justify-center gap-3">
            <Avatar :name="remembered.name" :seed="remembered.username" :size="44" />
            <div class="text-left">
              <p class="font-extrabold text-ink-strong">{{ remembered.name }}</p>
              <p class="text-sm text-mute-2">@{{ remembered.username }}</p>
            </div>
          </div>
          <PinPad ref="pad" :disabled="busy" @complete="onLoginPin" />
          <p class="mt-4 min-h-6 text-center text-cherry">{{ error }}</p>
          <button class="mx-auto mt-auto text-sm font-extrabold text-wave uppercase hover:brightness-110" @click="switchAccount">
            Not you? Switch account
          </button>
        </template>

        <!-- LOGIN: username -->
        <form v-else-if="screen === 'login-user'" class="flex flex-1 flex-col" @submit.prevent="submitLoginUser">
          <input
            v-model="username"
            v-focus
            autocapitalize="none"
            autocomplete="username"
            spellcheck="false"
            placeholder="username"
            class="w-full rounded-2xl border-2 border-line bg-card-2 px-4 py-4 text-lg font-extrabold text-ink-strong outline-none placeholder:text-mute focus:border-wave"
          />
          <button class="btn-leaf mt-auto w-full" :disabled="username.length < 3">Continue</button>
        </form>

        <!-- LOGIN: pin -->
        <template v-else-if="screen === 'login-pin'">
          <PinPad ref="pad" :disabled="busy" @complete="onLoginPin" />
          <p class="mt-4 min-h-6 text-center text-cherry">{{ error }}</p>
        </template>

        <!-- REGISTER: name -->
        <form v-else-if="screen === 'reg-name'" class="flex flex-1 flex-col" @submit.prevent="submitName">
          <input
            v-model="name"
            v-focus
            maxlength="40"
            autocomplete="name"
            placeholder="Your name"
            class="w-full rounded-2xl border-2 border-line bg-card-2 px-4 py-4 text-lg font-extrabold text-ink-strong outline-none placeholder:text-mute focus:border-wave"
          />
          <button class="btn-leaf mt-auto w-full" :disabled="!cleanName">Continue</button>
        </form>

        <!-- REGISTER: username -->
        <form v-else-if="screen === 'reg-user'" class="flex flex-1 flex-col" @submit.prevent="avail === 'ok' && go('reg-pin')">
          <div class="relative">
            <span class="absolute top-1/2 left-4 -translate-y-1/2 text-lg font-extrabold text-mute">@</span>
            <input
              v-model="username"
              autofocus
              autocapitalize="none"
              autocomplete="username"
              spellcheck="false"
              placeholder="username"
              class="w-full rounded-2xl border-2 bg-card-2 py-4 pr-12 pl-10 text-lg font-extrabold text-ink-strong outline-none placeholder:text-mute"
              :class="avail === 'ok' ? 'border-leaf' : avail === 'taken' ? 'border-cherry' : 'border-line focus:border-wave'"
            />
            <span class="absolute top-1/2 right-4 -translate-y-1/2">
              <LoaderCircle v-if="avail === 'checking'" :size="22" class="animate-spin text-mute" />
              <Check v-else-if="avail === 'ok'" :size="24" :stroke-width="3.5" class="text-leaf" />
              <X v-else-if="avail === 'taken'" :size="24" :stroke-width="3.5" class="text-cherry" />
            </span>
          </div>
          <p class="mt-3 text-sm" :class="avail === 'taken' ? 'text-cherry' : avail === 'ok' ? 'text-leaf-dark' : 'text-mute-2'">
            {{
              avail === 'taken'
                ? 'Someone already has this one. Add a number?'
                : avail === 'ok'
                  ? "It's yours!"
                  : 'Letters and numbers only, 3–20 characters.'
            }}
          </p>
          <button class="btn-leaf mt-auto w-full" :disabled="avail !== 'ok'">Continue</button>
        </form>

        <!-- REGISTER: pin + confirm -->
        <template v-else-if="screen === 'reg-pin'">
          <PinPad :key="'first'" ref="pad" color="leaf" @complete="onFirstPin" />
          <p class="mt-4 min-h-6 text-center text-sm text-mute-2">Tip: 4 digits like 6166 or 7177</p>
        </template>
        <template v-else-if="screen === 'reg-confirm'">
          <PinPad :key="'confirm'" ref="pad" color="leaf" :disabled="busy" @complete="onConfirmPin" />
          <p class="mt-4 min-h-6 text-center text-cherry">{{ error }}</p>
        </template>
      </div>
    </main>
  </div>
</template>
