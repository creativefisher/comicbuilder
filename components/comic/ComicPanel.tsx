'use client'

import type { Panel } from '@/lib/types'

interface Props {
  panel: Panel
  isLarge?: boolean
}

export function ComicPanel({ panel, isLarge }: Props) {
  const topDialogue = panel.dialogue.find((d) => d.position === 'top')
  const bottomDialogue = panel.dialogue.find((d) => d.position === 'bottom')

  return (
    <div
      className={`comic-panel relative border-[3px] border-black bg-white overflow-hidden ${
        isLarge ? 'row-span-2' : ''
      }`}
      style={{ boxShadow: '4px 4px 0 #1a1a1a', aspectRatio: isLarge ? '3/4' : '4/3' }}
    >
      {/* Panel number badge */}
      <div className="absolute top-2 left-2 z-20 bg-black text-white text-xs font-bold px-2 py-0.5 rounded">
        {panel.panel_number}
      </div>

      {/* Panel image */}
      {panel.image_url ? (
        <img
          src={panel.image_url}
          alt={`Panel ${panel.panel_number}: ${panel.scene_description}`}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">🎨</div>
            <p className="text-xs">Drawing panel {panel.panel_number}...</p>
          </div>
        </div>
      )}

      {/* Top speech bubble */}
      {topDialogue && (
        <div className="speech-bubble speech-bubble--top absolute left-1/2 -translate-x-1/2 top-2 z-10 bg-white border-2 border-black rounded-2xl px-3 py-1.5 max-w-[85%] text-center">
          <p className="text-xs font-bold leading-tight" style={{ fontFamily: 'Bangers, cursive', letterSpacing: '0.03em', fontSize: 'clamp(0.65rem, 1.8vw, 0.9rem)' }}>
            <span className="text-gray-500 text-[0.6rem] block">{topDialogue.character}:</span>
            {topDialogue.text}
          </p>
        </div>
      )}

      {/* Bottom speech bubble */}
      {bottomDialogue && (
        <div className="speech-bubble speech-bubble--bottom absolute left-1/2 -translate-x-1/2 bottom-2 z-10 bg-white border-2 border-black rounded-2xl px-3 py-1.5 max-w-[85%] text-center">
          <p className="text-xs font-bold leading-tight" style={{ fontFamily: 'Bangers, cursive', letterSpacing: '0.03em', fontSize: 'clamp(0.65rem, 1.8vw, 0.9rem)' }}>
            <span className="text-gray-500 text-[0.6rem] block">{bottomDialogue.character}:</span>
            {bottomDialogue.text}
          </p>
        </div>
      )}
    </div>
  )
}
