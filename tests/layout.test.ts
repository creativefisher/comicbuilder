import { describe, expect, it } from "vitest";
import { cellSize, layoutFor } from "../src/shared/layout";

describe("layoutFor", () => {
  for (let n = 1; n <= 8; n++) {
    it(`fills the grid exactly once for ${n} panels`, () => {
      const L = layoutFor(n);
      expect(L.cells).toHaveLength(n);
      const seen = new Set<string>();
      for (const c of L.cells) {
        expect(c.col + c.colSpan - 1).toBeLessThanOrEqual(L.columns);
        expect(c.row + c.rowSpan - 1).toBeLessThanOrEqual(L.rows);
        for (let x = c.col; x < c.col + c.colSpan; x++) for (let y = c.row; y < c.row + c.rowSpan; y++) {
          const k = `${x},${y}`; expect(seen.has(k)).toBe(false); seen.add(k);
        }
      }
    });
  }
  it("uses a wide splash panel for 3", () => expect(layoutFor(3).cells[0].colSpan).toBe(2));
  it("rejects zero panels", () => expect(() => layoutFor(0)).toThrow());
  it("sizes wide cells landscape", () => {
    const L = layoutFor(3);
    expect(cellSize(L, L.cells[0]).width).toBeGreaterThan(cellSize(L, L.cells[0]).height);
    expect(cellSize(L, L.cells[1])).toEqual({ width: 768, height: 768 });
  });
});
