// MediaPipe hand landmark indices
// 0:WRIST  1-4:THUMB(CMC,MCP,IP,TIP)  5-8:INDEX(MCP,PIP,DIP,TIP)
// 9-12:MIDDLE  13-16:RING  17-20:PINKY

export const HAND_CONNECTIONS = [
  // Palm
  [0, 1], [0, 5], [0, 17], [5, 9], [9, 13], [13, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20],
]

export const FINGER_COLORS = {
  palm:   '#94a3b8',
  thumb:  '#f87171',
  index:  '#fb923c',
  middle: '#facc15',
  ring:   '#4ade80',
  pinky:  '#60a5fa',
}

export const CONNECTION_FINGER_MAP = [
  // Palm connections → palm color
  'palm', 'palm', 'palm', 'palm', 'palm', 'palm',
  // Thumb
  'thumb', 'thumb', 'thumb',
  // Index
  'index', 'index', 'index',
  // Middle
  'middle', 'middle', 'middle',
  // Ring
  'ring', 'ring', 'ring',
  // Pinky
  'pinky', 'pinky', 'pinky',
]

// Lerp helpers
const lerp = (a, b, t) => a + (b - a) * t
export const lerpPose = (poseA, poseB, t) =>
  poseA.map((a, i) => [
    lerp(a[0], poseB[i][0], t),
    lerp(a[1], poseB[i][1], t),
    lerp(a[2], poseB[i][2], t),
  ])

// ─────────────────────────────────────────────────────────────
// Base poses (coordinate system)
//   Origin: wrist
//   +Y: fingers extend upward
//   +X: pinky side (right of palm when facing viewer)
//   +Z: toward viewer (palm direction)
// ─────────────────────────────────────────────────────────────

// All fingers fully extended, palm facing viewer
export const OPEN = [
  [ 0.00,  0.00,  0.00], // 0  WRIST
  [-0.14,  0.09,  0.02], // 1  THUMB_CMC
  [-0.24,  0.17,  0.06], // 2  THUMB_MCP
  [-0.32,  0.22,  0.06], // 3  THUMB_IP
  [-0.38,  0.26,  0.04], // 4  THUMB_TIP
  [-0.09,  0.28,  0.01], // 5  INDEX_MCP
  [-0.09,  0.45,  0.00], // 6  INDEX_PIP
  [-0.09,  0.57, -0.01], // 7  INDEX_DIP
  [-0.09,  0.66, -0.01], // 8  INDEX_TIP
  [-0.01,  0.30,  0.00], // 9  MIDDLE_MCP
  [-0.01,  0.48,  0.00], // 10 MIDDLE_PIP
  [-0.01,  0.61, -0.01], // 11 MIDDLE_DIP
  [-0.01,  0.71, -0.01], // 12 MIDDLE_TIP
  [ 0.07,  0.28,  0.01], // 13 RING_MCP
  [ 0.07,  0.45,  0.00], // 14 RING_PIP
  [ 0.07,  0.57, -0.01], // 15 RING_DIP
  [ 0.07,  0.66, -0.01], // 16 RING_TIP
  [ 0.15,  0.23,  0.02], // 17 PINKY_MCP
  [ 0.16,  0.36,  0.01], // 18 PINKY_PIP
  [ 0.16,  0.46,  0.00], // 19 PINKY_DIP
  [ 0.16,  0.53,  0.00], // 20 PINKY_TIP
]

// All fingers closed (fist, thumb outside)
export const FIST = [
  [ 0.00,  0.00,  0.00], // 0  WRIST
  [-0.14,  0.09,  0.02], // 1  THUMB_CMC
  [-0.20,  0.17,  0.15], // 2  THUMB_MCP
  [-0.22,  0.24,  0.20], // 3  THUMB_IP
  [-0.18,  0.28,  0.21], // 4  THUMB_TIP
  [-0.09,  0.28,  0.01], // 5  INDEX_MCP
  [-0.06,  0.38,  0.20], // 6  INDEX_PIP
  [-0.02,  0.31,  0.26], // 7  INDEX_DIP
  [ 0.00,  0.24,  0.27], // 8  INDEX_TIP
  [-0.01,  0.30,  0.00], // 9  MIDDLE_MCP
  [ 0.01,  0.40,  0.20], // 10 MIDDLE_PIP
  [ 0.03,  0.33,  0.26], // 11 MIDDLE_DIP
  [ 0.03,  0.26,  0.27], // 12 MIDDLE_TIP
  [ 0.07,  0.28,  0.01], // 13 RING_MCP
  [ 0.09,  0.37,  0.19], // 14 RING_PIP
  [ 0.09,  0.31,  0.25], // 15 RING_DIP
  [ 0.09,  0.25,  0.26], // 16 RING_TIP
  [ 0.15,  0.23,  0.02], // 17 PINKY_MCP
  [ 0.15,  0.31,  0.16], // 18 PINKY_PIP
  [ 0.14,  0.26,  0.21], // 19 PINKY_DIP
  [ 0.13,  0.21,  0.22], // 20 PINKY_TIP
]

// Index only extended (pointing)
export const POINT = [
  ...FIST.slice(0, 5),   // wrist + thumb same as fist
  [-0.09,  0.28,  0.01], // 5  INDEX_MCP
  [-0.09,  0.45,  0.00], // 6  INDEX_PIP
  [-0.09,  0.57, -0.01], // 7  INDEX_DIP
  [-0.09,  0.66, -0.01], // 8  INDEX_TIP
  ...FIST.slice(9),      // middle/ring/pinky closed
]

// Index + middle extended (V / peace / ㄴ-like)
export const PEACE = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.45,  0.00],
  [-0.09,  0.57, -0.01],
  [-0.09,  0.66, -0.01],
  [-0.01,  0.30,  0.00],
  [-0.01,  0.48,  0.00],
  [-0.01,  0.61, -0.01],
  [-0.01,  0.71, -0.01],
  ...FIST.slice(13),     // ring/pinky closed
]

// Index + middle spread wide (scissors / ㅅ)
export const SCISSORS = [
  ...FIST.slice(0, 5),
  [-0.16,  0.27,  0.01],
  [-0.18,  0.44,  0.00],
  [-0.18,  0.56, -0.01],
  [-0.18,  0.64, -0.01],
  [ 0.06,  0.29,  0.00],
  [ 0.08,  0.46,  0.00],
  [ 0.08,  0.58, -0.01],
  [ 0.08,  0.67, -0.01],
  ...FIST.slice(13),
]

// Thumb extended upward, fist (thumbs up)
export const THUMBS_UP = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.18,  0.20,  0.04],
  [-0.18,  0.34,  0.04],
  [-0.18,  0.45,  0.03],
  [-0.09,  0.28,  0.01],
  ...FIST.slice(6, 9),   // index closed
  [-0.01,  0.30,  0.00],
  ...FIST.slice(10, 13), // middle closed
  [ 0.07,  0.28,  0.01],
  ...FIST.slice(14, 17), // ring closed
  [ 0.15,  0.23,  0.02],
  ...FIST.slice(18),     // pinky closed
]

// OK sign (thumb+index circle, others extended)
export const OK_SIGN = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.18,  0.20,  0.10],
  [-0.14,  0.28,  0.14],  // IP
  [-0.10,  0.31,  0.12],  // TIP (meets index tip)
  [-0.09,  0.28,  0.01],
  [-0.10,  0.32,  0.10],  // PIP bends to meet thumb
  [-0.10,  0.30,  0.14],  // DIP
  [-0.10,  0.30,  0.13],  // TIP
  [-0.01,  0.30,  0.00],
  [-0.01,  0.48,  0.00],
  [-0.01,  0.61, -0.01],
  [-0.01,  0.71, -0.01],
  [ 0.07,  0.28,  0.01],
  [ 0.07,  0.45,  0.00],
  [ 0.07,  0.57, -0.01],
  [ 0.07,  0.66, -0.01],
  [ 0.15,  0.23,  0.02],
  [ 0.16,  0.36,  0.01],
  [ 0.16,  0.46,  0.00],
  [ 0.16,  0.53,  0.00],
]

// Index pointing right (for ㅏ vowel)
export const POINT_RIGHT = POINT.map((p, i) => {
  if (i >= 5 && i <= 8) return [p[1] * 0.6, -p[0] * 0.4, p[2]]
  return p
})

// Index pointing left (for ㅓ vowel)
export const POINT_LEFT = POINT.map((p, i) => {
  if (i >= 5 && i <= 8) return [-p[1] * 0.6, -p[0] * 0.4, p[2]]
  return p
})

// Two fingers pointing right (for ㅑ)
export const TWO_RIGHT = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [ 0.10,  0.36,  0.00],
  [ 0.26,  0.42,  0.00],
  [ 0.38,  0.46,  0.00],
  [-0.01,  0.30,  0.00],
  [ 0.16,  0.34,  0.00],
  [ 0.30,  0.37,  0.00],
  [ 0.40,  0.38,  0.00],
  ...FIST.slice(13),
]

// Two fingers pointing left (for ㅕ)
export const TWO_LEFT = TWO_RIGHT.map((p, i) => {
  if (i >= 5 && i <= 12) return [-p[0], p[1], p[2]]
  return p
})

// All 4 fingers + thumb horizontal (ㅡ)
export const FLAT_HORIZONTAL = OPEN.map(p => [p[0], p[2] * 0.5, p[1] * 0.3])

// Index pointing straight up (ㅣ / number 1)
export const INDEX_UP = POINT

// Three fingers extended (index, middle, ring)
export const THREE = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.45,  0.00],
  [-0.09,  0.57, -0.01],
  [-0.09,  0.66, -0.01],
  [-0.01,  0.30,  0.00],
  [-0.01,  0.48,  0.00],
  [-0.01,  0.61, -0.01],
  [-0.01,  0.71, -0.01],
  [ 0.07,  0.28,  0.01],
  [ 0.07,  0.45,  0.00],
  [ 0.07,  0.57, -0.01],
  [ 0.07,  0.66, -0.01],
  ...FIST.slice(17),
]

// Four fingers extended (no thumb)
export const FOUR = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.45,  0.00],
  [-0.09,  0.57, -0.01],
  [-0.09,  0.66, -0.01],
  [-0.01,  0.30,  0.00],
  [-0.01,  0.48,  0.00],
  [-0.01,  0.61, -0.01],
  [-0.01,  0.71, -0.01],
  [ 0.07,  0.28,  0.01],
  [ 0.07,  0.45,  0.00],
  [ 0.07,  0.57, -0.01],
  [ 0.07,  0.66, -0.01],
  [ 0.15,  0.23,  0.02],
  [ 0.16,  0.36,  0.01],
  [ 0.16,  0.46,  0.00],
  [ 0.16,  0.53,  0.00],
]

// Thumb + index + pinky extended (ILY / 사랑해)
export const ILY = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.20,  0.18,  0.05],
  [-0.28,  0.23,  0.05],
  [-0.34,  0.26,  0.04],
  [-0.09,  0.28,  0.01],
  [-0.09,  0.45,  0.00],
  [-0.09,  0.57, -0.01],
  [-0.09,  0.66, -0.01],
  ...FIST.slice(9, 13),
  ...FIST.slice(13, 17),
  [ 0.15,  0.23,  0.02],
  [ 0.16,  0.36,  0.01],
  [ 0.16,  0.46,  0.00],
  [ 0.16,  0.53,  0.00],
]

// Curved index finger hook (ㄱ)
export const HOOK = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.22,  0.17,  0.06],
  [-0.30,  0.22,  0.06],
  [-0.36,  0.25,  0.04],
  [-0.09,  0.28,  0.01],
  [-0.09,  0.42,  0.08],  // PIP bends slightly
  [-0.09,  0.50,  0.16],  // DIP bends more
  [-0.06,  0.52,  0.22],  // TIP curls
  ...FIST.slice(9),
]

// All fingers slightly curved (ball grip / ㅎ)
export const CLAW = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.24,  0.17,  0.06],
  [-0.32,  0.22,  0.08],
  [-0.36,  0.26,  0.10],
  [-0.09,  0.28,  0.01],
  [-0.10,  0.40,  0.08],
  [-0.10,  0.49,  0.14],
  [-0.09,  0.54,  0.18],
  [-0.01,  0.30,  0.00],
  [-0.01,  0.42,  0.08],
  [-0.01,  0.51,  0.14],
  [-0.01,  0.56,  0.18],
  [ 0.07,  0.28,  0.01],
  [ 0.07,  0.40,  0.08],
  [ 0.07,  0.49,  0.14],
  [ 0.07,  0.54,  0.18],
  [ 0.15,  0.23,  0.02],
  [ 0.15,  0.33,  0.06],
  [ 0.15,  0.40,  0.10],
  [ 0.15,  0.45,  0.13],
]

// Index+middle bent at second knuckle (ㄹ-like)
export const BENT_TWO = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.43,  0.00],  // extended to PIP
  [-0.07,  0.50,  0.10],  // DIP bends
  [-0.04,  0.50,  0.17],  // TIP
  [-0.01,  0.30,  0.00],
  [-0.01,  0.45,  0.00],
  [ 0.00,  0.52,  0.10],
  [ 0.02,  0.52,  0.17],
  ...FIST.slice(13),
]

// ─────────────────────────────────────────────────────────────
// Korean Fingerspelling (지문자) poses
// Based on simplified KSL manual alphabet
// ─────────────────────────────────────────────────────────────

// ㄱ – index finger curved like hook
export const JAMO_ㄱ = HOOK

// ㄴ – index finger bent down at tip (L shape)
export const JAMO_ㄴ = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.45,  0.00],
  [ 0.00,  0.48,  0.05],  // DIP bends outward
  [ 0.10,  0.46,  0.05],  // TIP points right
  ...FIST.slice(9),
]

// ㄷ – three fingers pointing out (D shape)
export const JAMO_ㄷ = THREE

// ㄹ – index+middle bent (double hook)
export const JAMO_ㄹ = BENT_TWO

// ㅁ – four fingers curled, tips touching thumb (box shape)
export const JAMO_ㅁ = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.16,  0.17,  0.08],
  [-0.14,  0.25,  0.15],
  [-0.10,  0.30,  0.18],  // thumb tip
  [-0.09,  0.28,  0.01],
  [-0.07,  0.38,  0.12],
  [-0.05,  0.34,  0.18],
  [-0.04,  0.30,  0.19],
  [-0.01,  0.30,  0.00],
  [ 0.00,  0.39,  0.12],
  [ 0.01,  0.35,  0.18],
  [ 0.01,  0.31,  0.19],
  [ 0.07,  0.28,  0.01],
  [ 0.07,  0.37,  0.12],
  [ 0.07,  0.33,  0.18],
  [ 0.07,  0.29,  0.19],
  [ 0.15,  0.23,  0.02],
  [ 0.14,  0.31,  0.10],
  [ 0.13,  0.28,  0.15],
  [ 0.12,  0.25,  0.17],
]

// ㅂ – index+middle extended, V shape
export const JAMO_ㅂ = PEACE

// ㅅ – index+middle spread wide (scissors)
export const JAMO_ㅅ = SCISSORS

// ㅇ – O shape (thumb + index circle)
export const JAMO_ㅇ = OK_SIGN

// ㅈ – index curved, thumb extended (like ㄱ with thumb)
export const JAMO_ㅈ = HOOK

// ㅊ – like ㅈ + thumb touch (similar to OK)
export const JAMO_ㅊ = OK_SIGN

// ㅋ – index bent, thumb extended upward (like ㄱ+thumb)
export const JAMO_ㅋ = [
  [ 0.00,  0.00,  0.00],
  [-0.14,  0.09,  0.02],
  [-0.18,  0.20,  0.04],
  [-0.18,  0.34,  0.04],
  [-0.18,  0.45,  0.03],
  ...HOOK.slice(5, 9),  // curved index
  ...FIST.slice(9),
]

// ㅌ – three fingers, thumb slightly out
export const JAMO_ㅌ = THREE

// ㅍ – index+middle horizontal (like spreading)
export const JAMO_ㅍ = PEACE

// ㅎ – all fingers curved inward (ball grip)
export const JAMO_ㅎ = CLAW

// Vowels
// ㅏ – index pointing right
export const JAMO_ㅏ = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [ 0.10,  0.30,  0.01],
  [ 0.25,  0.28,  0.01],
  [ 0.37,  0.26,  0.01],
  ...FIST.slice(9),
]

// ㅑ – two fingers pointing right
export const JAMO_ㅑ = TWO_RIGHT

// ㅓ – index pointing left
export const JAMO_ㅓ = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.28,  0.30,  0.01],
  [-0.43,  0.28,  0.01],
  [-0.55,  0.26,  0.01],
  ...FIST.slice(9),
]

// ㅕ – two fingers pointing left
export const JAMO_ㅕ = TWO_LEFT

// ㅗ – index pointing up (same as INDEX_UP)
export const JAMO_ㅗ = POINT

// ㅛ – two fingers pointing up
export const JAMO_ㅛ = PEACE

// ㅜ – index pointing down
export const JAMO_ㅜ = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.13,  0.02],
  [-0.09,  0.01,  0.02],
  [-0.09, -0.08,  0.02],
  ...FIST.slice(9),
]

// ㅠ – two fingers pointing down
export const JAMO_ㅠ = [
  ...FIST.slice(0, 5),
  [-0.09,  0.28,  0.01],
  [-0.09,  0.13,  0.02],
  [-0.09,  0.01,  0.02],
  [-0.09, -0.08,  0.02],
  [-0.01,  0.30,  0.00],
  [-0.01,  0.15,  0.01],
  [-0.01,  0.03,  0.02],
  [-0.01, -0.06,  0.02],
  ...FIST.slice(13),
]

// ㅡ – flat hand, palm down (horizontal)
export const JAMO_ㅡ = FLAT_HORIZONTAL

// ㅣ – index pointing straight up
export const JAMO_ㅣ = POINT

// Named pose registry
export const POSES = {
  open: OPEN,
  fist: FIST,
  point: POINT,
  peace: PEACE,
  scissors: SCISSORS,
  thumbs_up: THUMBS_UP,
  ok: OK_SIGN,
  ily: ILY,
  hook: HOOK,
  claw: CLAW,
  bent_two: BENT_TWO,
  three: THREE,
  four: FOUR,
  point_right: JAMO_ㅏ,
  point_left: JAMO_ㅓ,
  two_right: TWO_RIGHT,
  two_left: TWO_LEFT,
  flat: FLAT_HORIZONTAL,
  point_down: JAMO_ㅜ,
  two_down: JAMO_ㅠ,
  // Jamo consonants
  'ㄱ': JAMO_ㄱ, 'ㄴ': JAMO_ㄴ, 'ㄷ': JAMO_ㄷ, 'ㄹ': JAMO_ㄹ,
  'ㅁ': JAMO_ㅁ, 'ㅂ': JAMO_ㅂ, 'ㅅ': JAMO_ㅅ, 'ㅇ': JAMO_ㅇ,
  'ㅈ': JAMO_ㅈ, 'ㅊ': JAMO_ㅊ, 'ㅋ': JAMO_ㅋ, 'ㅌ': JAMO_ㅌ,
  'ㅍ': JAMO_ㅍ, 'ㅎ': JAMO_ㅎ,
  // Jamo vowels
  'ㅏ': JAMO_ㅏ, 'ㅑ': JAMO_ㅑ, 'ㅓ': JAMO_ㅓ, 'ㅕ': JAMO_ㅕ,
  'ㅗ': JAMO_ㅗ, 'ㅛ': JAMO_ㅛ, 'ㅜ': JAMO_ㅜ, 'ㅠ': JAMO_ㅠ,
  'ㅡ': JAMO_ㅡ, 'ㅣ': JAMO_ㅣ,
  // Double consonants / additional
  'ㄲ': JAMO_ㄱ, 'ㄸ': JAMO_ㄷ, 'ㅃ': JAMO_ㅂ,
  'ㅆ': JAMO_ㅅ, 'ㅉ': JAMO_ㅈ,
  // Additional vowels
  'ㅐ': JAMO_ㅏ, 'ㅒ': JAMO_ㅑ, 'ㅔ': JAMO_ㅓ, 'ㅖ': JAMO_ㅕ,
  'ㅘ': JAMO_ㅗ, 'ㅙ': JAMO_ㅗ, 'ㅚ': JAMO_ㅗ,
  'ㅝ': JAMO_ㅜ, 'ㅞ': JAMO_ㅜ, 'ㅟ': JAMO_ㅜ, 'ㅢ': JAMO_ㅡ,
}
