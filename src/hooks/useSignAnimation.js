import { useState, useEffect, useRef, useCallback } from 'react'
import { lerpFullBodyPose } from '../utils/poseFormat'
import { DEFAULT_POSE, buildSequence, sequenceDuration } from '../utils/signSequence'

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

  // 일시정지 시점까지 현재 프레임에서 흐른 시간(배속 반영). 재개할 때 이어서 보간한다.
  const pausedElapsedRef = useRef(0)

  const animate = useCallback(() => {
    const tick = (now) => {
      if (!isPlayingRef.current) return

      const seq = sequenceRef.current
      const idx = frameIdxRef.current
      // 렌더 시점의 값을 클로저로 잡으면 play() 직후에는 이전 문장의 길이(처음엔 0)가
      // 쓰여 진행 바가 엉뚱하게 움직인다. 지금 재생 중인 시퀀스에서 직접 계산한다.
      const totalDuration = sequenceDuration(seq)

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
  }, [])

  const play = useCallback((text) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const seq = buildSequence(text)
    setSequence(seq)
    sequenceRef.current = seq
    if (!seq.length) return

    frameIdxRef.current  = 0
    frameStartRef.current = performance.now()
    pausedElapsedRef.current = 0
    setProgress(0)
    setCurrentPose(DEFAULT_POSE)
    setIsPlaying(true)
    isPlayingRef.current = true

    animate()
  }, [animate])

  const pause = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (isPlayingRef.current) {
      pausedElapsedRef.current = (performance.now() - frameStartRef.current) * speedRef.current
    }
    setIsPlaying(false)
    isPlayingRef.current = false
  }, [])

  const resume = useCallback(() => {
    if (!sequenceRef.current.length || isPlayingRef.current) return
    if (frameIdxRef.current >= sequenceRef.current.length) {
      // 끝까지 재생한 뒤 재생 버튼을 누르면 처음부터 다시 재생한다.
      frameIdxRef.current = 0
      pausedElapsedRef.current = 0
      setProgress(0)
      setCurrentPose(DEFAULT_POSE)
    }
    // 멈췄던 프레임의 보간을 처음부터가 아니라 멈춘 지점부터 이어 간다.
    frameStartRef.current = performance.now() - pausedElapsedRef.current / speedRef.current
    pausedElapsedRef.current = 0
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
