import { describe, expect, it } from "vitest";
import { buildImagePrompt, extractJson, normalizeScript, validateRequest, type ComicRequest } from "../src/shared/script";
import { LIMITS } from "../src/shared/limits";

const req: ComicRequest = { idea: "robot learns to paint", style: "watercolor", genre: "comedy", pages: 1, panelsPerPage: 4, characters: "" };

describe("validateRequest", () => {
  it("rejects short ideas", () => expect(validateRequest({ idea: "hi" }).ok).toBe(false));
  it("rejects missing body", () => expect(validateRequest(null).ok).toBe(false));
  it("clamps pages/panels and applies defaults", () => {
    const r = validateRequest({ idea: "a long enough idea", pages: 99, panelsPerPage: 99 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.pages).toBe(LIMITS.maxPages);
      expect(r.value.pages * r.value.panelsPerPage).toBeLessThanOrEqual(LIMITS.maxTotalPanels);
      expect(r.value.genre).toBe("adventure");
      expect(r.value.style.length).toBeGreaterThan(0);
    }
  });
  it("truncates oversized ideas", () => {
    const r = validateRequest({ idea: "x".repeat(5000) });
    expect(r.ok && r.value.idea.length).toBe(LIMITS.maxIdeaLength);
  });
});

describe("extractJson", () => {
  it("parses fenced JSON with chatter", () => {
    expect(extractJson('Sure!\n```json\n{"a":{"b":"}"}}\n```\nEnjoy')).toEqual({ a: { b: "}" } });
  });
  it("passes through objects", () => expect(extractJson({ x: 1 })).toEqual({ x: 1 }));
  it("throws on no JSON", () => expect(() => extractJson("nope")).toThrow());
  it("throws on truncated JSON", () => expect(() => extractJson('{"a":1')).toThrow());
});

describe("normalizeScript", () => {
  const raw = {
    title: "Brush Bot",
    characters: [{ name: "Bolt", description: "small copper robot" }, { name: "" }],
    pages: [{ panels: [
      { scene: "Bolt holds a brush", caption: "Morning.", dialogue: [{ speaker: "Bolt", text: "Hello" }, { speaker: "X", text: "" }] },
      { scene: "Bolt paints" },
    ] }],
  };
  it("pads panels to the requested shape", () => {
    const s = normalizeScript(raw, req);
    expect(s.pages).toHaveLength(1);
    expect(s.pages[0].panels).toHaveLength(4);
    expect(s.characters).toHaveLength(1);
    expect(s.pages[0].panels[0].dialogue).toHaveLength(1);
    expect(s.cover).toContain("robot learns to paint");
  });
  it("splits flat panel lists across pages and trims extras", () => {
    const panels = Array.from({ length: 10 }, (_, i) => ({ scene: `s${i}` }));
    const s = normalizeScript({ panels }, { ...req, pages: 2, panelsPerPage: 3 });
    expect(s.pages.map((p) => p.panels.map((x) => x.scene))).toEqual([["s0", "s1", "s2"], ["s3", "s4", "s5"]]);
    expect(s.title).toBe("Untitled Comic");
  });
  it("throws when there are no panels", () => expect(() => normalizeScript({ title: "x" }, req)).toThrow());
});

describe("buildImagePrompt", () => {
  it("includes style and descriptions of characters in the scene only", () => {
    const s = normalizeScript({ characters: [{ name: "Bolt", description: "copper robot" }, { name: "Mia", description: "red apron" }], panels: [{ scene: "Bolt waves" }] }, { ...req, panelsPerPage: 1 });
    const p = buildImagePrompt(s, "Bolt waves");
    expect(p).toContain("watercolor");
    expect(p).toContain("copper robot");
    expect(p).not.toContain("red apron");
    expect(p).toContain("no text");
  });
});

describe("style presets", () => {
  it("keeps full-length style prompts", () => {
    const style = "modern American comic book art, bold clean ink lines, vibrant flat colors, dynamic shading";
    const r = validateRequest({ idea: "a long enough idea", style });
    expect(r.ok && r.value.style).toBe(style);
  });
});
