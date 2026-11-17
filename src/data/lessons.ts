import peaks from './peaks.json'

export type LessonType = 'tf' | 'tfng' | 'matching' | 'mc'

export interface Lesson {
  id: string
  number: number
  type: LessonType
  src: string
  /** seconds */
  duration: number
  /** 360 loudness samples, 0–100 */
  peaks: number[]
}

export interface TypeMeta {
  label: string
  short: string
  /** short code printed like on an exam paper */
  code: string
  defaultQuestions: number
  defaultOptions: number
  /** whether the number of answer options can be changed */
  configurableOptions: boolean
  itemLabel: string
  tip: string
}

export const TYPE_META: Record<LessonType, TypeMeta> = {
  tf: {
    label: 'True / False',
    short: 'True / False',
    code: 'TF',
    defaultQuestions: 6,
    defaultOptions: 2,
    configurableOptions: false,
    itemLabel: 'Statement',
    tip: 'Read each statement before you listen. Listen for synonyms and paraphrases: the speaker rarely uses the exact words from the statement.',
  },
  tfng: {
    label: 'True / False / Not given',
    short: 'T / F / Not given',
    code: 'TFNG',
    defaultQuestions: 6,
    defaultOptions: 3,
    configurableOptions: false,
    itemLabel: 'Statement',
    tip: '"False" means the audio says the opposite. "Not Given" means the audio doesn\'t mention it at all. Don\'t guess from general knowledge.',
  },
  matching: {
    label: 'Matching speakers',
    short: 'Matching',
    code: 'MATCH',
    defaultQuestions: 4,
    defaultOptions: 6,
    configurableOptions: true,
    itemLabel: 'Speaker',
    tip: 'There are more options than speakers, so some letters are extra. Each speaker matches one option. Listen for each speaker\'s main idea, not single keywords.',
  },
  mc: {
    label: 'Multiple choice',
    short: 'Multi-choice',
    code: 'MCQ',
    defaultQuestions: 5,
    defaultOptions: 3,
    configurableOptions: true,
    itemLabel: 'Question',
    tip: 'Underline the key words in the question and options. Wrong options are often mentioned in the audio too. Wait for the full answer before choosing.',
  },
}

export function optionsFor(type: LessonType, optionCount: number): string[] {
  if (type === 'tf') return ['T', 'F']
  if (type === 'tfng') return ['T', 'F', 'NG']
  return Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i))
}

const raw: [number, LessonType, number][] = [
  [1, 'tf', 150.75],
  [2, 'matching', 217.18],
  [3, 'mc', 129.59],
  [4, 'tf', 145.04],
  [5, 'matching', 200.4],
  [6, 'mc', 88.37],
  [7, 'tf', 80.89],
  [8, 'mc', 208.93],
  [9, 'matching', 215.26],
  [10, 'tf', 141.18],
  [11, 'mc', 131.23],
  [12, 'matching', 219.01],
  [14, 'tfng', 103.79],
  [15, 'mc', 228.25],
  [16, 'matching', 232.9],
  [17, 'tf', 133.02],
  [18, 'mc', 188.58],
  [19, 'matching', 195.03],
  [20, 'tf', 131.16],
  [21, 'mc', 142.22],
]

export const LESSONS: Lesson[] = raw.map(([number, type, duration]) => {
  const nn = String(number).padStart(2, '0')
  return {
    id: `lesson-${nn}`,
    number,
    type,
    duration,
    src: `${import.meta.env.BASE_URL}audio/lesson-${nn}.mp3`,
    peaks: (peaks as Record<string, number[]>)[`lesson-${nn}`] ?? [],
  }
})

export function findLesson(id: string) {
  return LESSONS.find((l) => l.id === id)
}

export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export interface Unit {
  number: number
  title: string
  subtitle: string
  /** tailwind classes: banner, node face, node edge (shadow colour) */
  banner: string
  node: string
  edge: string
  ring: string
  text: string
  tint: string
  border: string
  lessons: Lesson[]
}

const UNIT_DEFS = [
  { title: 'First steps', subtitle: 'Get used to the speakers', banner: 'bg-leaf border-leaf-dark', node: 'bg-leaf', edge: '#16a070', ring: 'border-leaf/30', text: 'text-leaf', tint: 'bg-leaf-tint', border: 'border-leaf' },
  { title: 'Tune in', subtitle: 'Follow longer conversations', banner: 'bg-plum border-plum-dark', node: 'bg-plum', edge: '#7a4ee0', ring: 'border-plum/30', text: 'text-plum', tint: 'bg-plum-tint', border: 'border-plum' },
  { title: 'Catch the details', subtitle: 'Numbers, names and opinions', banner: 'bg-wave border-wave-dark', node: 'bg-wave', edge: '#3a5fe0', ring: 'border-wave/30', text: 'text-wave', tint: 'bg-wave-tint', border: 'border-wave' },
  { title: 'Exam ready', subtitle: 'Full-speed, real-test style', banner: 'bg-fox border-fox-dark', node: 'bg-fox', edge: '#dd6222', ring: 'border-fox/30', text: 'text-fox', tint: 'bg-sun-tint', border: 'border-fox' },
]

export const UNITS: Unit[] = UNIT_DEFS.map((u, i) => ({
  number: i + 1,
  ...u,
  lessons: LESSONS.slice(i * 5, i * 5 + 5),
}))
