// Genera la voz en off de cada escena con ElevenLabs y escribe src/vo-manifest.json
// con la duración de cada audio, que el vídeo usa para ajustar las escenas.
// Uso: npm run voz            (solo voz)
//      npm run voz:musica     (voz + música de fondo con Eleven Music)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scenes, musicPrompt } from '../src/script.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const API = 'https://api.elevenlabs.io/v1';
const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const model = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const withMusic = process.argv.includes('--music');

if (!key) {
  console.error('Falta ELEVENLABS_API_KEY en video/.env');
  process.exit(1);
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

function duration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(out.toString().trim());
}

await mkdir(`${root}public/vo`, { recursive: true });
const prev = JSON.parse(await readFile(`${root}src/vo-manifest.json`, 'utf8'));
const manifest = { scenes: {}, music: prev.music };
const force = process.argv.includes('--force');

for (const [i, s] of scenes.entries()) {
  // Si el texto y la voz no han cambiado, se reutiliza el audio (no gasta créditos)
  const old = prev.scenes[s.id];
  if (!force && old?.text === s.vo && old?.voice === voice && existsSync(`${root}public/${old.file}`)) {
    manifest.scenes[s.id] = old;
    console.log(`Voz "${s.id}": sin cambios`);
    continue;
  }
  process.stdout.write(`Voz "${s.id}"… `);
  const audio = await post(`/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    text: s.vo,
    model_id: model,
    // Contexto vecino para que la entonación fluya entre escenas
    previous_text: scenes[i - 1]?.vo,
    next_text: scenes[i + 1]?.vo,
    voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
  });
  const file = `vo/${s.id}.mp3`;
  await writeFile(`${root}public/${file}`, audio);
  manifest.scenes[s.id] = { file, text: s.vo, voice, seconds: duration(`${root}public/${file}`) };
  console.log(`${manifest.scenes[s.id].seconds.toFixed(2)} s`);
}

if (withMusic) {
  const total = Object.values(manifest.scenes).reduce((t, s) => t + s.seconds, 0) + 8;
  process.stdout.write('Música… ');
  try {
    const audio = await post('/music', { prompt: musicPrompt, music_length_ms: Math.round(total * 1000) });
    await writeFile(`${root}public/music.mp3`, audio);
    manifest.music = 'music.mp3';
    console.log('ok');
  } catch (err) {
    console.log(`no disponible (${err.message.slice(0, 120)}). Sigo sin música.`);
  }
}

await writeFile(`${root}src/vo-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log('Listo: src/vo-manifest.json actualizado. Ahora: npm run studio  o  npm run render');
