import { LIMITS, TEXT_MODEL } from "../../../src/shared/limits";
import { buildScriptPrompt, extractJson, normalizeScript, validateRequest } from "../../../src/shared/script";
import { clientIp, err, json, newId, rateLimit, saveComic, type Env, type StoredComic } from "../../../src/server/util";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return err("Invalid JSON body"); }
  const v = validateRequest(body);
  if (!v.ok) return err(v.error);

  const rl = await rateLimit(env, clientIp(request), "comic", LIMITS.comicsPerIpPerHour);
  if (!rl.ok) return json({ error: `You've hit the limit of ${LIMITS.comicsPerIpPerHour} comics per hour. Try again later.` }, 429, { "retry-after": String(rl.retryAfter) });

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out: any = await env.AI.run(TEXT_MODEL as any, {
        messages: [
          { role: "system", content: "You write comic book scripts and reply with strict JSON only." },
          { role: "user", content: buildScriptPrompt(v.value) },
        ],
        max_tokens: 3500,
        temperature: 0.8,
      } as any);
      const script = normalizeScript(extractJson(out?.response ?? out), v.value);
      const comic: StoredComic = { id: newId(), createdAt: Date.now(), script, images: {}, imageCount: 0 };
      await saveComic(env, comic);
      return json(comic, 201);
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }
  return err(`The writer got stuck (${lastError}). Please try again.`, 502);
};
