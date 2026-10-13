import { err, json, loadComic, type Env } from "../../../src/server/util";

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const comic = await loadComic(env, String(params.id));
  return comic ? json(comic) : err("Comic not found", 404);
};
