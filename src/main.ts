import "./style.css";
import { createComic, drawPanel, getComic, imageUrl, type Comic } from "./api";
import { layoutFor } from "./shared/layout";
import { LIMITS } from "./shared/limits";
import type { Panel } from "./shared/script";

const app = document.getElementById("app")!;
const STYLES = [
  ["Modern comic", "modern American comic book art, bold clean ink lines, vibrant flat colors, dynamic shading"],
  ["Manga", "black and white manga style, screentone shading, expressive linework"],
  ["Noir", "gritty noir comic, high-contrast black ink, moody shadows, limited muted palette"],
  ["Watercolor", "soft watercolor storybook illustration, gentle textures, warm palette"],
  ["Pop art", "retro 1960s pop-art comic, halftone dots, bold primary colors"],
  ["3D animated", "stylized 3D animated film look, soft lighting, expressive characters"],
];
const GENRES = ["adventure", "sci-fi", "fantasy", "mystery", "comedy", "superhero", "horror", "slice of life", "romance"];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const h = (html: string) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };

function toast(msg: string, kind: "error" | "ok" = "ok") {
  const el = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  document.body.append(el);
  setTimeout(() => el.remove(), 4500);
}

function shell(inner: string) {
  app.innerHTML = `
  <header class="topbar no-print">
    <a href="/" class="brand"><span class="logo">POW!</span> Comic Builder</a>
    <span class="tag">Powered by Cloudflare Workers AI</span>
  </header>
  <main>${inner}</main>
  <footer class="no-print">Stories by Llama 3.3 · Art by FLUX.1 schnell · Comics are public to anyone with the link.</footer>`;
}

/* ---------------- Home ---------------- */
function renderHome() {
  document.title = "Comic Builder — AI Comic Book Generator";
  shell(`
  <section class="hero">
    <div class="hero-copy">
      <h1>Turn any idea into a <span class="hl">comic book</span>.</h1>
      <p>Describe a story. AI writes the script, designs the characters and draws every panel — in seconds.</p>
      <ul class="steps"><li><b>1</b> Write</li><li><b>2</b> Illustrate</li><li><b>3</b> Share</li></ul>
    </div>
    <form id="f" class="card">
      <label>Story idea
        <textarea name="idea" required minlength="5" maxlength="${LIMITS.maxIdeaLength}" rows="4" placeholder="A shy robot barista discovers it can taste coffee for the first time…"></textarea>
      </label>
      <div class="row">
        <label>Genre <select name="genre">${GENRES.map((g) => `<option>${g}</option>`).join("")}</select></label>
        <label>Art style <select name="style">${STYLES.map(([n, v]) => `<option value="${esc(v)}">${n}</option>`).join("")}</select></label>
      </div>
      <div class="row">
        <label>Pages <input name="pages" type="number" min="1" max="${LIMITS.maxPages}" value="1" /></label>
        <label>Panels per page <input name="panelsPerPage" type="number" min="1" max="${LIMITS.maxPanelsPerPage}" value="4" /></label>
      </div>
      <label>Characters <span class="opt">(optional)</span>
        <input name="characters" maxlength="500" placeholder="Bolt — a small copper robot with round blue eyes; Mia — a barista with a red apron" />
      </label>
      <p class="hint" id="hint"></p>
      <button class="btn primary big" type="submit">✨ Generate comic</button>
    </form>
  </section>`);
  const f = document.getElementById("f") as HTMLFormElement;
  const hint = document.getElementById("hint")!;
  const upd = () => {
    const n = Number(f.pages.value) * Number(f.panelsPerPage.value);
    hint.textContent = n > LIMITS.maxTotalPanels ? `Max ${LIMITS.maxTotalPanels} panels per comic — panels per page will be reduced.` : `${n} panel${n === 1 ? "" : "s"} + cover`;
  };
  f.addEventListener("input", upd); upd();
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = f.querySelector("button")!;
    btn.disabled = true; btn.innerHTML = `<span class="spin"></span> Writing your script…`;
    try {
      const comic = await createComic(Object.fromEntries(new FormData(f)));
      history.pushState({}, "", `/c/${comic.id}`);
      renderComic(comic, true);
    } catch (err: any) {
      toast(err.message, "error");
      btn.disabled = false; btn.textContent = "✨ Generate comic";
    }
  });
}

/* ---------------- Comic ---------------- */
let current: Comic | null = null;
let pageIdx = 0;

function bubbles(p: Panel) {
  return `${p.caption ? `<div class="caption">${esc(p.caption)}</div>` : ""}
  <div class="bubbles">${p.dialogue.map((d, i) => `<div class="bubble ${i % 2 ? "right" : "left"}">${d.speaker ? `<b>${esc(d.speaker)}</b>` : ""}${esc(d.text)}</div>`).join("")}</div>`;
}

function panelHtml(c: Comic, slot: string, inner: string, cls = "") {
  const v = c.images[slot];
  return `<figure class="panel ${cls}" data-slot="${slot}">
    <div class="art">${v ? `<img src="${imageUrl(c.id, slot, v)}" alt="" loading="lazy" />` : `<div class="skeleton"><span>Drawing…</span></div>`}</div>
    ${inner}
    <button class="regen no-print" title="Redraw this panel" data-slot="${slot}">↻</button>
  </figure>`;
}

function renderComic(c: Comic, fresh = false) {
  current = c; pageIdx = 0;
  const s = c.script;
  document.title = `${s.title} — Comic Builder`;
  const pages = s.pages.map((pg, pi) => {
    const L = layoutFor(pg.panels.length);
    return `<section class="page" data-page="${pi + 1}">
      <div class="grid" style="grid-template-columns:repeat(${L.columns},1fr);grid-template-rows:repeat(${L.rows},1fr)">
      ${pg.panels.map((p, ni) => {
        const cell = L.cells[ni];
        return `<div style="grid-column:${cell.col} / span ${cell.colSpan};grid-row:${cell.row} / span ${cell.rowSpan}">${panelHtml(c, `${pi}-${ni}`, bubbles(p))}</div>`;
      }).join("")}
      </div><div class="pnum">${pi + 1}</div></section>`;
  }).join("");
  shell(`
  <div class="toolbar no-print">
    <a class="btn" href="/">＋ New comic</a>
    <button class="btn" id="share">🔗 Copy share link</button>
    <button class="btn" id="png">⬇ Page as PNG</button>
    <button class="btn" id="pdf">🖨 Save as PDF</button>
    <span class="progress" id="progress"></span>
  </div>
  <div class="book" id="book">
    <section class="page cover" data-page="0">
      ${panelHtml(c, "cover", `<div class="cover-title"><span class="issue">#1 · ${esc(s.style.split(",")[0])}</span><h1>${esc(s.title)}</h1>${s.logline ? `<p>${esc(s.logline)}</p>` : ""}</div>`, "cover-art")}
    </section>
    ${pages}
    <section class="page cast">
      <h2>The Cast</h2>
      <div class="cast-list">${s.characters.map((ch) => `<div><b>${esc(ch.name)}</b><p>${esc(ch.description)}</p></div>`).join("") || "<p>No named characters.</p>"}</div>
      <p class="end">THE END</p>
    </section>
  </div>
  <nav class="pager no-print">
    <button class="btn" id="prev">← Prev</button>
    <div class="dots" id="dots"></div>
    <button class="btn" id="next">Next →</button>
  </nav>`);
  wireComic();
  showPage(0);
  const missing = ["cover", ...s.pages.flatMap((pg, pi) => pg.panels.map((_, ni) => `${pi}-${ni}`))].filter((k) => !c.images[k]);
  if (missing.length && (fresh || confirm(`${missing.length} panel(s) aren't drawn yet. Draw them now?`))) drawQueue(missing);
}

function pageEls() { return [...document.querySelectorAll<HTMLElement>(".book > .page")]; }
function showPage(i: number) {
  const els = pageEls();
  pageIdx = Math.max(0, Math.min(els.length - 1, i));
  els.forEach((el, k) => el.classList.toggle("active", k === pageIdx));
  document.getElementById("dots")!.innerHTML = els.map((_, k) => `<button class="${k === pageIdx ? "on" : ""}" data-k="${k}" aria-label="Page ${k}"></button>`).join("");
  (document.getElementById("prev") as HTMLButtonElement).disabled = pageIdx === 0;
  (document.getElementById("next") as HTMLButtonElement).disabled = pageIdx === els.length - 1;
}

function setPanel(slot: string, state: "loading" | "error" | string, msg = "") {
  document.querySelectorAll<HTMLElement>(`.panel[data-slot="${slot}"] .art`).forEach((art) => {
    if (state === "loading") art.innerHTML = `<div class="skeleton"><span>Drawing…</span></div>`;
    else if (state === "error") art.innerHTML = `<div class="skeleton err"><span>${esc(msg || "Failed")}<br/>Tap ↻ to retry</span></div>`;
    else art.innerHTML = `<img src="${state}" alt="" class="fade" />`;
  });
}

async function drawOne(slot: string) {
  if (!current) return;
  setPanel(slot, "loading");
  try {
    const r = await drawPanel(current.id, slot);
    current.images[slot] = Number(new URL(r.url, location.href).searchParams.get("v"));
    setPanel(slot, r.url);
  } catch (e: any) {
    setPanel(slot, "error", e.message);
    if (/limit/i.test(e.message)) throw e;
  }
}

async function drawQueue(slots: string[]) {
  const prog = document.getElementById("progress")!;
  let done = 0, stop = false;
  const total = slots.length, queue = [...slots];
  prog.textContent = `Drawing 0/${total}…`;
  const worker = async () => {
    while (queue.length && !stop) {
      const s = queue.shift()!;
      try { await drawOne(s); } catch (e: any) { stop = true; toast(e.message, "error"); }
      prog.textContent = ++done < total ? `Drawing ${done}/${total}…` : "All panels drawn ✓";
    }
  };
  await Promise.all([worker(), worker()]);
}

function wireComic() {
  document.getElementById("prev")!.onclick = () => showPage(pageIdx - 1);
  document.getElementById("next")!.onclick = () => showPage(pageIdx + 1);
  document.getElementById("dots")!.onclick = (e) => { const k = (e.target as HTMLElement).dataset.k; if (k) showPage(Number(k)); };
  document.getElementById("book")!.onclick = (e) => {
    const slot = (e.target as HTMLElement).closest<HTMLElement>(".regen")?.dataset.slot;
    if (slot) drawOne(slot).catch((er) => toast(er.message, "error"));
  };
  document.getElementById("share")!.onclick = async () => {
    const url = location.href;
    try { if (navigator.share && matchMedia("(pointer:coarse)").matches) await navigator.share({ title: current?.script.title, url }); else { await navigator.clipboard.writeText(url); toast("Share link copied!"); } }
    catch { prompt("Copy this link:", url); }
  };
  document.getElementById("pdf")!.onclick = () => window.print();
  document.getElementById("png")!.onclick = () => exportPage().catch((e) => toast(e.message, "error"));
  document.onkeydown = (e) => { if (e.key === "ArrowLeft") showPage(pageIdx - 1); if (e.key === "ArrowRight") showPage(pageIdx + 1); };
}

/* Compose the visible page (art + lettering) onto a canvas. */
async function exportPage() {
  const page = pageEls()[pageIdx];
  const rect = page.getBoundingClientRect(), scale = 2;
  const cv = document.createElement("canvas");
  cv.width = rect.width * scale; cv.height = rect.height * scale;
  const ctx = cv.getContext("2d")!;
  ctx.scale(scale, scale); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.width, rect.height);
  const at = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height }; };
  for (const img of page.querySelectorAll("img")) {
    await img.decode().catch(() => {});
    const b = at(img.closest(".art")!), ir = img.naturalWidth / img.naturalHeight, br = b.w / b.h;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > br) { sw = sh * br; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / br; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, b.x, b.y, b.w, b.h);
    ctx.lineWidth = 3; ctx.strokeStyle = "#111"; ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  for (const el of page.querySelectorAll<HTMLElement>(".caption, .bubble, .cover-title h1, .cover-title p")) {
    const b = at(el), st = getComputedStyle(el);
    if (!el.matches(".cover-title *")) {
      ctx.fillStyle = st.backgroundColor; ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, el.classList.contains("bubble") ? 14 : 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = st.color; ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`; ctx.textBaseline = "top";
    const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2, pad = parseFloat(st.paddingLeft);
    let y = b.y + parseFloat(st.paddingTop), line = "";
    for (const w of (el.innerText || "").replace(/\n/g, " ").split(" ")) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > b.w - pad * 2 && line) { ctx.fillText(line, b.x + pad, y); y += lh; line = w; } else line = t;
    }
    ctx.fillText(line, b.x + pad, y);
  }
  const a = document.createElement("a");
  a.download = `${(current?.script.title || "comic").replace(/\W+/g, "-")}-page-${pageIdx}.png`;
  a.href = cv.toDataURL("image/png"); a.click();
}

/* ---------------- Router ---------------- */
async function route() {
  const m = location.pathname.match(/^\/c\/([a-f0-9]{12})$/);
  if (!m) return renderHome();
  shell(`<div class="loading"><span class="spin"></span> Loading comic…</div>`);
  try { renderComic(await getComic(m[1])); }
  catch (e: any) { shell(`<div class="loading"><h2>😕 ${esc(e.message)}</h2><a class="btn primary" href="/">Make a new comic</a></div>`); }
}
window.addEventListener("popstate", route);
route();
