import Anthropic from '@anthropic-ai/sdk'
import type { AgeRange, ComicScript, ComicScriptPanel, DialogueLine } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPTS: Record<AgeRange, string> = {
  '5-8': `You are a children's comic book author writing for ages 5-8.
Create simple, joyful stories with clear moral lessons.
Use short sentences. Avoid conflict that is scary.
Dialogue should be simple words children can understand.
Stories should be optimistic with happy endings.
Keep dialogue very short — maximum 8 words per speech bubble.`,

  '9-12': `You are a comic book author writing for ages 9-12.
Create exciting, imaginative stories with relatable characters and mild peril.
Include teamwork, problem-solving, and positive values.
Dialogue can be more expressive. Avoid violence, romance, or adult themes.
Keep dialogue punchy — maximum 15 words per speech bubble.`,

  '13+': `You are a comic book author writing for teenagers ages 13+.
Create compelling stories with real emotional stakes, complex characters, and meaningful themes.
You may include mild tension, mystery, and drama but avoid graphic content.
Dialogue should feel authentic and age-appropriate.
Keep dialogue natural — maximum 20 words per speech bubble.`,
}

const TOOL_SCHEMA = {
  name: 'create_comic_script',
  description: 'Output the complete comic book script as structured data',
  input_schema: {
    type: 'object' as const,
    required: ['title', 'panels'],
    properties: {
      title: {
        type: 'string',
        description: 'Exciting comic book title in all caps style',
      },
      panels: {
        type: 'array',
        minItems: 6,
        maxItems: 8,
        description: 'Array of 6-8 panels forming a complete story',
        items: {
          type: 'object',
          required: ['panelNumber', 'sceneDescription', 'characters', 'characterActions', 'dialogue'],
          properties: {
            panelNumber: { type: 'number' },
            sceneDescription: {
              type: 'string',
              description: 'Vivid visual description of the scene for image generation. Include setting, lighting, mood, camera angle.',
            },
            characters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of characters appearing in this panel',
            },
            characterActions: {
              type: 'object',
              description: 'Map of character name to their action/pose in this panel',
              additionalProperties: { type: 'string' },
            },
            dialogue: {
              type: 'array',
              description: 'Speech bubbles in this panel (max 2 per panel)',
              maxItems: 2,
              items: {
                type: 'object',
                required: ['character', 'text', 'position'],
                properties: {
                  character: { type: 'string' },
                  text: { type: 'string' },
                  position: {
                    type: 'string',
                    enum: ['top', 'bottom'],
                    description: 'top = character speaking from top of panel, bottom = from bottom',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

export async function generateComicScript(
  ageRange: AgeRange,
  theme: string,
  characterNames: string[]
): Promise<ComicScript> {
  const charactersDescription =
    characterNames.length > 0
      ? `Main characters: ${characterNames.join(', ')}.`
      : 'Create 1-2 original characters that fit the story.'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPTS[ageRange],
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'create_comic_script' },
    messages: [
      {
        role: 'user',
        content: `Create a ${theme} comic book for age range ${ageRange}.
${charactersDescription}

The story must have 6-8 panels with a clear beginning, middle, and end.
Panel 1 should establish the setting and characters.
The story should build excitement and resolve satisfyingly.
Each scene description should be rich enough for an artist to illustrate.`,
      },
    ],
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a comic script')
  }

  const raw = toolUse.input as {
    title: string
    panels: Array<{
      panelNumber: number
      sceneDescription: string
      characters: string[]
      characterActions: Record<string, string>
      dialogue: Array<{ character: string; text: string; position: string }>
    }>
  }

  return {
    title: raw.title,
    panels: raw.panels.map((p): ComicScriptPanel => ({
      panelNumber: p.panelNumber,
      sceneDescription: p.sceneDescription,
      characters: p.characters,
      characterActions: p.characterActions,
      dialogue: p.dialogue.map((d): DialogueLine => ({
        character: d.character,
        text: d.text,
        position: d.position as 'top' | 'bottom',
      })),
    })),
  }
}

export async function extractVisualDescription(imageBase64: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Describe this comic book character in precise detail for use as a reference in future image generation.
Cover: hair (color, length, style), eye color, skin tone, face shape, clothing (colors, style, any logos or details),
body type, and any accessories or notable distinguishing features.
Be specific and consistent — this description will be used to maintain visual consistency across multiple images.
Write 3-5 sentences.`,
          },
        ],
      },
    ],
  })

  const text = response.content.find((b) => b.type === 'text')
  return text?.type === 'text' ? text.text : ''
}
