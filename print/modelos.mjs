// Genera los modelos 3D imprimibles (.3mf) de los shots y de la caja del pack,
// con las mismas medidas que la web (src/three/bottle.js y src/three/box.js).
// Uso: npm run print:3mf  → print/out/*.3mf  (unidades: mm, Z hacia arriba)
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dimensions } from '../src/three/bottle.js';
import { BOX } from '../src/three/box.js';
import { products } from '../src/data/products.js';

const OUT = resolve(import.meta.dirname, 'out');
const MM = 10; // la web trabaja en cm
const SEGS = 216; // segmentos del torno (múltiplo de las 36 estrías)
const FIT = 0.15; // holgura del encaje tapón-cuello (mm)
const WHITE = '#F4F1EA';
const CLEAR = '#DDEEEA';

/* ---------- Geometría ---------- */

// Revoluciona un perfil [[r, z], …] (mm) que empieza y acaba en el eje (r = 0).
// ribs(r, z, θ) permite deformar el radio (estrías). Devuelve una malla cerrada.
function revolve(profile, ribs) {
  const verts = [];
  const tris = [];
  const ring = [];
  for (const [r, z] of profile) {
    if (r === 0) {
      ring.push(verts.length);
      verts.push([0, 0, z]);
      continue;
    }
    ring.push(verts.length);
    for (let i = 0; i < SEGS; i++) {
      const t = (i / SEGS) * Math.PI * 2;
      const rr = ribs ? ribs(r, z, t) : r;
      verts.push([rr * Math.cos(t), rr * Math.sin(t), z]);
    }
  }
  const at = (k, i) => (profile[k][0] === 0 ? ring[k] : ring[k] + (i % SEGS));
  for (let k = 0; k < profile.length - 1; k++) {
    for (let i = 0; i < SEGS; i++) {
      const a = at(k, i), b = at(k, i + 1), c = at(k + 1, i + 1), d = at(k + 1, i);
      if (a !== b) tris.push([a, b, c]);
      if (c !== d) tris.push([a, c, d]);
    }
  }
  return orient({ verts, tris });
}

// Asegura normales hacia fuera (volumen con signo positivo)
function orient(mesh) {
  let v = 0;
  for (const [a, b, c] of mesh.tris) {
    const [p, q, r] = [mesh.verts[a], mesh.verts[b], mesh.verts[c]];
    v += p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0]);
  }
  if (v < 0) mesh.tris = mesh.tris.map(([a, b, c]) => [a, c, b]);
  return mesh;
}

function bezier(p0, p1, p2, p3, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n, u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}

function arc(cx, cy, r, a0, a1, n) {
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + ((i + 1) / n) * (a1 - a0);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

const d = Object.fromEntries(Object.entries(dimensions()).map(([k, v]) => [k, v * MM]));
const neckTop = d.bodyH + d.shoulderH + d.neckH;
const socketDepth = d.neckH - 0.05 * MM;
const ribbed = (amp, z0, z1) => (r, z, t) => (z > z0 && z < z1 ? r * (1 + amp * Math.cos(t * 36)) : r);

// Envase: cuerpo + hombro + cuello liso (el reborde del cuello queda oculto bajo el tapón)
function bottleBody() {
  const { r: R, bottomR: br, bodyH, shoulderH, neckR: n } = d;
  return revolve([
    [0, 0],
    [R - br, 0],
    ...arc(R - br, br, br, -Math.PI / 2, 0, 12),
    [R, bodyH],
    ...bezier([R, bodyH], [R, bodyH + shoulderH * 0.6], [n, bodyH + shoulderH * 0.45], [n, bodyH + shoulderH], 24),
    [n, neckTop],
    [0, neckTop],
  ]);
}

// Tapón con hueco para el cuello. Origen en su base.
function cap() {
  const R = d.neckR * 1.18, cr = R * 0.22, h = d.capH, s = d.neckR + FIT;
  return revolve(
    [
      [0, socketDepth],
      [s, socketDepth],
      [s, 0],
      [R * 0.94, 0],
      [R, 0.06 * MM],
      [R, h - cr],
      ...arc(R - cr, h - cr, cr, 0, Math.PI / 2, 10).slice(0, -1),
      [0, h],
    ],
    ribbed(0.03, 1, h - cr),
  );
}

// Tapón dosificador (Fuerza + Ritmo) en tres piezas: aro, cámara transparente y pulsador
function powderCap() {
  const R = d.neckR * 1.22, s = d.neckR + FIT;
  const collarH = d.capH * 0.5, chamberH = d.capH * 0.95, btnH = d.capH * 0.42, cr = R * 0.25;
  const depth = collarH - 1.2; // deja 1,2 mm de techo sobre el cuello
  return {
    collar: revolve(
      [[0, depth], [s, depth], [s, 0], [R * 0.94, 0], [R, 0.5], [R, collarH - 0.4], [R * 0.95, collarH], [0, collarH]],
      ribbed(0.03, 0.8, collarH - 0.6),
    ),
    chamber: revolve([[0, 0], [R * 0.9, 0], [R * 0.9, chamberH], [0, chamberH]]),
    button: revolve([[0, 0], [R * 0.96, 0], [R, 0.4], [R, btnH - cr], ...arc(R - cr, btnH - cr, cr, 0, Math.PI / 2, 10).slice(0, -1), [0, btnH]]),
  };
}

// Pasa una geometría de three (Y arriba, cm) a malla soldada (Z arriba, mm)
function fromThree(geo) {
  const g = mergeVertices((geo.index ? geo.toNonIndexed() : geo).deleteAttribute('normal').deleteAttribute('uv'), 1e-4);
  const p = g.attributes.position, idx = g.index.array;
  const verts = [];
  for (let i = 0; i < p.count; i++) verts.push([p.getX(i) * MM, -p.getZ(i) * MM, p.getY(i) * MM]);
  const tris = [];
  for (let i = 0; i < idx.length; i += 3) if (idx[i] !== idx[i + 1] && idx[i + 1] !== idx[i + 2] && idx[i] !== idx[i + 2]) tris.push([idx[i], idx[i + 1], idx[i + 2]]);
  return orient({ verts, tris });
}

// Caja-bandeja: piezas que se tocan sin solaparse (una sola pieza al laminar)
function packBox() {
  const { slots, slotW, depth, backH, frontH, T } = BOX;
  const W = slots * slotW + T * 2;
  const box = (w, h, dd, x, y, z) => new THREE.BoxGeometry(w, h, dd).translate(x, y, z);
  const parts = [
    box(W, T, depth, 0, T / 2, 0),
    box(W - 2 * T, backH - T, T, 0, T + (backH - T) / 2, -depth / 2 + T / 2),
    box(W - 2 * T, frontH - T, T, 0, T + (frontH - T) / 2, depth / 2 - T / 2),
  ];
  for (let i = 1; i < slots; i++) {
    const h = frontH * 0.8 - T;
    parts.push(box(T * 0.6, h, depth - T * 2, -W / 2 + T + i * slotW, T + h / 2, 0));
  }
  // Laterales en escalón (mismo perfil que la web), sobre la base
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, T);
  shape.lineTo(depth / 2, T);
  shape.lineTo(depth / 2, frontH);
  shape.bezierCurveTo(depth * 0.1, frontH, depth * 0.05, backH, -depth / 2, backH);
  shape.closePath();
  for (const sx of [-1, 1]) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 32 });
    g.rotateY(-Math.PI / 2);
    g.translate(sx > 0 ? W / 2 : -W / 2 + T, 0, 0);
    parts.push(g);
  }
  return parts.map(fromThree).reduce(join3, { verts: [], tris: [] });
}

function join3(a, b) {
  const o = a.verts.length;
  return { verts: a.verts.concat(b.verts), tris: a.tris.concat(b.tris.map((t) => t.map((i) => i + o))) };
}

/* ---------- 3MF ---------- */

const f = (n) => +n.toFixed(4);

// Malla cerrada y manifold: cada arista la comparten dos triángulos en sentidos opuestos
function check(name, { tris }) {
  const edges = new Map();
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const key = `${t[k]}_${t[(k + 1) % 3]}`;
    edges.set(key, (edges.get(key) || 0) + 1);
  }
  let bad = 0;
  for (const [key, n] of edges) {
    const [a, b] = key.split('_');
    if (n !== 1 || edges.get(`${b}_${a}`) !== 1) bad++;
  }
  if (bad) throw new Error(`${name}: ${bad} aristas no manifold`);
}

// objects: [{ name, mesh, color, at: [x, y, z], flip }]
async function write3mf(file, objects) {
  for (const o of objects) check(o.name, o.mesh);
  const colors = [...new Set(objects.map((o) => o.color))];
  const objXml = objects
    .map((o, i) => {
      const vs = o.mesh.verts.map(([x, y, z]) => `<vertex x="${f(x)}" y="${f(y)}" z="${f(z)}"/>`).join('');
      const ts = o.mesh.tris.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('');
      return `<object id="${i + 2}" name="${o.name}" type="model" pid="1" pindex="${colors.indexOf(o.color)}"><mesh><vertices>${vs}</vertices><triangles>${ts}</triangles></mesh></object>`;
    })
    .join('\n');
  const items = objects
    .map((o, i) => {
      const [x, y, z] = o.at;
      // flip: girado 180° sobre X (tapones boca abajo, mejor para imprimir)
      const m = o.flip ? `1 0 0 0 -1 0 0 0 -1 ${f(x)} ${f(y)} ${f(z)}` : `1 0 0 0 1 0 0 0 1 ${f(x)} ${f(y)} ${f(z)}`;
      return `<item objectid="${i + 2}" transform="${m}"/>`;
    })
    .join('');
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="es-ES" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${file.replace('.3mf', '')}</metadata>
<metadata name="Designer">Tempo by Puleva · Hackathon UGR × Lactalis Puleva 2026</metadata>
<resources>
<basematerials id="1">${colors.map((c) => `<base name="${c}" displaycolor="${c}FF"/>`).join('')}</basematerials>
${objXml}
</resources>
<build>${items}</build>
</model>`;

  const dir = await mkdtemp(join(tmpdir(), '3mf-'));
  await mkdir(join(dir, '_rels'));
  await mkdir(join(dir, '3D'));
  await writeFile(
    join(dir, '[Content_Types].xml'),
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
  );
  await writeFile(
    join(dir, '_rels/.rels'),
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
  );
  await writeFile(join(dir, '3D/3dmodel.model'), model);
  await rm(join(OUT, file), { force: true });
  execFileSync('zip', ['-X', '-q', '-r', join(OUT, file), '[Content_Types].xml', '_rels', '3D'], { cwd: dir });
  await rm(dir, { recursive: true });
  console.log(`  ${file}`);
}

/* ---------- Salida ---------- */

await mkdir(OUT, { recursive: true });
const gap = d.r * 2 + 8;

for (const p of products) {
  const objects = [{ name: `${p.name} · envase`, mesh: bottleBody(), color: WHITE, at: [0, 0, 0] }];
  if (p.cap === 'powder') {
    const pc = powderCap();
    objects.push(
      { name: `${p.name} · aro del tapón`, mesh: pc.collar, color: p.color, at: [gap, 0, 0] },
      { name: `${p.name} · cámara (transparente)`, mesh: pc.chamber, color: CLEAR, at: [gap, gap * 0.75, 0] },
      { name: `${p.name} · pulsador`, mesh: pc.button, color: p.color, at: [0, gap * 0.75, 0] },
    );
  } else {
    objects.push({ name: `${p.name} · tapón`, mesh: cap(), color: p.color, at: [gap, 0, d.capH], flip: true });
  }
  await write3mf(`bote-${p.range.toLowerCase().replace(/\s*\+\s*/g, '-').normalize('NFD').replace(/[^\w-]/g, '')}.3mf`, objects);
}

await write3mf('caja-pack.3mf', [{ name: 'Caja pack Tempo', mesh: packBox(), color: '#F3EBDD', at: [0, 0, 0] }]);
