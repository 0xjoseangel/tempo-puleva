// Versión de la presentación para llevar en un pendrive: se abre con doble clic (file://), sin internet ni servidor.
// Uso: npm run pendrive  → pendrive/Tempo/ (copiad esa carpeta entera al pendrive y abrid «Tempo - presentación.html»)
import { build } from 'vite';
import { readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const out = resolve(root, 'pendrive/Tempo');
const page = 'Tempo - presentación.html';

// En file:// una imagen de otro archivo «ensucia» el canvas y WebGL no puede usarla de textura: el logo va como data URI
const svg = await readFile(resolve(root, 'public/brand/puleva-logo.svg'));
const logos = { 'brand/puleva-logo.svg': `data:image/svg+xml;base64,${svg.toString('base64')}` };

await rm(out, { recursive: true, force: true });
await build({
  root,
  base: './',
  logLevel: 'warn',
  plugins: [
    {
      name: 'logo-inline',
      transform(code, id) {
        if (id.endsWith('/src/brand.js')) return code.replace('img.src = import.meta.env.BASE_URL + src;', `img.src = ${JSON.stringify(logos)}[src] || import.meta.env.BASE_URL + src;`);
      },
    },
  ],
  build: {
    outDir: out,
    emptyOutDir: true,
    assetsInlineLimit: 1e8, // fuentes dentro del CSS
    modulePreload: false,
    rolldownOptions: { input: resolve(root, 'pitch.html'), output: { codeSplitting: false } },
    chunkSizeWarningLimit: 5000,
  },
});

// Los <script type="module" src> externos no cargan desde file://: se meten JS y CSS dentro del HTML
let html = await readFile(resolve(out, 'pitch.html'), 'utf8');
const assets = resolve(out, 'assets');
for (const [, tag, src] of [...html.matchAll(/(<script type="module" crossorigin src="\.\/assets\/([^"]+)"><\/script>)/g)]) {
  const js = (await readFile(resolve(assets, src), 'utf8')).replaceAll('</script', '<\\/script');
  html = html.replace(tag, () => `<script type="module">${js}</script>`);
}
for (const [, tag, href] of [...html.matchAll(/(<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+)">)/g)]) {
  const css = await readFile(resolve(assets, href), 'utf8');
  html = html.replace(tag, () => `<style>${css}</style>`);
}
if (/\.\/assets\//.test(html)) throw new Error('Quedan referencias a assets/ sin incrustar');
await writeFile(resolve(out, page), html);
await rm(resolve(out, 'pitch.html'));
await rm(assets, { recursive: true, force: true });
await rm(resolve(out, 'brand/README.md'), { force: true });

await writeFile(
  resolve(out, 'LEEME.txt'),
  `Tempo by Puleva · presentación

1. Copiad la carpeta «Tempo» entera (el HTML solo no basta: necesita pitch/ y brand/).
2. Abrid «${page}» con Chrome o Edge (doble clic). No hace falta internet.
3. F: pantalla completa · → o clic: siguiente · R: reserva · N: notas.

Si el ordenador no deja abrirlo, el plan B es la web: 0xjoseangel.github.io/tempo-puleva/pitch.html
`,
);
console.log(`  ${out}/`);
for (const f of await readdir(out)) console.log(`    ${f}`);
