'use client'

import { ComicPanel } from './ComicPanel'
import { DownloadButton } from './DownloadButton'
import type { Comic, Panel } from '@/lib/types'

interface Props {
  comic: Comic
  panels: Panel[]
}

function getGridClass(count: number): string {
  if (count <= 4) return 'grid-cols-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-3'
}

export function ComicViewer({ comic, panels }: Props) {
  const sortedPanels = [...panels].sort((a, b) => a.panel_number - b.panel_number)

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <a href="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← Create another
        </a>
        <DownloadButton title={comic.title || 'My Comic'} />
      </div>

      {/* Comic page */}
      <div
        className={`comic-page p-4 sm:p-6 rounded-2xl border-4 border-black`}
        style={{
          background: '#f5f0e8',
          fontFamily: 'Bangers, cursive',
        }}
      >
        {/* Title */}
        <div
          className="text-center py-4 mb-2 border-b-4 border-black"
        >
          <h1
            className="font-black uppercase tracking-widest"
            style={{
              fontFamily: 'Bangers, cursive',
              fontSize: 'clamp(2rem, 7vw, 4rem)',
              color: '#1a1a1a',
              textShadow: '3px 3px 0 #e63946',
              letterSpacing: '0.12em',
            }}
          >
            {comic.title || 'My Comic Book'}
          </h1>
          <p className="text-sm text-gray-600 font-sans mt-1 capitalize">
            A {comic.theme} story for ages {comic.age_range}
          </p>
        </div>

        {/* Panel grid */}
        <div
          className={`grid ${getGridClass(sortedPanels.length)} gap-2 sm:gap-3 mt-4`}
        >
          {sortedPanels.map((panel, i) => (
            <ComicPanel
              key={panel.id}
              panel={panel}
              isLarge={i === 0 && sortedPanels.length >= 7}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-4 pt-3 border-t-2 border-gray-300">
          <p className="text-xs text-gray-400 font-sans">
            Created with ComicBuilder ✨
          </p>
        </div>
      </div>
    </div>
  )
}
