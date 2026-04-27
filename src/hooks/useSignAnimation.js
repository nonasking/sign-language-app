import { useState, useEffect, useRef, useCallback } from 'react'
import { POSES, OPEN, lerpPose } from '../utils/handPoses'
import { tokenize, decomposeText } from '../utils/koreanDecompose'
import dictionary from '../data/ksl_dictionary.json'

const TRANSITION_MS = 120  // lerp duration between frames
const PAUSE_BETWEEN_WORDS_MS = 400

// Resolve a word to a flat list of { landmarks, duration } frames
function resolveWord(word) {
  // Exact dictionary match
  if (dictionary[word]) {
    return dictionary[word].sequence.map(({ pose, duration }) => ({
      landmarks: POSES[pose] ?? OPEN,
      duration,
      label: word,
    }))
  }

  // Fallback: decompose into jamo and fingerspell
  const jamo = decomposeText(word)
  return jamo.flatMap(char => {
    const pose = POSES[char]
    if (!pose) return []
    return [{ landmarks: pose, duration: 350, label: char }]
  })
}

// Build full animation sequence from text
function buildSequence(text) {
  const words = tokenize(text)
  const frames = []

  words.forEach((word, i) => {
    const wordFrames = resolveWord(word)
    frames.push(...wordFrames)
    if (i < words.length - 1) {
      frames.push({ landmarks: OPEN, duration: PAUSE_BETWEEN_WORDS_MS, label: '' })
    }
  })

  return frames
}

export function useSignAnimation() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [currentLandmarks, setCurrentLandmarks] = useState(OPEN)
  const [currentLabel, setCurrentLabel] = useState('')
  const [progress, setProgress] = useState(0)   // 0–1 overall
  const [sequence, setSequence] = useState([])

  const rafRef       = useRef(null)
  const frameIdxRef  = useRef(0)
  const frameStartRef = useRef(0)
  const sequenceRef  = useRef([])
  const speedRef     = useRef(1.0)
  const isPlayingRef = useRef(false)

  speedRef.current     = speed
  isPlayingRef.current = isPlaying
  sequenceRef.current  = sequence

  const totalDuration = sequence.reduce((s, f) => s + f.duration, 0)

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setIsPlaying(false)
    isPlayingRef.current = false
  }, [])

  const animate = useCallback(() => {
    const seq = sequenceRef.current
    if (!seq.length) return

    const tick = (now) => {
      if (!isPlayingRef.current) return

      const idx = frameIdxRef.current
      if (idx >= seq.length) {
        setIsPlaying(false)
        isPlayingRef.current = false
        setProgress(1)
        return
      }

      const frame = seq[idx]
      const elapsed = (now - frameStartRef.current) * speedRef.current
      const frameDur = frame.duration

      if (elapsed >= frameDur) {
        // Move to next frame
        setCurrentLandmarks(frame.landmarks)
        setCurrentLabel(frame.label ?? '')

        const elapsed2 = elapsed - frameDur
        const prevDone = seq.slice(0, idx + 1).reduce((s, f) => s + f.duration, 0)
        setProgress(Math.min(prevDone / (totalDuration || 1), 1))

        frameIdxRef.current = idx + 1
        frameStartRef.current = now - elapsed2 / speedRef.current
      } else {
        // Lerp between current and next frame
        const t = Math.min(elapsed / frameDur, 1)
        const prevPose = idx > 0 ? seq[idx - 1].landmarks : OPEN
        const lerped = lerpPose(prevPose, frame.landmarks, t)
        setCurrentLandmarks(lerped)
        setCurrentLabel(frame.label ?? '')

        const prevDone = seq.slice(0, idx).reduce((s, f) => s + f.duration, 0)
        setProgress((prevDone + elapsed) / (totalDuration || 1))
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [totalDuration])

  const play = useCallback((text) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const seq = buildSequence(text)
    setSequence(seq)
    sequenceRef.current = seq

    if (!seq.length) return

    frameIdxRef.current  = 0
    frameStartRef.current = performance.now()
    setProgress(0)
    setCurrentLandmarks(OPEN)
    setIsPlaying(true)
    isPlayingRef.current = true

    animate()
  }, [animate])

  const pause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setIsPlaying(false)
    isPlayingRef.current = false
  }, [])

  const resume = useCallback(() => {
    if (!sequence.length || isPlayingRef.current) return
    frameStartRef.current = performance.now()
    setIsPlaying(true)
    isPlayingRef.current = true
    animate()
  }, [sequence, animate])

  const replay = useCallback((text) => {
    play(text)
  }, [play])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return {
    play,
    pause,
    resume,
    stop,
    replay,
    isPlaying,
    speed,
    setSpeed,
    currentLandmarks,
    currentLabel,
    progress,
    totalFrames: sequence.length,
  }
}
