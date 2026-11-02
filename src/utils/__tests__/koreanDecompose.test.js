import { describe, it, expect } from 'vitest'
import { decomposeText, tokenize } from '../koreanDecompose'

describe('decomposeText — 기본 음절', () => {
  it('초성 + 중성 음절을 자모 2개로 분해한다', () => {
    expect(decomposeText('가')).toEqual(['ㄱ', 'ㅏ'])
    expect(decomposeText('노')).toEqual(['ㄴ', 'ㅗ'])
  })

  it('받침이 있으면 자모 3개로 분해한다', () => {
    expect(decomposeText('한')).toEqual(['ㅎ', 'ㅏ', 'ㄴ'])
    expect(decomposeText('글')).toEqual(['ㄱ', 'ㅡ', 'ㄹ'])
  })

  it('여러 음절을 순서대로 이어붙인다', () => {
    expect(decomposeText('한글')).toEqual(['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ'])
    expect(decomposeText('안녕')).toEqual(['ㅇ', 'ㅏ', 'ㄴ', 'ㄴ', 'ㅕ', 'ㅇ'])
  })

  it('한글 블록의 경계 음절(가 / 힣)을 처리한다', () => {
    expect(decomposeText('가')).toEqual(['ㄱ', 'ㅏ'])
    expect(decomposeText('힣')).toEqual(['ㅎ', 'ㅣ', 'ㅎ'])
  })
})

describe('decomposeText — 쌍자음', () => {
  it('초성 쌍자음 ㄲㄸㅃㅆㅉ 을 그대로 보존한다', () => {
    expect(decomposeText('까')).toEqual(['ㄲ', 'ㅏ'])
    expect(decomposeText('따')).toEqual(['ㄸ', 'ㅏ'])
    expect(decomposeText('빠')).toEqual(['ㅃ', 'ㅏ'])
    expect(decomposeText('싸')).toEqual(['ㅆ', 'ㅏ'])
    expect(decomposeText('짜')).toEqual(['ㅉ', 'ㅏ'])
  })

  it('종성 쌍자음(ㄲ, ㅆ)도 분해한다', () => {
    expect(decomposeText('밖')).toEqual(['ㅂ', 'ㅏ', 'ㄲ'])
    expect(decomposeText('있')).toEqual(['ㅇ', 'ㅣ', 'ㅆ'])
  })
})

describe('decomposeText — 복합 모음', () => {
  it('ㅘㅙㅚㅝㅞㅟㅢ 를 단일 자모로 유지한다', () => {
    expect(decomposeText('과')).toEqual(['ㄱ', 'ㅘ'])
    expect(decomposeText('괘')).toEqual(['ㄱ', 'ㅙ'])
    expect(decomposeText('괴')).toEqual(['ㄱ', 'ㅚ'])
    expect(decomposeText('궈')).toEqual(['ㄱ', 'ㅝ'])
    expect(decomposeText('궤')).toEqual(['ㄱ', 'ㅞ'])
    expect(decomposeText('귀')).toEqual(['ㄱ', 'ㅟ'])
    expect(decomposeText('의')).toEqual(['ㅇ', 'ㅢ'])
  })

  it('복합 모음 + 받침 조합도 분해한다', () => {
    expect(decomposeText('왕')).toEqual(['ㅇ', 'ㅘ', 'ㅇ'])
  })
})

describe('decomposeText — 겹받침', () => {
  it('겹받침은 분리하지 않고 하나의 종성 문자로 반환한다', () => {
    // 유니코드 종성 그대로 유지된다. (POSES 에는 겹받침 항목이 없어
    // 지문자 폴백에서 스킵된다 — README 의 알려진 한계 참고)
    expect(decomposeText('닭')).toEqual(['ㄷ', 'ㅏ', 'ㄺ'])
    expect(decomposeText('값')).toEqual(['ㄱ', 'ㅏ', 'ㅄ'])
    expect(decomposeText('앉')).toEqual(['ㅇ', 'ㅏ', 'ㄵ'])
  })
})

describe('decomposeText — 비한글 패스스루', () => {
  it('이미 자모인 문자는 그대로 통과시킨다', () => {
    expect(decomposeText('ㄱㅏ')).toEqual(['ㄱ', 'ㅏ'])
  })

  it('영문/숫자/공백/기호는 문자 단위로 그대로 통과시킨다', () => {
    expect(decomposeText('AB 12!')).toEqual(['A', 'B', ' ', '1', '2', '!'])
  })

  it('한글과 비한글이 섞여도 처리한다', () => {
    expect(decomposeText('a가1')).toEqual(['a', 'ㄱ', 'ㅏ', '1'])
  })

  it('빈 문자열은 빈 배열이 된다', () => {
    expect(decomposeText('')).toEqual([])
  })
})

describe('tokenize', () => {
  it('공백 기준으로 단어를 나눈다', () => {
    expect(tokenize('안녕 하세요')).toEqual(['안녕', '하세요'])
  })

  it('연속 공백과 앞뒤 공백을 무시한다', () => {
    expect(tokenize('  나는   학교 ')).toEqual(['나는', '학교'])
  })

  it('빈 입력은 빈 배열이 된다', () => {
    expect(tokenize('   ')).toEqual([])
  })
})
