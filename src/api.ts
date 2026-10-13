import type { ComicScript } from "./shared/script";
export interface Comic { id: string; createdAt: number; script: ComicScript; images: Record<string, number>; imageCount: number }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(url, init); } catch { throw new Error("Network error — check your connection."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
}
export const createComic = (body: unknown) =>
  call<Comic>("/api/comic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
export const getComic = (id: string) => call<Comic>(`/api/comic/${id}`);
export const drawPanel = (id: string, slot: string) => call<{ slot: string; url: string }>(`/api/image/${id}/${slot}`, { method: "POST" });
export const imageUrl = (id: string, slot: string, v: number) => `/api/image/${id}/${slot}?v=${v}`;
