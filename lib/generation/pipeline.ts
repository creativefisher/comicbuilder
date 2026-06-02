import { createServerClient } from '../supabase/server'
import { generateComicScript, extractVisualDescription } from '../claude/scriptGenerator'
import { generateCharacterSheet } from '../openai/characterSheet'
import { generatePanelImage } from '../openai/panelImage'
import type { AgeRange } from '../types'

export async function runGenerationPipeline(comicId: string): Promise<void> {
  const supabase = createServerClient()

  try {
    // Fetch comic and characters
    const { data: comic, error: comicErr } = await supabase
      .from('comics')
      .select('*')
      .eq('id', comicId)
      .single()

    if (comicErr || !comic) throw new Error('Comic not found')

    const { data: characters } = await supabase
      .from('characters')
      .select('*')
      .eq('comic_id', comicId)
      .order('created_at')

    // Step 1: Generate story script
    await supabase.from('comics').update({ status: 'generating_script' }).eq('id', comicId)

    const characterNames = (characters || []).map((c: { name: string }) => c.name)
    const script = await generateComicScript(comic.age_range as AgeRange, comic.theme, characterNames)

    // Store title and insert panel stubs
    await supabase.from('comics').update({ title: script.title }).eq('id', comicId)

    for (const panel of script.panels) {
      await supabase.from('panels').upsert({
        comic_id: comicId,
        panel_number: panel.panelNumber,
        scene_description: panel.sceneDescription,
        dialogue: panel.dialogue,
        character_actions: panel.characterActions,
        panel_characters: panel.characters,
      })
    }

    // Step 2: Generate character reference sheets (parallel)
    await supabase.from('comics').update({ status: 'generating_characters' }).eq('id', comicId)

    const characterRefs: Array<{
      id: string
      name: string
      sheetBuffer: Buffer
      visualDescription: string
    }> = []

    if (characters && characters.length > 0) {
      await Promise.all(
        characters.map(async (char: { id: string; name: string; photo_url: string }) => {
          // Download user's uploaded photo
          const { data: photoData, error: dlErr } = await supabase.storage
            .from('comic-uploads')
            .download(char.photo_url)

          if (dlErr || !photoData) {
            throw new Error(`Failed to download photo for ${char.name}`)
          }

          const photoBuffer = Buffer.from(await photoData.arrayBuffer())

          // Generate character reference sheet
          const sheetBuffer = await generateCharacterSheet(
            photoBuffer,
            char.name,
            comic.theme,
            comic.age_range as AgeRange
          )

          // Extract visual description using Claude
          const visualDescription = await extractVisualDescription(
            sheetBuffer.toString('base64')
          )

          // Upload reference sheet to storage
          const sheetPath = `${comicId}/chars/${char.id}.png`
          const { error: uploadErr } = await supabase.storage
            .from('comic-assets')
            .upload(sheetPath, sheetBuffer, { contentType: 'image/png', upsert: true })

          if (uploadErr) throw new Error(`Failed to upload character sheet for ${char.name}`)

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('comic-assets')
            .getPublicUrl(sheetPath)

          // Update character record
          await supabase
            .from('characters')
            .update({
              reference_sheet_url: urlData.publicUrl,
              visual_description: visualDescription,
            })
            .eq('id', char.id)

          characterRefs.push({
            id: char.id,
            name: char.name,
            sheetBuffer,
            visualDescription,
          })
        })
      )
    }

    // Step 3: Generate panel images (sequential for consistency)
    await supabase.from('comics').update({ status: 'generating_panels' }).eq('id', comicId)

    for (const panel of script.panels) {
      const panelImage = await generatePanelImage({
        panel,
        characters: characterRefs,
        ageRange: comic.age_range as AgeRange,
        theme: comic.theme,
        totalPanels: script.panels.length,
      })

      // Upload panel image
      const panelPath = `${comicId}/panels/${panel.panelNumber}.png`
      const { error: uploadErr } = await supabase.storage
        .from('comic-assets')
        .upload(panelPath, panelImage, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw new Error(`Failed to upload panel ${panel.panelNumber}`)

      const { data: urlData } = supabase.storage
        .from('comic-assets')
        .getPublicUrl(panelPath)

      // Update panel with image URL
      await supabase
        .from('panels')
        .update({ image_url: urlData.publicUrl })
        .eq('comic_id', comicId)
        .eq('panel_number', panel.panelNumber)
    }

    // Done
    await supabase.from('comics').update({ status: 'complete' }).eq('id', comicId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase
      .from('comics')
      .update({ status: 'error', error_message: message })
      .eq('id', comicId)
    throw err
  }
}
