import { IMAGE_MODEL, LIMITS } from "../../../../src/shared/limits";
import { buildImagePrompt } from "../../../../src/shared/script";
import { clientIp, err, imageKey, json, loadComic, rateLimit, saveComic, validId, validSlot, type Env, type StoredComic } from "../../../../src/server/util";

function sceneFor(slot: string, comic: StoredComic): string | null {
  if (slot === "cover") return `Comic book cover art without any title text. ${comic.script.cover}`;
  const [p, n] = slot.split("-").map(Number);
  return comic.script.pages[p]?.panels[n]?.scene ?? null;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = String(params.id), slot = String(params.slot);
  if (!validId(id) || !validSlot(slot)) return err("Bad request");
  const data = await env.COMICS.get(imageKey(id, slot), "arrayBuffer");
  if (!data) return err("Image not found", 404);
  return new Response(data, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
};

export const onRequestPost: PagesFunction<Env> = async ({ params, env, request }) => {
  const slot = String(params.slot);
  if (!validSlot(slot)) return err("Bad slot");
  const comic = await loadComic(env, String(params.id));
  if (!comic) return err("Comic not found", 404);
  const scene = sceneFor(slot, comic);
  if (!scene) return err("No such panel", 404);
  if ((comic.imageCount || 0) >= LIMITS.imagesPerComic) return err("This comic has reached its image limit.", 429);

  const rl = await rateLimit(env, clientIp(request), "img", LIMITS.imagesPerIpPerHour);
  if (!rl.ok) return json({ error: `Image limit reached (${LIMITS.imagesPerIpPerHour}/hour). Try again later.` }, 429, { "retry-after": String(rl.retryAfter) });

  try {
    const out: any = await env.AI.run(IMAGE_MODEL as any, {
      prompt: buildImagePrompt(comic.script, scene),
      steps: 6,
      seed: Math.floor(Math.random() * 1e9),
    } as any);
    if (!out?.image) throw new Error("no image returned");
    const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
    await env.COMICS.put(imageKey(comic.id, slot), bytes, { expirationTtl: LIMITS.comicTtlSeconds });
    const version = Date.now();
    const fresh = (await loadComic(env, comic.id)) ?? comic; // re-read to limit lost updates from parallel panels
    fresh.images = { ...(fresh.images || {}), [slot]: version };
    fresh.imageCount = (fresh.imageCount || 0) + 1;
    await saveComic(env, fresh);
    return json({ slot, url: `/api/image/${comic.id}/${slot}?v=${version}` });
  } catch (e: any) {
    return err(`The artist couldn't draw this panel (${e?.message || e}). Try regenerating.`, 502);
  }
};
