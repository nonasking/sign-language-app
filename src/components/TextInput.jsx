import { useState } from 'react'

const MAX_LENGTH = 100

export default function TextInput({ onSubmit, isPlaying }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) onSubmit(trimmed)
  }

  const examples = ['안녕하세요', '감사합니다', '사랑해', '나', '좋아요']

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="한국어를 입력하세요..."
          className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700
                     text-slate-100 placeholder-slate-500 text-base
                     focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500
                     transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                     text-white font-semibold text-sm transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPlaying ? '재생 중' : '번역'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => { setText(ex); onSubmit(ex) }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700
                       text-slate-300 text-sm transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <p className="text-slate-600 text-xs">
        {text.length}/{MAX_LENGTH} · 사전에 없는 단어는 지문자(자모)로 표현됩니다
      </p>
    </div>
  )
}
