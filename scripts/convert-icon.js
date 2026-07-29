// Convert the user's favnm3ESD.jpeg to a 256x256 transparent PNG icon.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "favnm3ESD.jpeg");
const OUT = path.join(__dirname, "..", "icon.png");
const SIZE = 256;

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Source image not found:", SRC);
    process.exit(1);
  }

  // Read as raw RGBA, resize to square with cover (crop), then remove near-white background.
  const { data, info } = await sharp(SRC)
    .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.from(data);
  const threshold = 250; // treat very light pixels as background
  let transparentCount = 0;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const a = px[i + 3];

    // If the pixel is very light and opaque, make it transparent.
    if (r > threshold && g > threshold && b > threshold && a > 200) {
      px[i + 3] = 0;
      transparentCount++;
    }
  }

  await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(OUT);

  console.log(`Wrote ${OUT} (${info.width}x${info.height}), made ${transparentCount} background pixels transparent.`);
}

main().catch(err => { console.error(err); process.exit(1); });
