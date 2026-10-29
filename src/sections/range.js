import * as THREE from 'three';
import { products } from '../data/products.js';
import { createStage, fitCamera } from '../three/renderer.js';
import { createShot } from '../three/bottle.js';
import { createControls, enablePicking } from '../three/interaction.js';
import { openSheet } from '../ui/sheet.js';
import { gsap, reduced } from './fx.js';

// Gama completa: botones accesibles por teclado (siempre) + estantería 3D (diferida).
export function initRangeList() {
  const list = document.querySelector('.range__list');
  list.innerHTML = products
    .map((p) => `<li><button class="btn" type="button" data-id="${p.id}" style="--rc: var(--c-${p.id})">${p.name}</button></li>`)
    .join('');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) openSheet(products.find((p) => p.id === b.dataset.id));
  });
}

export function initRange() {
  const container = document.getElementById('range-stage');
  if (!container) return;
  const stage = createStage(container, {
    label: `Estantería con los cinco shots: ${products.map((p) => p.name).join(', ')}`,
  });

  const gap = 5.2;
  const shelfW = gap * products.length + 2;
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(shelfW, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: 0.7 }),
  );
  shelf.position.y = -0.3;
  shelf.receiveShadow = shelf.castShadow = true;
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(shelfW, 0.6, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1b2a41, roughness: 0.5 }),
  );
  edge.position.set(0, -0.3, 3.06);
  stage.scene.add(shelf, edge);
  stage.floor.visible = false;

  const shots = products.map((p, i) => {
    const s = createShot(p, stage.renderer);
    s.position.x = (i - (products.length - 1) / 2) * gap;
    stage.scene.add(s);
    return s;
  });
  const h = shots[0].userData.height;
  const target = new THREE.Vector3(0, h * 0.45, 0);
  const controls = createControls(stage, target);
  controls.minAzimuthAngle = -Math.PI * 0.25;
  controls.maxAzimuthAngle = Math.PI * 0.25;
  stage.onResize(() => {
    fitCamera(stage.camera, { width: shelfW, height: h * 1.3, target, dir: new THREE.Vector3(0, 0.3, 1), padding: 1.02 });
    controls.update();
  });
  enablePicking(stage, shots, { onSelect: (p) => openSheet(p) });

  // Al entrar en pantalla, los shots aparecen uno a uno
  if (!reduced()) {
    shots.forEach((s) => s.scale.setScalar(0.001));
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      shots.forEach((s, i) => gsap.to(s.scale, { x: 1, y: 1, z: 1, duration: 0.8, delay: i * 0.1, ease: 'back.out(2)' }));
    }, { threshold: 0.3 });
    io.observe(container);
  }
}
