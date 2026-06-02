'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CharacterCard } from './CharacterCard'
import { GenerationProgress } from '../ui/GenerationProgress'
import { useGenerationStatus } from '@/hooks/useGenerationStatus'
import { v4 as uuidv4 } from 'uuid'
import type { AgeRange } from '@/lib/types'

type CharacterData = { name: string; file: File | null }

const AGE_RANGES: { value: AgeRange; label: string; emoji: string }[] = [
  { value: '5-8', label: 'Ages 5–8', emoji: '🌟' },
  { value: '9-12', label: 'Ages 9–12', emoji: '⚡' },
  { value: '13+', label: 'Ages 13+', emoji: '🔥' },
]

const THEMES = [
  { value: 'adventure', label: 'Adventure', emoji: '🗺️' },
  { value: 'mystery', label: 'Mystery', emoji: '🔍' },
  { value: 'history', label: 'History', emoji: '⚔️' },
  { value: 'fantasy', label: 'Fantasy', emoji: '🧙' },
  { value: 'sci-fi', label: 'Sci-Fi', emoji: '🚀' },
  { value: 'friendship', label: 'Friendship', emoji: '🤝' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
]

export function ComicForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('')
  const [theme, setTheme] = useState('')
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [comicId, setComicId] = useState<string | null>(searchParams.get('comicId'))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const generationStatus = useGenerationStatus(comicId)

  // Navigate to comic when complete
  if (generationStatus?.status === 'complete' && comicId) {
    router.push(`/comic/${comicId}`)
  }

  const addCharacter = () => {
    if (characters.length < 4) {
      setCharacters((prev) => [...prev, { name: '', file: null }])
    }
  }

  const updateCharacter = useCallback((index: number, data: CharacterData) => {
    setCharacters((prev) => {
      const next = [...prev]
      next[index] = data
      return next
    })
  }, [])

  const removeCharacter = useCallback((index: number) => {
    setCharacters((prev) => prev.filter((_, i) => i !== index))
  }, [])

  async function uploadCharacterPhoto(
    file: File,
    sessionId: string,
    characterIndex: number
  ): Promise<string> {
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        comicSessionId: sessionId,
        characterIndex,
      }),
    })

    if (!uploadRes.ok) throw new Error('Failed to get upload URL')
    const { signedUrl, path } = await uploadRes.json()

    const putRes = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })

    if (!putRes.ok) throw new Error('Failed to upload photo')
    return path
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ageRange || !theme) return

    setError(null)
    setSubmitting(true)

    try {
      const sessionId = uuidv4()

      // Upload all character photos
      const characterInputs = await Promise.all(
        characters
          .filter((c) => c.name.trim())
          .map(async (c, i) => {
            let photoStoragePath = ''
            if (c.file) {
              photoStoragePath = await uploadCharacterPhoto(c.file, sessionId, i)
            }
            return { name: c.name.trim(), photoStoragePath }
          })
      )

      // Filter out characters without photos if any were uploaded
      const validCharacters = characterInputs.filter((c) =>
        c.photoStoragePath ? true : characters.some((ch) => ch.name === c.name && !ch.file)
      )

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ageRange, theme, characters: validCharacters }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start generation')
      }

      const { comicId: id } = await res.json()
      setComicId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (comicId && generationStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Comic!
          </h2>
          {generationStatus.title && (
            <p className="text-lg font-semibold text-indigo-600 mb-6">
              &ldquo;{generationStatus.title}&rdquo;
            </p>
          )}
          <div className="mt-6">
            <GenerationProgress status={generationStatus} />
          </div>
          {generationStatus.error && (
            <p className="mt-4 text-red-600 text-sm">{generationStatus.error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Age Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Who is this comic for?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {AGE_RANGES.map((ar) => (
            <button
              key={ar.value}
              type="button"
              onClick={() => setAgeRange(ar.value)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                ageRange === ar.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{ar.emoji}</div>
              <div className="text-sm font-medium text-gray-700">{ar.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Pick a theme
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                theme === t.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{t.emoji}</div>
              <div className="text-xs font-medium text-gray-700">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Characters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Characters <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </label>
          {characters.length < 4 && (
            <button
              type="button"
              onClick={addCharacter}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Add character
            </button>
          )}
        </div>

        {characters.length === 0 ? (
          <button
            type="button"
            onClick={addCharacter}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-center"
          >
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm">Add real people as characters (up to 4)</p>
            <p className="text-xs mt-1">Upload a photo and their name</p>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {characters.map((_, i) => (
              <CharacterCard
                key={i}
                index={i}
                onUpdate={updateCharacter}
                onRemove={removeCharacter}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!ageRange || !theme || submitting}
        className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors shadow-lg disabled:shadow-none"
      >
        {submitting ? 'Starting...' : '✨ Create My Comic Book'}
      </button>
    </form>
  )
}
