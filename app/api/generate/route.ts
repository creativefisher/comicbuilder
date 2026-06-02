import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { runGenerationPipeline } from '@/lib/generation/pipeline'

export const maxDuration = 300

const schema = z.object({
  ageRange: z.enum(['5-8', '9-12', '13+']),
  theme: z.string().min(1).max(50),
  characters: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        photoStoragePath: z.string().min(1),
      })
    )
    .min(0)
    .max(4),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ageRange, theme, characters } = schema.parse(body)

    const supabase = createServerClient()

    // Create comic record
    const { data: comic, error: comicErr } = await supabase
      .from('comics')
      .insert({ age_range: ageRange, theme, status: 'pending' })
      .select()
      .single()

    if (comicErr || !comic) {
      return NextResponse.json({ error: 'Failed to create comic' }, { status: 500 })
    }

    // Create character records
    if (characters.length > 0) {
      const { error: charErr } = await supabase.from('characters').insert(
        characters.map((c) => ({
          comic_id: comic.id,
          name: c.name,
          photo_url: c.photoStoragePath,
        }))
      )
      if (charErr) {
        return NextResponse.json({ error: 'Failed to create characters' }, { status: 500 })
      }
    }

    // Fire pipeline without awaiting (runs in background for duration of serverless function)
    runGenerationPipeline(comic.id).catch((err) => {
      console.error(`Pipeline failed for comic ${comic.id}:`, err)
    })

    return NextResponse.json({ comicId: comic.id }, { status: 202 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
