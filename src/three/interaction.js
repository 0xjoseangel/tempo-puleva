import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { setLift } from './bottle.js';

/** Pantallas táctiles: no capturamos el arrastre para no bloquear el scroll de la página. */
export const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

/** OrbitControls con límites pensados para mirar envases sin perderlos. */
export function createControls(stage, target = new THREE.Vector3(0, 4, 0)) {
  const controls = new OrbitControls(stage.camera, stage.canvas);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minAzimuthAngle = -Math.PI * 0.6;
  controls.maxAzimuthAngle = Math.PI * 0.6;
  controls.enableZoom = false; // la rueda sigue desplazando la página
  if (isCoarsePointer()) {
    controls.enabled = false;
    stage.canvas.style.touchAction = 'pan-y';
  }
  stage.onTick(() => controls.update());
  return controls;
}

/**
 * Hover (eleva el envase) y clic (callback) sobre una lista de shots.
 * Distingue clic de arrastre para no abrir la ficha al rotar.
 */
export function enablePicking(stage, shots, { onSelect } = {}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pickables = shots.flatMap((s) => s.userData.pickables);
  const lift = new Map(shots.map((s) => [s, { t: 0 }]));
  let hovered = null;
  let down = null;

  function pick(e) {
    const r = stage.canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object : null;
  }

  function setHover(shot) {
    if (shot === hovered) return;
    if (hovered) animateLift(hovered, 0);
    hovered = shot;
    if (shot) animateLift(shot, 1);
    stage.canvas.style.cursor = shot ? 'pointer' : 'grab';
  }

  function animateLift(shot, to) {
    const state = lift.get(shot);
    gsap.to(state, {
      t: to,
      duration: 0.45,
      ease: 'power3.out',
      onUpdate: () => setLift(shot, state.t),
    });
  }

  stage.canvas.style.cursor = 'grab';
  stage.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !e.buttons) setHover(pick(e)?.userData.shot ?? null);
  });
  stage.canvas.addEventListener('pointerleave', () => setHover(null));
  stage.canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  stage.canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const obj = pick(e);
    const shot = obj?.userData.shot;
    if (shot && onSelect) onSelect(shot.userData.product, shot, obj.userData.part);
  });

  return { setHover };
}
