export default function AnimationPlayer({
  isPlaying,
  progress,
  speed,
  currentLabel,
  onPause,
  onResume,
  onReplay,
  onSpeedChange,
  text,
}) {
  const speedOptions = [0.5, 0.75, 1.0, 1.5, 2.0]

  return (
    <div className="flex flex-col gap-3">
      {/* Current label */}
      <div className="h-8 flex items-center justify-center">
        {currentLabel ? (
          <span className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40
                           text-brand-300 text-sm font-medium tracking-wide">
            {currentLabel}
          </span>
        ) : (
          <span className="text-slate-600 text-sm">—</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-75"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onResume}
            className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95
                       flex items-center justify-center text-white transition-all"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1"/>
                <rect x="9" y="2" width="4" height="12" rx="1"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
              </svg>
            )}
          </button>

          {/* Replay */}
          <button
            onClick={() => text && onReplay(text)}
            disabled={!text}
            className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 active:scale-95
                       flex items-center justify-center text-slate-300 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2.5 8A5.5 5.5 0 1 1 5 3.5" strokeLinecap="round"/>
              <path d="M2 1.5L5 3.5L3 6.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">속도</span>
          <div className="flex gap-1">
            {speedOptions.map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  speed === s
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
