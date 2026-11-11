// Genera los PDF a tamaño real de etiquetas y caja con Chrome headless (protocolo DevTools).
// Uso: npm run print:pdf  → print/out/etiquetas-botes.pdf y print/out/caja-pack.pdf
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const out = resolve(import.meta.dirname, 'out');
const profile = resolve(out, '.chrome');
// chrome-headless-shell que descarga Remotion (video/), o el que indiques en CHROME
const chrome =
  process.env.CHROME ||
  resolve(root, 'video/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell');
const PORT = 9333;

await mkdir(out, { recursive: true });
const server = await createServer({ root, logLevel: 'error', server: { port: 5199, hmr: false, ws: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = spawn(chrome, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

// Cliente mínimo del protocolo DevTools
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const [target] = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter((t) => t.type === 'page');
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((ok, ko) => ((ws.onopen = ok), (ws.onerror = ko)));
      let id = 0;
      const pending = new Map();
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id);
      };
      return (method, params = {}) =>
        new Promise((ok, ko) => {
          pending.set(++id, (m) => (m.error ? ko(new Error(m.error.message)) : ok(m.result)));
          ws.send(JSON.stringify({ id, method, params }));
        });
    } catch {
      await sleep(200);
    }
  }
  throw new Error('No se pudo conectar con Chrome');
}

try {
  const send = await connect();
  for (const [page, file] of [['etiquetas', 'etiquetas-botes.pdf'], ['caja', 'caja-pack.pdf']]) {
    await send('Page.navigate', { url: `${base}print/${page}.html` });
    // La página marca body[data-ready] cuando ha cargado fuentes y logo y ha dibujado todo
    for (let i = 0; ; i++) {
      const { result } = await send('Runtime.evaluate', { expression: 'document.body?.dataset.ready === "1" && document.fonts.status === "loaded"' });
      if (result.value) break;
      if (i > 150) throw new Error(`${page}.html no terminó de dibujarse`);
      await sleep(200);
    }
    const { data } = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    await writeFile(resolve(out, file), Buffer.from(data, 'base64'));
    console.log(`  ${file}`);
  }
} finally {
  browser.kill();
  await server.close();
  await rm(profile, { recursive: true, force: true });
}
