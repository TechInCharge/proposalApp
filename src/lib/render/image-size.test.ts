import { describe, it, expect } from "vitest";
import { probeImageSize, logoInsertSize } from "./image-size";

// A real 2x2 PNG (base64), reused from compose-docx.test.ts's TINY_PNG.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJnADFmH76aAAAAAElFTkSuQmCC",
  "base64",
);

describe("probeImageSize", () => {
  it("reads width/height from a PNG", () => {
    expect(probeImageSize(TINY_PNG)).toEqual({ width: 2, height: 2 });
  });

  it("returns null for unrecognized bytes", () => {
    expect(probeImageSize(Buffer.from("not an image"))).toBeNull();
  });

  it("returns null for a too-short buffer", () => {
    expect(probeImageSize(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});

describe("logoInsertSize", () => {
  it("caps height and scales width proportionally for a tall image", () => {
    // Build a minimal fake PNG header claiming 200x400.
    const buf = Buffer.alloc(24);
    buf[0] = 0x89;
    buf.write("PNG", 1, "ascii");
    buf.writeUInt32BE(200, 16);
    buf.writeUInt32BE(400, 20);
    expect(logoInsertSize(buf, 72)).toEqual({ width: 36, height: 72 });
  });

  it("leaves a small image at its real size", () => {
    expect(logoInsertSize(TINY_PNG, 72)).toEqual({ width: 2, height: 2 });
  });

  it("falls back to a square box when dimensions can't be read", () => {
    expect(logoInsertSize(Buffer.from("nope"), 72)).toEqual({ width: 72, height: 72 });
  });
});
