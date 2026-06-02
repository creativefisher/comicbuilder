import OpenAI from 'openai'
import { toFile } from 'openai'
import type { AgeRange } from '../types'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function generateCharacterSheet(
  photoBuffer: Buffer,
  characterName: string,
  theme: string,
  ageRange: AgeRange
): Promise<Buffer> {
  const toneMap: Record<AgeRange, string> = {
    '5-8': 'bright, cheerful, rounded friendly features, safe for young children',
    '9-12': 'dynamic, expressive, adventure-ready, bold and energetic',
    '13+': 'detailed, dramatic, stylized with strong personality',
  }

  const prompt = `Create a comic book character reference sheet for a character named ${characterName}.
Style: bold American comic book art, clean ink outlines, flat cel shading, vibrant colors, ${toneMap[ageRange]}.

The reference sheet must show exactly 4 views arranged in a 2x2 grid:
- Top-left: FRONT VIEW (full body, standing)
- Top-right: SIDE PROFILE (left side, full body)
- Bottom-left: BACK VIEW (full body)
- Bottom-right: FACE CLOSE-UP (head and shoulders)

Label each view clearly with small text: "FRONT", "SIDE", "BACK", "FACE".

CRITICAL: Maintain exact likeness from the reference photo provided:
- Same face shape and proportions
- Same eye color and shape
- Same hair color, length, and style
- Same skin tone
- Any distinguishing features (freckles, glasses, etc.)

Dress the character in ${theme}-adventure appropriate clothing suitable for a ${ageRange} year old audience.
White background. Black comic panel border around each of the 4 views.
No speech bubbles. No background scene. Character design only.`

  const imageFile = await toFile(photoBuffer, 'character-photo.jpg', { type: 'image/jpeg' })

  const response = await client.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt,
    size: '1024x1024',
    quality: 'high',
  })

  const imageData = response.data?.[0]
  if (!imageData?.b64_json) {
    throw new Error(`Failed to generate character sheet for ${characterName}`)
  }

  return Buffer.from(imageData.b64_json, 'base64')
}
