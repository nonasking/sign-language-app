import { describe, it, expect } from 'vitest'
import { POSES, HAND_CONNECTIONS, CONNECTION_FINGER_MAP, FINGER_COLORS } from '../handPoses'
import { decomposeText } from '../koreanDecompose'
import dictionary from '../../data/ksl_dictionary.json'

const HANGUL_START = 0xAC00
const HANGUL_END = 0xD7A3

// 완성형 음절 전체를 분해해 실제로 등장할 수 있는 자모 집합을 만든다.
function allJamoFromSyllables() {
  const set = new Set()
  for (let code = HANGUL_START; code <= HANGUL_END; code++) {
    for (const jamo of decomposeText(String.fromCharCode(code))) set.add(jamo)
  }
  return set
}

// 겹받침 — 두 자음이 합쳐진 종성. 단일 지문자가 존재하지 않아 POSES 에 없다.
const CLUSTER_FINALS = ['ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ']

const JAMO = allJamoFromSyllables()
const SIMPLE_JAMO = [...JAMO].filter(j => !CLUSTER_FINALS.includes(j))

const BODY_JOINTS = [
  'head', 'leftShoulder', 'rightShoulder',
  'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist',
]

const isVec3 = (v) =>
  Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n))

describe('POSES — 지문자 커버리지', () => {
  it('분해로 만들어지는 고유 자모는 51개다 (자음 19 + 모음 21 + 겹받침 11)', () => {
    expect(JAMO.size).toBe(51)
    expect(SIMPLE_JAMO).toHaveLength(40)
  })

  it('겹받침을 제외한 모든 자모에 포즈가 등록되어 있다', () => {
    const missing = SIMPLE_JAMO.filter(j => !POSES[j])
    expect(missing).toEqual([])
  })

  it('자음 14개 + 쌍자음 5개에 포즈가 있다', () => {
    const consonants = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
    const doubles = ['ㄲ','ㄸ','ㅃ','ㅆ','ㅉ']
    for (const c of [...consonants, ...doubles]) expect(POSES[c], c).toBeTruthy()
  })

  it('모음 21개에 포즈가 있다', () => {
    const vowels = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
    expect(vowels).toHaveLength(21)
    for (const v of vowels) expect(POSES[v], v).toBeTruthy()
  })

  it('겹받침은 아직 포즈가 없다 (알려진 한계 — 지문자 폴백에서 스킵됨)', () => {
    for (const f of CLUSTER_FINALS) expect(POSES[f]).toBeUndefined()
  })
})

describe('POSES — 데이터 형식', () => {
  it('모든 포즈가 FullBodyPose 형식을 만족한다', () => {
    for (const [name, p] of Object.entries(POSES)) {
      expect(p, name).toBeTypeOf('object')
      expect(p.face, name).toBeNull()

      for (const joint of BODY_JOINTS) {
        expect(isVec3(p.pose?.[joint]), `${name}.pose.${joint}`).toBe(true)
      }
      expect(Object.keys(p.pose).sort(), name).toEqual([...BODY_JOINTS].sort())

      for (const side of ['rightHand', 'leftHand']) {
        const hand = p[side]
        expect(Array.isArray(hand), `${name}.${side}`).toBe(true)
        expect(hand, `${name}.${side}`).toHaveLength(21)
        hand.forEach((pt, i) => {
          expect(isVec3(pt), `${name}.${side}[${i}]`).toBe(true)
        })
      }
    }
  })

  it('모든 손 포즈의 0번 랜드마크는 손목 원점이다', () => {
    for (const [name, p] of Object.entries(POSES)) {
      // 미러 포즈에서 -0 이 생길 수 있어 절댓값으로 비교한다.
      expect(p.rightHand[0].map(Math.abs), `${name}.rightHand`).toEqual([0, 0, 0])
      expect(p.leftHand[0].map(Math.abs), `${name}.leftHand`).toEqual([0, 0, 0])
    }
  })
})

describe('랜드마크 연결 메타데이터', () => {
  it('HAND_CONNECTIONS 와 CONNECTION_FINGER_MAP 의 길이가 같다', () => {
    expect(CONNECTION_FINGER_MAP).toHaveLength(HAND_CONNECTIONS.length)
  })

  it('모든 연결 인덱스가 0~20 범위 안이다', () => {
    for (const [a, b] of HAND_CONNECTIONS) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(20)
    }
  })

  it('CONNECTION_FINGER_MAP 의 값이 모두 FINGER_COLORS 키다', () => {
    for (const key of CONNECTION_FINGER_MAP) expect(FINGER_COLORS[key], key).toBeTruthy()
  })
})

describe('ksl_dictionary.json', () => {
  const entries = Object.entries(dictionary).filter(([k]) => !k.startsWith('_'))

  it('사전 항목이 존재한다 (데모 규모의 소규모 셋)', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it('모든 사전 시퀀스의 pose 이름이 POSES 에 존재한다', () => {
    const unknown = []
    for (const [word, entry] of entries) {
      expect(Array.isArray(entry.sequence), word).toBe(true)
      for (const frame of entry.sequence) {
        if (!POSES[frame.pose]) unknown.push(`${word}:${frame.pose}`)
        expect(frame.duration, `${word}.duration`).toBeGreaterThan(0)
      }
    }
    expect(unknown).toEqual([])
  })
})
