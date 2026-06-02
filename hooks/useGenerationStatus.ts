'use client'

import { useState, useEffect, useRef } from 'react'
import type { GenerationStatusResponse } from '@/lib/types'

export function useGenerationStatus(comicId: string | null) {
  const [status, setStatus] = useState<GenerationStatusResponse | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!comicId) return

    let stopped = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${comicId}`)
        if (!res.ok) return
        const data: GenerationStatusResponse = await res.json()
        if (!stopped) {
          setStatus(data)
          if (data.status !== 'complete' && data.status !== 'error') {
            timeoutRef.current = setTimeout(poll, 2000)
          }
        }
      } catch {
        if (!stopped) {
          timeoutRef.current = setTimeout(poll, 3000)
        }
      }
    }

    poll()

    return () => {
      stopped = true
      clearTimeout(timeoutRef.current)
    }
  }, [comicId])

  return status
}
