// Mint Breeze Theme - extension icon generator (zero dependencies, pure Node + zlib).
// Produces a 256x256 transparent PNG: an elegant mint leaf with a breeze curl.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 256, H = 256;
const buf = Buffer.alloc(W * H * 4, 0); // transparent RGBA

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

function setPx(x, y, r, g, b, a) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 4;
  const sa = a / 255, da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  buf[i]     = clamp((r * sa + buf[i]     * da * (1 - sa)) / oa);
  buf[i + 1] = clamp((g * sa + buf[i + 1] * da * (1 - sa)) / oa);
  buf[i + 2] = clamp((b * sa + buf[i + 2] * da * (1 - sa)) / oa);
  buf[i + 3] = clamp(oa * 255);
}

function disc(cx, cy, rad, r, g, b, a) {
  const rad2 = rad * rad;
  const x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad);
  const y0 = Math.floor(cy - rad), y1 = Math.ceil(cy + rad);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= rad2) {
        const edge = d2 > (rad - 1) * (rad - 1) ? (rad - Math.sqrt(d2)) : 1;
        setPx(x, y, r, g, b, a * edge);
      }
    }
  }
}

function thickLine(x0, y0, x1, y1, color, rad) {
  const [r, g, b] = color;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.ceil(len) * 2;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disc(x0 + dx * t, y0 + dy * t, rad, r, g, b, 255);
  }
}

function bezierQuad(t, p0, p1, p2) {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

// ---- Elegant mint leaf with curl/breeze decoration ----
function fillLeaf() {
  const mintLight = hex("#A8E8DA");
  const mintMid   = hex("#8FD8C8");
  const mintDark  = hex("#62C7B5");
  const white     = hex("#FFFFFF");

  // Leaf center spine as a quadratic bezier curve.
  // Control points place the leaf diagonally from lower-left curl area to upper-right tip.
  const p0 = { x: 78, y: 184 };  // base
  const p1 = { x: 118, y: 138 }; // control
  const p2 = { x: 188, y: 74 };  // tip

  const N = 600;
  const spine = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    spine.push({
      x: bezierQuad(t, p0.x, p1.x, p2.x),
      y: bezierQuad(t, p0.y, p1.y, p2.y),
    });
  }

  // Width function along spine: wider in the middle, tapering at both ends.
  function leafWidth(t) {
    // t roughly 0..1 along spine
    const belly = Math.sin(t * Math.PI); // 0..1..0
    return (12 + 74 * belly * (1 - 0.25 * t)) * (1 - 0.35 * t);
  }

  // Build two edge curves
  const leftEdge = [];
  const rightEdge = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const s = spine[i];
    let tx, ty;
    if (i === 0) {
      tx = spine[1].x - spine[0].x;
      ty = spine[1].y - spine[0].y;
    } else {
      tx = spine[i].x - spine[i - 1].x;
      ty = spine[i].y - spine[i - 1].y;
    }
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len; // normal
    const w = leafWidth(t);
    leftEdge.push({ x: s.x + nx * w, y: s.y + ny * w });
    rightEdge.push({ x: s.x - nx * w, y: s.y - ny * w });
  }

  // Fill leaf body: scanline-ish ray casting along local normal
  for (let i = 0; i < N; i++) {
    const s = spine[i];
    const s2 = spine[i + 1];
    const cx = (s.x + s2.x) / 2;
    const cy = (s.y + s2.y) / 2;
    const t = i / N;
    let tx = s2.x - s.x, ty = s2.y - s.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    const w = leafWidth(t) + 2;

    // sample across the width
    const samples = Math.ceil(w * 2.5);
    for (let k = -samples; k <= samples; k++) {
      const f = k / samples; // -1..1
      const alpha = Math.max(0, Math.min(1, 1 - f * f));
      const x = cx + nx * f * w;
      const y = cy + ny * f * w;
      // gradient: lighter at top/outer edge, darker near base/inner
      const gradT = (f + 1) / 2 * 0.55 + (1 - t) * 0.45;
      const rr = mintLight[0] + (mintDark[0] - mintLight[0]) * gradT;
      const gg = mintLight[1] + (mintDark[1] - mintLight[1]) * gradT;
      const bb = mintLight[2] + (mintDark[2] - mintLight[2]) * gradT;
      setPx(x, y, rr, gg, bb, 255 * alpha);
    }
  }

  // Main vein (white highlight curve slightly off spine)
  for (let i = 3; i <= N - 12; i++) {
    const t = i / N;
    const s = spine[i];
    const width = 1.6 * (1 - t * 0.4);
    disc(s.x - 2, s.y - 2, width, white[0], white[1], white[2], 210);
  }

  // Subtle side veins
  const sideVeins = [
    { t: 0.45, len: 28, angle: 0.55 },
    { t: 0.62, len: 38, angle: 0.45 },
    { t: 0.78, len: 30, angle: 0.38 },
  ];
  for (const v of sideVeins) {
    const idx = Math.floor(v.t * N);
    const s = spine[idx];
    let tx = spine[idx + 1].x - spine[idx].x;
    let ty = spine[idx + 1].y - spine[idx].y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    // outward from right side of leaf
    const ax = nx * Math.cos(v.angle) + (tx / len) * Math.sin(v.angle);
    const ay = ny * Math.cos(v.angle) + (ty / len) * Math.sin(v.angle);
    thickLine(s.x, s.y, s.x + ax * v.len, s.y + ay * v.len, white, 1.2);
  }

  // Breeze curl / vine at the base, flowing from lower-left
  drawCurl(p0.x, p0.y, mintMid, mintDark);
}

function drawCurl(bx, by, c1, c2) {
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // logarithmic spiral-ish curl
    const ang = t * 2.9 - 0.6;
    const rad = 46 * Math.exp(-1.35 * t);
    const x = bx + rad * Math.cos(ang) - 18;
    const y = by + rad * Math.sin(ang) * 0.85 + 8;
    const w = 7 * (1 - t * 0.55);
    const rr = c1[0] + (c2[0] - c1[0]) * t;
    const gg = c1[1] + (c2[1] - c1[1]) * t;
    const bb = c1[2] + (c2[2] - c1[2]) * t;
    disc(x, y, w, rr, gg, bb, 180 * (1 - t * 0.3));
  }
  // second faint outer echo
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * 3.0 - 0.4;
    const rad = 58 * Math.exp(-1.25 * t);
    const x = bx + rad * Math.cos(ang) - 22;
    const y = by + rad * Math.sin(ang) * 0.85 + 12;
    const w = 5 * (1 - t * 0.6);
    disc(x, y, w, c1[0], c1[1], c1[2], 90 * (1 - t * 0.4));
  }
}

// ---- PNG encoding ----
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG() {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

fillLeaf();
const out = path.join(__dirname, "..", "icon.png");
fs.writeFileSync(out, encodePNG());
console.log("Wrote", out);
