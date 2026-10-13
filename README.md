# Comic Builder

Turn a story idea into an illustrated comic book, powered entirely by **Cloudflare Workers AI**.

- **Script:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast` writes a structured JSON script (title, cast with fixed visual descriptions, pages → panels with scene, caption, dialogue).
- **Art:** `@cf/black-forest-labs/flux-1-schnell` draws the cover and each panel using the shared style + character descriptions.
- Lettering (captions & speech bubbles) is HTML/CSS overlaid on the art, never baked into images.
- Comics (script + images) are stored in Workers KV for 90 days and shareable at `/c/<id>`.

## Stack
Vite + vanilla TypeScript frontend, Cloudflare Pages Functions (`functions/api`) with `AI` and `COMICS` (KV) bindings in `wrangler.toml`.

| Route | |
|---|---|
| `POST /api/comic` | `{idea, genre, style, pages, panelsPerPage, characters}` → new comic |
| `GET /api/comic/:id` | stored comic |
| `POST /api/image/:id/:slot` | (re)draw `cover` or `<page>-<panel>` |
| `GET /api/image/:id/:slot` | JPEG |

## Limits
Max 4 pages, 6 panels/page, 16 panels per comic, 40 images per comic; per IP: 6 comics/hour and 60 images/hour (`src/shared/limits.ts`).

## Develop
```bash
npm ci
npm test
npm run build && npx wrangler pages dev   # uses remote AI binding
```
CI (`.github/workflows/ci.yml`) runs tests + build on every PR and push; pushes to `main` deploy to the `comic-builder` Pages project. Requires repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
