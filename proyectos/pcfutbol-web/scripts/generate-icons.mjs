/**
 * Generate PNG icons from SVG for PWA/Google Play
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

const svg = readFileSync(join(publicDir, 'favicon.svg'));

const SIZES = [48, 72, 96, 128, 144, 192, 384, 512];

async function main() {
  console.log('🎨 Generating PNG icons from SVG...\n');
  
  for (const size of SIZES) {
    const filename = `icon-${size}x${size}.png`;
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, filename));
    console.log(`  ✅ ${filename}`);
  }
  
  // Also generate a maskable icon (with padding for safe zone)
  // Maskable icons need ~10% padding on each side
  const maskableSize = 512;
  const innerSize = Math.round(maskableSize * 0.8);
  const padding = Math.round((maskableSize - innerSize) / 2);
  
  const innerSvg = await sharp(svg)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();
  
  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 15, g: 20, b: 25, alpha: 1 } // #0f1419
    }
  })
    .composite([{ input: innerSvg, left: padding, top: padding }])
    .png()
    .toFile(join(iconsDir, 'maskable-512x512.png'));
  console.log('  ✅ maskable-512x512.png');
  
  console.log('\n✅ All icons generated!');
}

main().catch(console.error);
