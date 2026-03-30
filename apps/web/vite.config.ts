import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
const appVersion = pkg.version;

function writePublicVersionJson() {
  const out = join(__dirname, 'public', 'version.json');
  writeFileSync(out, `${JSON.stringify({ version: appVersion }, null, 2)}\n`);
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vantix-version-json',
      buildStart() {
        writePublicVersionJson();
      },
    },
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
  },
});
