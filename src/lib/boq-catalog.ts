export interface BoqCatalogRow {
  id: string;
  partNumber: string;
  description: string;
}

/**
 * De-duplicate a set of BoQ rows into catalog entries. Key is
 * (partNumber, description), both trimmed and compared case-insensitively.
 * Rows with a blank description are dropped.
 */
export function normaliseBoqCatalogRows(
  rows: { partNumber?: string | null; description?: string | null }[],
): { partNumber: string; description: string }[] {
  const seen = new Set<string>();
  const out: { partNumber: string; description: string }[] = [];
  for (const r of rows) {
    const description = (r.description ?? "").trim();
    if (!description) continue;
    const partNumber = (r.partNumber ?? "").trim();
    const key = `${partNumber.toLowerCase()} ${description.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ partNumber, description });
  }
  return out;
}
