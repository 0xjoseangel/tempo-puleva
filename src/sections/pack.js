import * as THREE from 'three';
import { coreRange, packs, productById } from '../data/products.js';
import { createStage, fitCamera } from '../three/renderer.js';
import { createShot } from '../three/bottle.js';
import { createPackBox } from '../three/box.js';
import { createControls } from '../three/interaction.js';
import { openSheet } from '../ui/sheet.js';
import { gsap, reduced } from './fx.js';

// Pack Tempo de 4: "Pack Ritmo" (uno de cada) o "Pack ×4" de una sola gama.
export function initPack() {
  const section = document.getElementById('pack');
  const rangesEl = section.querySelector('.pack__ranges');
  const contentsEl = section.querySelector('.pack__contents');
  const note = section.querySelector('.pack__note');
  const ritmo = packs.find((p) => p.id === 'ritmo');
  const single = packs.find((p) => p.id === 'single');
  let mode = 'ritmo';
  let range = coreRange[0];

  rangesEl.innerHTML = coreRange
    .map((id) => `<button class="btn" type="button" data-id="${id}" style="--rc: var(--c-${id}-ink)" aria-pressed="${id === range}">${productById[id].range}</button>`)
    .join('');

  // --- 3D ---
  const container = document.getElementById('pack-stage');
  let box, stage, controls;
  const pool = {}; // shots reutilizables: pool[id] = [shot, shot, ...]
  let placed = [];
  if (container) {
    stage = createStage(container, { label: 'Caja abierta del pack Tempo con cuatro shots' });
    box = createPackBox();
    stage.scene.add(box.group);
    const target = new THREE.Vector3(0, 5.6, 0);
    controls = createControls(stage, target);
    controls.minAzimuthAngle = -Math.PI * 0.3;
    controls.maxAzimuthAngle = Math.PI * 0.3;
    stage.onResize(() => {
      fitCamera(stage.camera, { width: box.width, height: 13, target, dir: new THREE.Vector3(0.12, 0.38, 1), padding: 1.18 });
      controls.update();
    });
  }

  function shotFor(id, i) {
    pool[id] ||= [];
    if (!pool[id][i]) {
      const s = createShot(productById[id], stage.renderer);
      s.userData.contact.visible = false;
      pool[id][i] = s;
    }
    return pool[id][i];
  }

  let picking = null;
  function fill(ids) {
    if (!stage) return;
    const old = placed;
    const next = ids.map((id, i) => shotFor(id, i));
    const fly = reduced() ? 0 : 1;
    old.forEach((s, i) => {
      if (next.includes(s)) return;
      gsap.to(s.position, { y: 18, duration: 0.45 * fly, delay: i * 0.05 * fly, ease: 'power2.in', onComplete: () => stage.scene.remove(s) });
    });
    next.forEach((s, i) => {
      gsap.killTweensOf(s.position);
      s.position.set(box.slotX[i], 18, 0);
      s.rotation.y = 0;
      stage.scene.add(s);
      gsap.to(s.position, { y: 0.18, duration: 1 * fly, delay: (0.3 + i * 0.12) * fly, ease: 'bounce.out' });
    });
    placed = next;
    // Re-registrar picking sobre los shots actuales
    picking?.abort();
    picking = new AbortController();
    pickOn(next, picking.signal);
  }

  function pickOn(list, signal) {
    const raycaster = new THREE.Raycaster();
    const v = new THREE.Vector2();
    let down = null;
    const pick = (e) => {
      const r = stage.canvas.getBoundingClientRect();
      v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(v, stage.camera);
      return raycaster.intersectObjects(list.flatMap((s) => s.userData.pickables), false)[0]?.object.userData.shot;
    };
    stage.canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }), { signal });
    stage.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const s = pick(e);
      if (s) openSheet(s.userData.product);
    }, { signal });
    stage.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && !e.buttons) stage.canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
    }, { signal });
  }

  function render() {
    const ids = mode === 'ritmo' ? ritmo.items : Array(single.units).fill(range);
    rangesEl.hidden = mode !== 'single';
    for (const b of rangesEl.children) b.setAttribute('aria-pressed', String(b.dataset.id === range));

    const counts = ids.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
    contentsEl.innerHTML = Object.entries(counts)
      .map(([id, n]) => {
        const p = productById[id];
        return `<li style="--c: var(--c-${id})"><strong>${n} × ${p.name}</strong>&nbsp;· ${p.moment} · ${p.benefit}</li>`;
      })
      .join('');
    if (!reduced()) gsap.from(contentsEl.children, { x: -20, opacity: 0, duration: 0.4, stagger: 0.06 });

    if (box) {
      const p = productById[range];
      box.print(
        mode === 'ritmo'
          ? { title: ritmo.label, subtitle: ritmo.subtitle, colors: ritmo.items.map((id) => productById[id].color) }
          : { title: `Pack ${p.range}`, subtitle: `${p.moment} · ${p.benefit}`, colors: [p.color] },
      );
      fill(ids);
    }
    note.textContent = '';
  }

  section.querySelectorAll('input[name="pack-mode"]').forEach((r) =>
    r.addEventListener('change', () => {
      mode = r.value;
      render();
    }),
  );
  rangesEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    range = b.dataset.id;
    render();
  });

  section.querySelector('.pack__buy').addEventListener('click', () => {
    note.textContent = '¡Gracias! Tempo es una propuesta académica: todavía no está a la venta.';
    if (reduced() || !stage) return;
    // Celebración: los shots saltan en la caja
    placed.forEach((s, i) => {
      gsap.to(s.position, { y: 2.2, duration: 0.25, delay: i * 0.08, yoyo: true, repeat: 1, ease: 'power2.out' });
      gsap.fromTo(s.rotation, { y: 0 }, { y: Math.PI * 2, duration: 0.7, delay: i * 0.08, ease: 'power2.inOut' });
    });
  });

  render();
}
