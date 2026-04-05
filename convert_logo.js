#!/usr/bin/env node
/**
 * Convierte logo-vidya.svg (raíz del repo) → apps/web/public/logo-vidya.png (512×512, fondo transparente).
 * URL pública única para Auth0: {tu-dominio}/logo-vidya.png
 * Requiere: npm install sharp (en la raíz del monorepo)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = __dirname;
const SVG_NAME = 'logo-vidya.svg';
const OUT_REL = path.join('apps', 'web', 'public', 'logo-vidya.png');

async function main() {
  const svgPath = path.join(ROOT, SVG_NAME);
  if (!fs.existsSync(svgPath)) {
    console.error(`No se encontró ${SVG_NAME} en ${ROOT}`);
    process.exit(1);
  }

  const outPath = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const svgBuffer = fs.readFileSync(svgPath);

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
