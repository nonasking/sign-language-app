import { useState } from 'react'
import TextInput from './components/TextInput'
import SignAvatar from './components/SignAvatar'
import AnimationPlayer from './components/AnimationPlayer'
import { useSignAnimation } from './hooks/useSignAnimation'

export default function App() {
  const [inputText, setInputText] = useState('')

  const {
    play, pause, resume, stop,
    isPlaying, speed, setSpeed,
    currentPose, currentLabel, progress,
  } = useSignAnimation()

  const handleSubmit = (text) => {
    setInputText(text)
    play(text)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center
                          text-white font-bold text-sm select-none">
            수어
          </div>
          <div>
            <h1 className="text-slate-100 font-semibold text-base leading-none">한국 수어 번역기</h1>
            <p className="text-slate-500 text-xs mt-0.5">Korean Sign Language (KSL)</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-6 gap-6">

        {/* 3D Avatar */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800"
             style={{ aspectRatio: '4/3' }}>
          <SignAvatar pose={currentPose} />

          {/* Idle overlay */}
          {!inputText && (
            <div className="absolute inset-0 flex flex-col items-center justify-center
                            pointer-events-none select-none">
              <p className="text-slate-600 text-sm">아래에 텍스트를 입력하면</p>
              <p className="text-slate-600 text-sm">수어 애니메이션이 재생됩니다</p>
            </div>
          )}

          {/* Corner badge */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-800/80
                          backdrop-blur text-slate-400 text-xs">
            3D · 상반신 아바타
          </div>
        </div>

        {/* Player controls */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4">
          <AnimationPlayer
            isPlaying={isPlaying}
            progress={progress}
            speed={speed}
            currentLabel={currentLabel}
            onPause={pause}
            onResume={resume}
            onReplay={(text) => play(text)}
            onSpeedChange={setSpeed}
            text={inputText}
          />
        </div>

        {/* Text Input */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4">
          <TextInput onSubmit={handleSubmit} isPlaying={isPlaying} />
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 px-5 py-4">
          <p className="text-slate-500 text-xs leading-relaxed">
            <span className="text-slate-400 font-medium">참고</span> —
            이 앱의 수어 포즈 데이터는 MVP 목적의 근사치입니다.
            실제 KSL 교육용으로 사용하려면 전문가 검수가 필요합니다.
            사전에 없는 단어는 자동으로 <span className="text-slate-400">한국 지문자</span>로 변환됩니다.
          </p>
        </div>
      </main>
    </div>
  )
}
