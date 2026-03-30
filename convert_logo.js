#!/usr/bin/env node
/**
 * Convierte logo-vantix.svg → logo-vantix-auth0.png (512×512, fondo transparente).
 * Requiere: npm install sharp
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const SVG_NAME = 'logo-vantix.svg';
const OUT_NAME = 'logo-vantix-auth0.png';

async function main() {
  const svgPath = path.join(ROOT, SVG_NAME);
  if (!fs.existsSync(svgPath)) {
    console.error(`No se encontró ${SVG_NAME} en ${ROOT}`);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);
  const outPath = path.join(ROOT, OUT_NAME);

  // density alta para rasterizar el SVG con margen antes del resize a 512
  await sharp(svgBuffer, { density: 400 })
    .resize(512, 512, {
      fit: 'contain',
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({
      compressionLevel: 9,
      effort: 10,
    })
    .toFile(outPath);

  const stat = fs.statSync(outPath);
  console.log(`OK → ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
