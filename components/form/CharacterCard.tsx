'use client'

import { useRef, useState } from 'react'

interface Props {
  index: number
  onUpdate: (index: number, data: { name: string; file: File | null }) => void
  onRemove: (index: number) => void
}

export function CharacterCard({ index, onUpdate, onRemove }: Props) {
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
    onUpdate(index, { name, file: f })
  }

  function handleNameChange(val: string) {
    setName(val)
    onUpdate(index, { name: val, file })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  return (
    <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 bg-white hover:border-indigo-400 transition-colors">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 w-6 h-6 bg-gray-200 hover:bg-red-200 rounded-full text-gray-600 hover:text-red-600 text-xs flex items-center justify-center transition-colors"
      >
        ✕
      </button>

      <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
        Character {index + 1}
      </p>

      {/* Photo upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="w-full h-36 bg-gray-50 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden border border-gray-200 hover:bg-gray-100 transition-colors mb-3"
      >
        {preview ? (
          <img src={preview} alt="Character preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-3xl mb-1">📷</div>
            <p className="text-xs">Upload photo</p>
            <p className="text-xs text-gray-300">or drag & drop</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {/* Name input */}
      <input
        type="text"
        placeholder="Character name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        maxLength={50}
      />
    </div>
  )
}
