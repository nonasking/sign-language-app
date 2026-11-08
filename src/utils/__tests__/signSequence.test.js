import { describe, it, expect } from 'vitest'
import { buildSequence, resolveWord, sequenceDuration } from '../signSequence'

describe('resolveWord', () => {
  it('사전에 있는 단어는 등록된 시퀀스로 재생한다', () => {
    const frames = resolveWord('안녕하세요')
    expect(frames.length).toBeGreaterThan(0)
    expect(frames.every(f => f.label === '안녕하세요')).toBe(true)
  })

  it.each(['_comment', 'constructor', 'toString', '__proto__'])(
    '사전의 메타 키나 프로토타입 키(%s)는 단어로 취급하지 않는다',
    (word) => {
      expect(() => resolveWord(word)).not.toThrow()
      expect(resolveWord(word).every(f => f.label !== word)).toBe(true)
    },
  )
})

describe('buildSequence / sequenceDuration', () => {
  it('단어 사이에 쉼 프레임을 넣고 총 길이를 합산한다', () => {
    const seq = buildSequence('안녕하세요 감사합니다')
    const pauses = seq.filter(f => f.label === '')
    expect(pauses).toHaveLength(1)
    expect(sequenceDuration(seq)).toBe(seq.reduce((s, f) => s + f.duration, 0))
    expect(sequenceDuration(seq)).toBeGreaterThan(0)
  })

  it('빈 시퀀스의 총 길이는 0이다', () => {
    expect(sequenceDuration([])).toBe(0)
  })
})
