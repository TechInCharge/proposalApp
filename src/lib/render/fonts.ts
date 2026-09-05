import { readFileSync } from "node:fs";
import path from "node:path";

let cached: string | null = null;

/**
 * @font-face CSS for Inter, embedded as a base64 data URI so generated
 * documents render with the real typeface regardless of what's installed on
 * the machine doing the rendering (dev box, CI, serverless). Single variable
 * font file — one @font-face with a weight range covers 400/500/600/700.
 */
export function interFontFaceCss(): string {
  if (cached !== null) return cached;
  try {
    const fontPath = path.join(
      process.cwd(),
      "src/lib/render/assets/fonts/Inter-Variable.woff2",
    );
    const base64 = readFileSync(fontPath).toString("base64");
    cached = `@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(data:font/woff2;base64,${base64}) format('woff2');
}`;
  } catch {
    cached = ""; // font asset missing — fall back to the system font stack
  }
  return cached;
}
