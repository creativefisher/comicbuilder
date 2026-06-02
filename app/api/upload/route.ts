import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\//),
  comicSessionId: z.string().uuid(),
  characterIndex: z.number().int().min(0).max(3),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename, contentType, comicSessionId, characterIndex } = schema.parse(body)

    const ext = filename.split('.').pop() || 'jpg'
    const path = `${comicSessionId}/${characterIndex}/${uuidv4()}.${ext}`

    const supabase = createServerClient()
    const { data, error } = await supabase.storage
      .from('comic-uploads')
      .createSignedUploadUrl(path)

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path, token: data.token })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
