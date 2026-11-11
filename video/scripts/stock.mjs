// Descarga de Pexels un clip por escena (según src/stock.js) y escribe src/stock-manifest.json.
// Sin PEXELS_API_KEY, solo indexa los clips que hayas puesto a mano en public/stock/<escena>.mp4.
// Uso: npm run stock              (solo las escenas que faltan o cuya búsqueda ha cambiado)
//      npm run stock -- --force   (vuelve a descargarlas todas)
//      npm run stock -- mix noche (solo esas escenas)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stock } from '../src/stock.js';
import { scenes } from '../src/script.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const key = process.env.PEXELS_API_KEY;
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

const manifestFile = `${root}src/stock-manifest.json`;
const manifest = existsSync(manifestFile) ? JSON.parse(await readFile(manifestFile, 'utf8')) : {};

// Sin clave: se usan los clips descargados a mano en public/stock/<escena>.mp4
if (!key) {
  await mkdir(`${root}public/stock`, { recursive: true });
  const files = await readdir(`${root}public/stock`);
  for (const id of Object.keys(stock)) {
    const video = (n) => /\.(mp4|mov|webm)$/i.test(n);
    const mk = stock[id].mixkit;
    // Primero el clip de Mixkit con su nombre original; si no, <escena>.mp4
    const f =
      (mk && files.find((n) => video(n) && new RegExp(`-${mk}(-|\\.)`).test(n))) ||
      files.find((n) => video(n) && n.replace(/\.[^.]+$/, '') === id);
    if (!f) {
      console.log(`${id}: falta${mk ? ` el clip de Mixkit ${mk} (https://mixkit.co/free-stock-video/ y busca ${mk})` : ''} o public/stock/${id}.mp4`);
      delete manifest[id];
      continue;
    }
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${root}public/stock/${f}`]);
    manifest[id] = { file: `stock/${f}`, seconds: Number(out.toString().trim()), start: stock[id].start ?? 0 };
    console.log(`${id}: ${f} (${manifest[id].seconds.toFixed(1)} s)`);
  }
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Listo: src/stock-manifest.json actualizado.');
  process.exit(0);
}

async function api(path) {
  const res = await fetch(`https://api.pexels.com${path}`, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

// Mejor archivo horizontal: 1920 de ancho si existe; si no, el más cercano por encima de 1280
function bestFile(video) {
  const files = video.video_files.filter((f) => f.file_type === 'video/mp4' && f.width > f.height);
  return (
    files.find((f) => f.width === 1920) ||
    files.filter((f) => f.width >= 1280).sort((a, b) => a.width - b.width)[0] ||
    files.sort((a, b) => b.width - a.width)[0]
  );
}

await mkdir(`${root}public/stock`, { recursive: true });

for (const [id, cfg] of Object.entries(stock)) {
  if (only.length && !only.includes(id)) continue;
  const prev = manifest[id];
  const sig = JSON.stringify(cfg);
  if (!force && prev?.sig === sig && existsSync(`${root}public/${prev.file}`)) {
    console.log(`${id}: ya descargado (${prev.url})`);
    continue;
  }
  const minSeconds = (scenes.find((s) => s.id === id)?.minSeconds ?? 4) + (cfg.start ?? 0);
  let video;
  let alternatives = [];
  if (cfg.id) {
    video = await api(`/videos/videos/${cfg.id}`);
  } else {
    const q = new URLSearchParams({ query: cfg.query, orientation: 'landscape', size: 'medium', per_page: '15' });
    const { videos } = await api(`/videos/search?${q}`);
    const valid = videos.filter((v) => v.duration >= minSeconds && bestFile(v));
    if (!valid.length) {
      console.log(`${id}: sin resultados válidos para "${cfg.query}". Cambia la búsqueda en src/stock.js`);
      continue;
    }
    video = valid[Math.min(cfg.pick ?? 0, valid.length - 1)];
    alternatives = valid.slice(0, 6).map((v, i) => `${i}: ${v.url}`);
  }
  const file = bestFile(video);
  process.stdout.write(`${id}: ${video.url} (${file.width}×${file.height}, ${video.duration} s)… `);
  const res = await fetch(file.link);
  if (!res.ok) throw new Error(`Descarga ${res.status}`);
  const out = `stock/${id}.mp4`;
  await writeFile(`${root}public/${out}`, Buffer.from(await res.arrayBuffer()));
  manifest[id] = { file: out, sig, url: video.url, author: video.user?.name, seconds: video.duration, start: cfg.start ?? 0 };
  console.log('ok');
  if (alternatives.length > 1) console.log(`   Alternativas (pon pick: N en src/stock.js):\n   ${alternatives.join('\n   ')}`);
}

await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log('Listo: src/stock-manifest.json actualizado. Revísalo en: npm run studio');
