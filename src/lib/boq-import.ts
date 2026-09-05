import ExcelJS from "exceljs";
import { boqItemInput, type BoqItemInput } from "@/lib/validators";

export interface BoqParseResult {
  rows: BoqItemInput[];
  skipped: number;
}

const HEADER_ALIASES: Record<keyof BoqItemInput, string[]> = {
  partNumber: ["part number", "part no", "part", "part#", "sku", "item code", "code"],
  description: ["description", "desc", "item", "item description", "details"],
  quantity: ["quantity", "qty", "qnty", "count", "amount"],
};

function normalise(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Map a header row to column indexes (0-based). */
function mapHeaders(headerCells: unknown[]): Partial<Record<keyof BoqItemInput, number>> {
  const map: Partial<Record<keyof BoqItemInput, number>> = {};
  headerCells.forEach((cell, idx) => {
    const h = normalise(cell);
    if (!h) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      keyof BoqItemInput,
      string[],
    ][]) {
      if (map[field] === undefined && aliases.includes(h)) {
        map[field] = idx;
      }
    }
  });
  return map;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rowsToItems(
  rows: unknown[][],
): BoqParseResult {
  if (rows.length === 0) return { rows: [], skipped: 0 };

  // Find the header row: first row containing a "description"-ish cell.
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => HEADER_ALIASES.description.includes(normalise(c))),
  );
  if (headerIdx === -1) headerIdx = 0;

  const map = mapHeaders(rows[headerIdx]);
  const descCol = map.description ?? 0;

  const out: BoqItemInput[] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const description = String(r[descCol] ?? "").trim();
    if (!description) {
      if (r.some((c) => String(c ?? "").trim())) skipped++;
      continue;
    }
    const candidate = {
      partNumber: map.partNumber !== undefined ? String(r[map.partNumber] ?? "").trim() : "",
      description,
      quantity:
        map.quantity !== undefined ? Math.round(toNumber(r[map.quantity])) || 1 : 1,
    };
    const parsed = boqItemInput.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
    else skipped++;
  }

  return { rows: out, skipped };
}

export async function parseBoqBuffer(
  buffer: Buffer,
  filename: string,
): Promise<BoqParseResult> {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const wb = new ExcelJS.Workbook();

  if (isCsv) {
    // ExcelJS csv.read expects a stream.
    const { Readable } = await import("node:stream");
    await wb.csv.read(Readable.from(buffer));
  } else {
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    await wb.xlsx.load(ab);
  }

  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], skipped: 0 };

  const rows: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[]; // 1-based; index 0 is undefined
    rows.push(values.slice(1));
  });

  return rowsToItems(rows);
}
