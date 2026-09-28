/* ============================================================
   collateral/lib/png.mjs — a small PNG reader for the render's pixel checks (no dependencies).

   decodePng(buf) → { w, h, ch, data } for 8-bit grayscale, RGB and RGBA non-interlaced PNGs (what Chromium's
   screenshots are). lumaStats(img) → { mean, sd, min, max } of the Rec. 709 luma, used by the audit to fail a
   device viewport that is a flat fill (nothing painted in it).
   ============================================================ */
import zlib from "node:zlib";

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let off = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), kind = buf.toString("latin1", off + 4, off + 8), body = buf.subarray(off + 8, off + 8 + len);
    if (kind === "IHDR") { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
    off += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error(`PNG depth ${depth}, interlace ${interlace}: unsupported`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (!ch) throw new Error(`PNG color type ${type}: unsupported`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, data = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? data[row + x - ch] : 0, b = y ? data[row - stride + x] : 0, c = x >= ch && y ? data[row - stride + x - ch] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      data[row + x] = v & 255;
    }
  }
  return { w, h, ch, data };
}

export function lumaStats({ w, h, ch, data }) {
  let n = 0, s = 0, s2 = 0, min = 255, max = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * ch, Y = ch >= 3 ? 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2] : data[o];
    n++; s += Y; s2 += Y * Y; if (Y < min) min = Y; if (Y > max) max = Y;
  }
  const mean = s / n;
  return { mean, sd: Math.sqrt(Math.max(0, s2 / n - mean * mean)), min, max };
}
