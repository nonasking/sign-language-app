import { useState, useEffect, useRef, useCallback } from 'react'
import { POSES } from '../utils/handPoses'
import { lerpFullBodyPose } from '../utils/poseFormat'
import { tokenize, decomposeText } from '../utils/koreanDecompose'
import dictionary from '../data/ksl_dictionary.json'

const TRANSITION_MS = 120
const PAUSE_BETWEEN_WORDS_MS = 400

const DEFAULT_POSE = POSES.open

function resolveWord(word) {
  if (dictionary[word]) {
    return dictionary[word].sequence.map(({ pose, duration }) => ({
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

function buildSequence(text) {
  const frames = []
  tokenize(text).forEach((word, i, arr) => {
    frames.push(...resolveWord(word))
    if (i < arr.length - 1)
      frames.push({ pose: DEFAULT_POSE, duration: PAUSE_BETWEEN_WORDS_MS, label: '' })
  })
  return frames
}

export function useSignAnimation() {
  const [isPlaying,     setIsPlaying]     = useState(false)
  const [speed,         setSpeed]         = useState(1.0)
  const [currentPose,   setCurrentPose]   = useState(DEFAULT_POSE)
  const [currentLabel,  setCurrentLabel]  = useState('')
  const [progress,      setProgress]      = useState(0)
  const [sequence,      setSequence]      = useState([])

  const rafRef        = useRef(null)
  const frameIdxRef   = useRef(0)
  const frameStartRef = useRef(0)
  const sequenceRef   = useRef([])
  const speedRef      = useRef(1.0)
  const isPlayingRef  = useRef(false)

  speedRef.current    = speed
  isPlayingRef.current = isPlaying
  sequenceRef.current  = sequence

  const totalDuration = sequence.reduce((s, f) => s + f.duration, 0)

  const animate = useCallback(() => {
    const tick = (now) => {
      if (!isPlayingRef.current) return

      const seq = sequenceRef.current
      const idx = frameIdxRef.current

      if (idx >= seq.length) {
        setIsPlaying(false)
        isPlayingRef.current = false
        setProgress(1)
        return
      }

      const frame   = seq[idx]
      const elapsed = (now - frameStartRef.current) * speedRef.current

      if (elapsed >= frame.duration) {
        setCurrentPose(frame.pose)
        setCurrentLabel(frame.label ?? '')

        const done = seq.slice(0, idx + 1).reduce((s, f) => s + f.duration, 0)
        setProgress(Math.min(done / (totalDuration || 1), 1))

        frameIdxRef.current  = idx + 1
        frameStartRef.current = now - (elapsed - frame.duration) / speedRef.current
      } else {
        const t        = Math.min(elapsed / frame.duration, 1)
        const prevPose = idx > 0 ? seq[idx - 1].pose : DEFAULT_POSE
        setCurrentPose(lerpFullBodyPose(prevPose, frame.pose, t))
        setCurrentLabel(frame.label ?? '')

        const done = seq.slice(0, idx).reduce((s, f) => s + f.duration, 0)
        setProgress((done + elapsed) / (totalDuration || 1))
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
    setCurrentPose(DEFAULT_POSE)
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
    if (!sequenceRef.current.length || isPlayingRef.current) return
    frameStartRef.current = performance.now()
    setIsPlaying(true)
    isPlayingRef.current = true
    animate()
  }, [animate])

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setIsPlaying(false)
    isPlayingRef.current = false
  }, [])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return {
    play, pause, resume, stop,
    isPlaying, speed, setSpeed,
    currentPose, currentLabel, progress,
    totalFrames: sequence.length,
  }
}
