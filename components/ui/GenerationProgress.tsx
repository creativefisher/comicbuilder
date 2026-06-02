'use client'

import type { GenerationStatusResponse } from '@/lib/types'

interface Props {
  status: GenerationStatusResponse
}

const STEPS = [
  { key: 'generating_script', label: 'Writing the story...' },
  { key: 'generating_characters', label: 'Drawing characters...' },
  { key: 'generating_panels', label: 'Illustrating panels...' },
  { key: 'complete', label: 'Your comic is ready!' },
]

const STATUS_ORDER = [
  'pending',
  'generating_script',
  'generating_characters',
  'generating_panels',
  'complete',
]

export function GenerationProgress({ status }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(status.status)

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const stepIdx = STATUS_ORDER.indexOf(step.key)
          const isDone = currentIdx > stepIdx
          const isActive = currentIdx === stepIdx
          const isPending = currentIdx < stepIdx

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : isActive
                    ? 'bg-yellow-400 border-yellow-500 text-black animate-pulse'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    isDone ? 'text-green-700' : isActive ? 'text-yellow-700' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                {isActive && step.key === 'generating_characters' && status.progress.charactersTotal > 0 && (
                  <p className="text-sm text-gray-500">
                    {status.progress.charactersComplete} of {status.progress.charactersTotal} characters done
                  </p>
                )}
                {isActive && step.key === 'generating_panels' && status.progress.panelsTotal > 0 && (
                  <p className="text-sm text-gray-500">
                    {status.progress.panelsComplete} of {status.progress.panelsTotal} panels done
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {status.status !== 'complete' && status.status !== 'error' && (
        <p className="mt-6 text-center text-sm text-gray-500">
          This takes 2–4 minutes. Don&apos;t close this tab!
        </p>
      )}
    </div>
  )
}
