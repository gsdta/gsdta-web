import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';
import pngToIco from 'png-to-ico';

const root = path.resolve(process.cwd());
const publicDir = path.join(root, 'public');
const defaultSrc = path.join(publicDir, 'images', 'logo.png');
const altSrc = path.join(root, 'assets', 'images', 'logo.png');

async function ensureDir(p) {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function generate() {
  const srcPath = (await fileExists(defaultSrc)) ? defaultSrc : (await fileExists(altSrc) ? altSrc : null);
  if (!srcPath) {
    throw new Error('Logo not found. Expected at public/images/logo.png or assets/images/logo.png');
  }

  const out16 = path.join(publicDir, 'favicon-16x16.png');
  const out32 = path.join(publicDir, 'favicon-32x32.png');
  const out48 = path.join(publicDir, 'favicon-48x48.png');
  const outApple = path.join(publicDir, 'apple-touch-icon.png');
  const outIco = path.join(publicDir, 'favicon.ico');

  const img = await Jimp.read(srcPath);
  // Background: ensure square by covering into square canvas if needed
  const maxSide = Math.max(img.bitmap.width, img.bitmap.height);
  const square = new Jimp({ width: maxSide, height: maxSide, color: 0x00000000 });
  square.composite(img, (maxSide - img.bitmap.width) / 2, (maxSide - img.bitmap.height) / 2);

  const i16 = square.clone().resize({ w: 16, h: 16, mode: Jimp.RESIZE_BILINEAR });
  const i32 = square.clone().resize({ w: 32, h: 32, mode: Jimp.RESIZE_BILINEAR });
  const i48 = square.clone().resize({ w: 48, h: 48, mode: Jimp.RESIZE_BILINEAR });
  const i180 = square.clone().resize({ w: 180, h: 180, mode: Jimp.RESIZE_BICUBIC });

  await ensureDir(out16); await i16.write(out16);
  await ensureDir(out32); await i32.write(out32);
  await ensureDir(out48); await i48.write(out48);
  await ensureDir(outApple); await i180.write(outApple);

  const icoBuffer = await pngToIco([out16, out32, out48]);
  await fs.writeFile(outIco, icoBuffer);

  console.log('Favicon assets generated:');
  console.log('-', path.relative(root, out16));
  console.log('-', path.relative(root, out32));
  console.log('-', path.relative(root, out48));
  console.log('-', path.relative(root, outApple));
  console.log('-', path.relative(root, outIco));
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});

