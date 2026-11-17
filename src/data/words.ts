import { Bitcoin, Dog, Earth, HeartHandshake, Mountain, Shirt, Sun, UtensilsCrossed } from '@lucide/vue'
import raw from './words.json'

export interface Word {
  id: string
  term: string
  partOfSpeech: string
  translationUz: string
  definitionEn: string
  theme: string
}

/** Full class strings so Tailwind can see them. */
export interface ThemeStyle {
  icon: typeof Dog
  text: string
  bg: string
  tint: string
  border: string
  bar: string
  btn: string
}

export interface Theme extends ThemeStyle {
  id: string
  title: string
  short: string
  words: Word[]
}

const STYLE: Record<string, ThemeStyle & { short: string }> = {
  'beautiful-natural-places': {
    short: 'Natural places',
    icon: Mountain,
    text: 'text-leaf-dark',
    bg: 'bg-leaf',
    tint: 'bg-leaf-tint',
    border: 'border-leaf',
    bar: 'bg-leaf',
    btn: 'btn-leaf',
  },
  'japanese-kimono': {
    short: 'Japanese kimono',
    icon: Shirt,
    text: 'text-cherry-dark',
    bg: 'bg-cherry',
    tint: 'bg-cherry-tint',
    border: 'border-cherry',
    bar: 'bg-cherry',
    btn: 'btn-cherry',
  },
  'interesting-dining-manners': {
    short: 'Dining manners',
    icon: UtensilsCrossed,
    text: 'text-sun-dark',
    bg: 'bg-sun',
    tint: 'bg-sun-tint',
    border: 'border-sun',
    bar: 'bg-sun',
    btn: 'btn-wave',
  },
  'dogs-our-loyal-friends': {
    short: 'Dogs',
    icon: Dog,
    text: 'text-wave-dark',
    bg: 'bg-wave',
    tint: 'bg-wave-tint',
    border: 'border-wave',
    bar: 'bg-wave',
    btn: 'btn-wave',
  },
  'world-natural-wonders': {
    short: 'Natural wonders',
    icon: Earth,
    text: 'text-plum-dark',
    bg: 'bg-plum',
    tint: 'bg-plum-tint',
    border: 'border-plum',
    bar: 'bg-plum',
    btn: 'btn-plum',
  },
  'traditional-marriage-customs': {
    short: 'Marriage customs',
    icon: HeartHandshake,
    text: 'text-fox-dark',
    bg: 'bg-fox',
    tint: 'bg-sun-tint',
    border: 'border-fox',
    bar: 'bg-fox',
    btn: 'btn-cherry',
  },
  'summer-solstice': {
    short: 'Summer solstice',
    icon: Sun,
    text: 'text-rose-dark',
    bg: 'bg-rose',
    tint: 'bg-rose-tint',
    border: 'border-rose',
    bar: 'bg-rose',
    btn: 'btn-cherry',
  },
  bitcoin: {
    short: 'Bitcoin',
    icon: Bitcoin,
    text: 'text-teal-dark',
    bg: 'bg-teal',
    tint: 'bg-teal-tint',
    border: 'border-teal',
    bar: 'bg-teal',
    btn: 'btn-leaf',
  },
}

const FALLBACK = STYLE['dogs-our-loyal-friends']!

export const THEMES: Theme[] = raw.themes.map((t) => {
  const style = STYLE[t.id] ?? { ...FALLBACK, short: t.title }
  return {
    ...style,
    id: t.id,
    title: t.title,
    words: t.words.map((w) => ({ ...w, theme: t.id })),
  }
})

export const ALL_WORDS: Word[] = THEMES.flatMap((t) => t.words)

export const findTheme = (id: string) => THEMES.find((t) => t.id === id)

/** "noun/verb" → "n / v" style short labels */
const POS: Record<string, string> = {
  noun: 'n',
  verb: 'v',
  adjective: 'adj',
  adverb: 'adv',
  phrase: 'phr',
  preposition: 'prep',
}
export function posShort(pos: string) {
  return pos
    .split('/')
    .map((p) => p.trim().split(' ').map((x) => POS[x] ?? x).join(' '))
    .join(' / ')
}

/** Uses the browser's built-in English voice. */
export function speak(text: string, rate = 0.9) {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  const voice = speechSynthesis.getVoices().find((v) => v.lang === 'en-US' && v.localService) ??
    speechSynthesis.getVoices().find((v) => v.lang.startsWith('en'))
  if (voice) u.voice = voice
  speechSynthesis.speak(u)
}

export function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j]!, r[i]!]
  }
  return r
}
