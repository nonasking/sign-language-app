// Decomposes Korean syllables into individual jamo (자모)
// Uses Unicode block arithmetic

const HANGUL_START = 0xAC00
const HANGUL_END   = 0xD7A3

const INITIALS  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const VOWELS    = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const FINALS    = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function decomposeSyllable(char) {
  const code = char.charCodeAt(0)
  if (code < HANGUL_START || code > HANGUL_END) return [char]

  const offset = code - HANGUL_START
  const finalIdx  = offset % 28
  const vowelIdx  = Math.floor(offset / 28) % 21
  const initialIdx = Math.floor(offset / 28 / 21)

  const result = [INITIALS[initialIdx], VOWELS[vowelIdx]]
  if (finalIdx > 0) result.push(FINALS[finalIdx])
  return result
}

// Returns array of jamo strings
export function decomposeText(text) {
  return text.split('').flatMap(char => {
    const code = char.charCodeAt(0)
    if (code >= HANGUL_START && code <= HANGUL_END) return decomposeSyllable(char)
    // Already a jamo or non-Korean char
    return [char]
  })
}

// Splits text into words, preserving spaces as tokens
export function tokenize(text) {
  return text.trim().split(/\s+/).filter(Boolean)
}
