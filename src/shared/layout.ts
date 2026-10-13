export interface Cell { col: number; row: number; colSpan: number; rowSpan: number }
export interface PageLayout { columns: number; rows: number; cells: Cell[] }

/** Classic comic grid layouts for 1-6 panels on a 2-column page. */
export function layoutFor(count: number): PageLayout {
  const c = (col: number, row: number, colSpan = 1, rowSpan = 1): Cell => ({ col, row, colSpan, rowSpan });
  switch (count) {
    case 1: return { columns: 1, rows: 1, cells: [c(1, 1)] };
    case 2: return { columns: 1, rows: 2, cells: [c(1, 1), c(1, 2)] };
    case 3: return { columns: 2, rows: 2, cells: [c(1, 1, 2), c(1, 2), c(2, 2)] };
    case 4: return { columns: 2, rows: 2, cells: [c(1, 1), c(2, 1), c(1, 2), c(2, 2)] };
    case 5: return { columns: 2, rows: 3, cells: [c(1, 1, 2), c(1, 2), c(2, 2), c(1, 3), c(2, 3)] };
    case 6: return { columns: 2, rows: 3, cells: [c(1, 1), c(2, 1), c(1, 2), c(2, 2), c(1, 3), c(2, 3)] };
    default: {
      if (count < 1) throw new Error("A page needs at least one panel");
      const rows = Math.ceil(count / 2);
      return { columns: 2, rows, cells: Array.from({ length: count }, (_, i) => c((i % 2) + 1, Math.floor(i / 2) + 1)) };
    }
  }
}

/** Image aspect for a cell, used to pick generation width/height. */
export function cellSize(layout: PageLayout, cell: Cell): { width: number; height: number } {
  const wide = cell.colSpan === layout.columns && layout.columns > 1;
  if (layout.cells.length === 1) return { width: 768, height: 1024 };
  if (wide || layout.columns === 1) return { width: 1024, height: 576 };
  return { width: 768, height: 768 };
}
