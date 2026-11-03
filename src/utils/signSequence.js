import { POSES } from './handPoses'
import { tokenize, decomposeText } from './koreanDecompose'
import dictionary from '../data/ksl_dictionary.json'

const PAUSE_BETWEEN_WORDS_MS = 400

export const DEFAULT_POSE = POSES.open

/** 사전에 등록된 단어인지. `_comment`나 `constructor` 같은 키에 걸리지 않도록 자기 속성만 본다. */
function dictionaryEntry(word) {
  if (!Object.hasOwn(dictionary, word)) return null
  const entry = dictionary[word]
  return entry && Array.isArray(entry.sequence) ? entry : null
}

export function resolveWord(word) {
  const entry = dictionaryEntry(word)
  if (entry) {
    return entry.sequence.map(({ pose, duration }) => ({
      pose: POSES[pose] ?? DEFAULT_POSE,
      duration,
      label: word,
    }))
  }

  // 미등록 단어 → 지문자 폴백
  return decomposeText(word).flatMap(char => {
    const p = POSES[char]
    if (!p) return []
    return [{ pose: p, duration: 350, label: char }]
  })
}

export function buildSequence(text) {
  const frames = []
  tokenize(text).forEach((word, i, arr) => {
    frames.push(...resolveWord(word))
    if (i < arr.length - 1)
      frames.push({ pose: DEFAULT_POSE, duration: PAUSE_BETWEEN_WORDS_MS, label: '' })
  })
  return frames
}

export function sequenceDuration(seq) {
  return seq.reduce((s, f) => s + f.duration, 0)
}
