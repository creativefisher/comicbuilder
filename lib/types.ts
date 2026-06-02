export type AgeRange = '5-8' | '9-12' | '13+'
export type ComicTheme = 'adventure' | 'mystery' | 'history' | 'fantasy' | 'sci-fi' | 'friendship' | 'nature'
export type ComicStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_characters'
  | 'generating_panels'
  | 'complete'
  | 'error'

export interface Comic {
  id: string
  age_range: AgeRange
  theme: string
  title: string | null
  status: ComicStatus
  error_message: string | null
  created_at: string
}

export interface Character {
  id: string
  comic_id: string
  name: string
  photo_url: string
  reference_sheet_url: string | null
  visual_description: string | null
}

export interface DialogueLine {
  character: string
  text: string
  position: 'top' | 'bottom'
}

export interface Panel {
  id: string
  comic_id: string
  panel_number: number
  scene_description: string
  dialogue: DialogueLine[]
  image_url: string | null
}

export interface GenerationStatusResponse {
  status: ComicStatus
  title: string | null
  error: string | null
  progress: {
    charactersComplete: number
    charactersTotal: number
    panelsComplete: number
    panelsTotal: number
  }
}

export interface CharacterInput {
  name: string
  photoStoragePath: string
}

export interface ComicScriptPanel {
  panelNumber: number
  sceneDescription: string
  characters: string[]
  characterActions: Record<string, string>
  dialogue: DialogueLine[]
}

export interface ComicScript {
  title: string
  panels: ComicScriptPanel[]
}
