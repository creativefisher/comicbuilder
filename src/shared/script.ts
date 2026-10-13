import { LIMITS } from "./limits";

export interface Character { name: string; description: string }
export interface Dialogue { speaker: string; text: string }
export interface Panel { scene: string; caption?: string; dialogue: Dialogue[] }
export interface Page { panels: Panel[] }
export interface ComicScript {
  title: string; logline: string; style: string;
  characters: Character[]; cover: string; pages: Page[];
}
export interface ComicRequest {
  idea: string; style: string; genre: string;
  pages: number; panelsPerPage: number; characters: string;
}

const str = (v: unknown, max: number, fallback = ""): string =>
  (typeof v === "string" ? v : fallback).replace(/\s+/g, " ").trim().slice(0, max);

const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

export function validateRequest(body: unknown): { ok: true; value: ComicRequest } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const idea = str(b.idea, LIMITS.maxIdeaLength);
  if (idea.length < 5) return { ok: false, error: "Please describe your story idea (at least 5 characters)." };
  const pages = clampInt(b.pages, 1, LIMITS.maxPages, 1);
  let panelsPerPage = clampInt(b.panelsPerPage, LIMITS.minPanelsPerPage, LIMITS.maxPanelsPerPage, 4);
  if (pages * panelsPerPage > LIMITS.maxTotalPanels) panelsPerPage = Math.floor(LIMITS.maxTotalPanels / pages);
  return {
    ok: true,
    value: {
      idea, pages, panelsPerPage,
      style: str(b.style, 200, "modern American comic, bold ink, vibrant colors") || "modern American comic, bold ink, vibrant colors",
      genre: str(b.genre, 40, "adventure") || "adventure",
      characters: str(b.characters, 500),
    },
  };
}

/** Extract the first balanced JSON object from LLM output (handles code fences and chatter). */
export function extractJson(raw: unknown): unknown {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") throw new Error("Model returned no text");
  const text = raw.replace(/```(?:json)?/gi, "");
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object in model output");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("Unterminated JSON in model output");
}

/** Normalize and validate a script, forcing the requested page/panel shape. */
export function normalizeScript(input: unknown, req: ComicRequest): ComicScript {
  const s = (input ?? {}) as Record<string, any>;
  const characters: Character[] = (Array.isArray(s.characters) ? s.characters : [])
    .map((c: any) => ({ name: str(c?.name, 40), description: str(c?.description ?? c?.appearance, 300) }))
    .filter((c: Character) => c.name)
    .slice(0, LIMITS.maxCharacters);

  const rawPanels: any[] = [];
  if (Array.isArray(s.pages)) for (const p of s.pages) if (Array.isArray(p?.panels)) rawPanels.push(...p.panels);
  if (Array.isArray(s.panels)) rawPanels.push(...s.panels);
  const needed = req.pages * req.panelsPerPage;
  if (rawPanels.length === 0) throw new Error("Script contained no panels");

  const panels: Panel[] = rawPanels.slice(0, needed).map((p) => ({
    scene: str(p?.scene ?? p?.description, 500) || "An establishing shot of the scene.",
    caption: str(p?.caption, 200) || undefined,
    dialogue: (Array.isArray(p?.dialogue) ? p.dialogue : [])
      .map((d: any) => ({ speaker: str(d?.speaker ?? d?.character, 40), text: str(d?.text ?? d?.line, 160) }))
      .filter((d: Dialogue) => d.text)
      .slice(0, 3),
  }));
  while (panels.length < needed) {
    const last = panels[panels.length - 1];
    panels.push({ scene: `${last.scene} A moment later.`, dialogue: [] });
  }
  const pages: Page[] = [];
  for (let i = 0; i < req.pages; i++) pages.push({ panels: panels.slice(i * req.panelsPerPage, (i + 1) * req.panelsPerPage) });

  return {
    title: str(s.title, 80) || "Untitled Comic",
    logline: str(s.logline ?? s.summary, 240),
    style: req.style,
    characters,
    cover: str(s.cover ?? s.cover_scene, 500) || `Dramatic cover art for a ${req.genre} comic: ${req.idea}`,
    pages,
  };
}

export function buildScriptPrompt(req: ComicRequest): string {
  return `You are a professional comic book writer. Write a ${req.genre} comic script.
Story idea: ${req.idea}
${req.characters ? `Characters requested: ${req.characters}\n` : ""}Exactly ${req.pages} page(s), each with exactly ${req.panelsPerPage} panels.
Rules:
- "characters": 1-4 main characters with a detailed, fixed visual description (age, build, hair, clothing, colors) reused for consistency.
- Each panel "scene" is a visual description for an illustrator: who is in it (by name), action, setting, camera angle. No text in images.
- "caption": short narration (max 20 words) where useful. "dialogue": most panels should have 1-2 natural, characterful lines (max 15 words each) with "speaker".
- Tell a complete story with a beginning, middle and satisfying ending.
Respond with ONLY a JSON object of the form:
{"title":"...","logline":"...","cover":"visual description of the cover image","characters":[{"name":"...","description":"..."}],"pages":[{"panels":[{"scene":"...","caption":"...","dialogue":[{"speaker":"...","text":"..."}]}]}]}`;
}

export function buildImagePrompt(script: ComicScript, scene: string): string {
  const cast = script.characters
    .filter((c) => scene.toLowerCase().includes(c.name.toLowerCase().split(" ")[0]))
    .map((c) => `${c.name}: ${c.description}`)
    .join("; ");
  return `Comic book panel illustration, ${script.style}. ${scene}${cast ? ` Characters: ${cast}.` : ""} Consistent character designs, cinematic composition, detailed background, no text, no speech bubbles, no letters.`.slice(0, 2000);
}
