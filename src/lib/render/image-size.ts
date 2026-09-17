/**
 * Minimal PNG/JPEG pixel-dimension reader — no dependency, just enough to
 * size a logo image sensibly when inserting it into a composed .docx (see
 * compose-proposal.ts). GIF/WEBP/SVG and anything else fall back to a fixed
 * square box; logos are near-universally PNG or JPEG in practice, and a
 * slightly-off aspect ratio for a rare exotic format is a cosmetic gap, not
 * a correctness one.
 */
export function probeImageSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      // Markers with no payload length (RST0-7, SOI, TEM) — skip past just the marker.
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (marker === 0xd9) break; // EOI
      const segLength = buf.readUInt16BE(offset + 2);
      // SOFn markers (frame headers) carry the image dimensions; DHT/JPG/DAC
      // (C4/C8/CC) share the 0xC0-0xCF range but aren't frame headers.
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
      }
      offset += 2 + segLength;
    }
  }
  return null;
}

/** A sensible insertion size for a logo: real aspect ratio, capped to maxHeight. */
export function logoInsertSize(buf: Buffer, maxHeight = 72): { width: number; height: number } {
  const dims = probeImageSize(buf);
  if (!dims || dims.width <= 0 || dims.height <= 0) return { width: maxHeight, height: maxHeight };
  if (dims.height <= maxHeight) return dims;
  const scale = maxHeight / dims.height;
  return { width: Math.round(dims.width * scale), height: maxHeight };
}
