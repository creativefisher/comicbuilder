import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { GenerationStatusResponse } from '@/lib/types'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid comic ID' }, { status: 400 })
  }

  const supabase = createServerClient()

  const [comicResult, panelsResult, charsResult] = await Promise.all([
    supabase.from('comics').select('status, title, error_message').eq('id', id).single(),
    supabase.from('panels').select('panel_number, image_url').eq('comic_id', id),
    supabase.from('characters').select('id, reference_sheet_url').eq('comic_id', id),
  ])

  if (comicResult.error || !comicResult.data) {
    return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
  }

  const comic = comicResult.data
  const panels = panelsResult.data || []
  const chars = charsResult.data || []

  const response: GenerationStatusResponse = {
    status: comic.status,
    title: comic.title,
    error: comic.error_message,
    progress: {
      charactersComplete: chars.filter((c: { reference_sheet_url: string | null }) => c.reference_sheet_url).length,
      charactersTotal: chars.length,
      panelsComplete: panels.filter((p: { image_url: string | null }) => p.image_url).length,
      panelsTotal: panels.length,
    },
  }

  return NextResponse.json(response)
}
