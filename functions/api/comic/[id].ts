import { err, imageKey, json, loadComic, type Env } from "../../../src/server/util";

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const comic = await loadComic(env, String(params.id));
  if (!comic) return err("Comic not found", 404);
  // Image versions live in KV key metadata, so parallel panel writes never lose updates.
  const prefix = imageKey(comic.id, "");
  const list = await env.COMICS.list<{ v: number }>({ prefix });
  for (const k of list.keys) comic.images[k.name.slice(prefix.length)] = k.metadata?.v ?? comic.images[k.name.slice(prefix.length)] ?? 1;
  return json(comic);
};
