import { createServerClient } from '@/lib/supabase/server'
import { ComicViewer } from '@/components/comic/ComicViewer'
import { notFound, redirect } from 'next/navigation'
import type { Comic, Panel } from '@/lib/types'

interface Props {
  params: { id: string }
}

export default async function ComicPage({ params }: Props) {
  const { id } = params

  const supabase = createServerClient()

  const [comicResult, panelsResult] = await Promise.all([
    supabase.from('comics').select('*').eq('id', id).single(),
    supabase.from('panels').select('*').eq('comic_id', id).order('panel_number'),
  ])

  if (comicResult.error || !comicResult.data) {
    notFound()
  }

  const comic = comicResult.data as Comic

  // Still generating — redirect to home with comicId so polling can resume
  if (comic.status !== 'complete' && comic.status !== 'error') {
    redirect(`/?comicId=${id}`)
  }

  if (comic.status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😢</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Generation failed</h1>
          <p className="text-gray-600 mb-4">{comic.error_message || 'Something went wrong.'}</p>
          <a href="/" className="text-indigo-600 hover:underline">← Try again</a>
        </div>
      </main>
    )
  }

  const panels = (panelsResult.data || []) as Panel[]

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ComicViewer comic={comic} panels={panels} />
      </div>
    </main>
  )
}
