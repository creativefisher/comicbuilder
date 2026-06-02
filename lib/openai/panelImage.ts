import OpenAI from 'openai'
import { toFile } from 'openai'
import type { AgeRange, ComicScriptPanel, DialogueLine } from '../types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

interface CharacterRef {
  name: string
  sheetBuffer: Buffer
  visualDescription: string
}

interface PanelImageOptions {
  panel: ComicScriptPanel
  characters: CharacterRef[]
  ageRange: AgeRange
  theme: string
  totalPanels: number
}

const TONE_MAP: Record<AgeRange, string> = {
  '5-8': 'bright cheerful colors, simple backgrounds, friendly rounded art style, safe for young children',
  '9-12': 'dynamic action-oriented composition, bold colors, dramatic angles, energetic feel',
  '13+': 'detailed atmospheric composition, dramatic lighting and shadows, cinematic feel',
}

function describeDialoguePlacement(dialogue: DialogueLine[]): string {
  if (dialogue.length === 0) return 'No speech bubbles. Full image area available.'
  const placements = dialogue.map((d) =>
    `- Leave blank white rectangular area at the ${d.position} of the image for a speech bubble`
  )
  return placements.join('\n')
}

function storyPosition(panelNum: number, total: number): string {
  const pct = panelNum / total
  if (pct <= 0.15) return 'establishing shot, wide angle, introduce setting and characters'
  if (pct <= 0.4) return 'rising action, medium shot, characters engaged with situation'
  if (pct <= 0.6) return 'midpoint, dynamic angle, story intensifies'
  if (pct <= 0.8) return 'climax, dramatic close-up or action shot, peak tension'
  return 'resolution, warm composition, satisfying conclusion'
}

export async function generatePanelImage(options: PanelImageOptions): Promise<Buffer> {
  const { panel, characters, ageRange, theme, totalPanels } = options

  // Build character descriptions for characters in this panel
  const panelCharacters = characters.filter((c) =>
    panel.characters.includes(c.name)
  )

  const characterDescriptions = panelCharacters
    .map((c) => {
      const action = panel.characterActions[c.name] || 'standing, engaged in scene'
      return `- ${c.name.toUpperCase()}: ${c.visualDescription}
  Action in this panel: ${action}`
    })
    .join('\n\n')

  const dialoguePlacement = describeDialoguePlacement(panel.dialogue)
  const position = storyPosition(panel.panelNumber, totalPanels)

  const prompt = `Comic book panel illustration. Panel ${panel.panelNumber} of ${totalPanels}.

ART STYLE: Bold American comic book art, clean black ink outlines, flat cel shading, vibrant colors.
${TONE_MAP[ageRange]}
Story position: ${position}

SCENE: ${panel.sceneDescription}

CHARACTERS IN THIS PANEL (you have their reference sheets — match exactly):
${characterDescriptions || 'No named characters in this panel — use background characters or focus on environment.'}

VISUAL CONSISTENCY REQUIREMENTS:
- Characters MUST exactly match their provided reference sheets in face, hair, clothing, and distinguishing features
- Do NOT alter character appearance from the reference sheets
- Maintain consistent art style with bold outlines and flat colors

COMPOSITION:
${dialoguePlacement}
- Include a thick black comic panel border around the entire image
- Do NOT include any text, words, letters, or numbers in the image
- ${theme} story atmosphere appropriate for ages ${ageRange}`

  // Build image inputs: all character reference sheets for characters in this panel
  const imageFiles = await Promise.all(
    panelCharacters.map((c, i) =>
      toFile(c.sheetBuffer, `character-${i}.png`, { type: 'image/png' })
    )
  )

  let response
  if (imageFiles.length > 0) {
    response = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFiles.length === 1 ? imageFiles[0] : imageFiles as Parameters<typeof client.images.edit>[0]['image'],
      prompt,
      size: '1024x1024',
      quality: 'high',
    })
  } else {
    // No character reference sheets — use generate instead
    response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'high',
    })
  }

  const imageData = response.data?.[0]
  if (!imageData?.b64_json) {
    throw new Error(`Failed to generate image for panel ${panel.panelNumber}`)
  }

  return Buffer.from(imageData.b64_json, 'base64')
}
