import { LIMITS } from "../shared/limits";
import type { ComicScript } from "../shared/script";

export interface Env { AI: Ai; COMICS: KVNamespace }
export interface StoredComic { id: string; createdAt: number; script: ComicScript; images: Record<string, number>; imageCount: number }

export const json = (data: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

export const err = (message: string, status = 400) => json({ error: message }, status);

export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";

/** Fixed-window per-IP counter in KV. Approximate (KV is eventually consistent) but good enough as a budget guard. */
export async function rateLimit(env: Env, ip: string, kind: string, max: number): Promise<{ ok: boolean; retryAfter: number }> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${kind}:${ip}:${hour}`;
  const count = Number((await env.COMICS.get(key)) || 0);
  const retryAfter = 3600 - Math.floor((Date.now() / 1000) % 3600);
  if (count >= max) return { ok: false, retryAfter };
  await env.COMICS.put(key, String(count + 1), { expirationTtl: 7200 });
  return { ok: true, retryAfter };
}

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
export const comicKey = (id: string) => `comic:${id}`;
export const imageKey = (id: string, slot: string) => `img:${id}:${slot}`;
export const validId = (id: string) => /^[a-f0-9]{12}$/.test(id);
export const validSlot = (slot: string) => /^(cover|\d{1,2}-\d{1,2})$/.test(slot);

export async function loadComic(env: Env, id: string): Promise<StoredComic | null> {
  if (!validId(id)) return null;
  return env.COMICS.get<StoredComic>(comicKey(id), "json");
}
export const saveComic = (env: Env, c: StoredComic) =>
  env.COMICS.put(comicKey(c.id), JSON.stringify(c), { expirationTtl: LIMITS.comicTtlSeconds });
