import * as THREE from 'three';
import { gsap } from 'gsap';
import { products, productById, packs } from '../data/products.js';
import { createStage } from '../three/renderer.js';
import { createShot, activatePowder, resetPowder } from '../three/bottle.js';
import { createPackBox } from '../three/box.js';

const W = 1920;
const H = 1080;
const HIDDEN_Y = -40;
const cronos = packs.find((p) => p.id === 'cronos');

/**
 * Escena 3D persistente detrás de las diapositivas: los cinco shots y la caja
 * del Pack Cronos se mueven entre composiciones (setScene) con gsap.
 */
export function createPitchStage(container) {
  const stage = createStage(container, { background: null, fov: 30, label: 'Gama Tempo by Puleva en 3D' });
  const { scene, camera, renderer } = stage;

  // La luz por defecto cubre ±12; la gama ocupa más ancho
  const key = scene.children.find((o) => o.isDirectionalLight);
  Object.assign(key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.mapSize.set(2048, 2048);

  const shots = Object.fromEntries(products.map((p) => [p.id, createShot(p, renderer)]));
  const order = products.map((p) => p.id);
  order.forEach((id, i) => {
    const s = shots[id];
    s.position.y = HIDDEN_Y;
    s.userData.ry = 0;
    s.userData.phase = i * 1.3;
    scene.add(s);
  });

  const box = createPackBox();
  box.print({ title: cronos.label, subtitle: cronos.subtitle, colors: cronos.items.map((id) => productById[id].color) });
  box.group.position.y = HIDDEN_Y;
  scene.add(box.group);

  // Cámara en coordenadas esféricas alrededor de un objetivo
  const cam = { tx: 0, ty: 9.5, dist: 62, el: 0.22, az: 0 };
  const target = new THREE.Vector3();
  function placeCamera() {
    target.set(cam.tx, cam.ty, 0);
    camera.position.set(
      cam.tx + cam.dist * Math.sin(cam.az) * Math.cos(cam.el),
      cam.ty + cam.dist * Math.sin(cam.el),
      cam.dist * Math.cos(cam.az) * Math.cos(cam.el),
    );
    camera.lookAt(target);
  }

  let sway = 1;
  stage.onTick((dt, t) => {
    placeCamera();
    for (const id of order) {
      const s = shots[id];
      s.visible = s.position.y > HIDDEN_Y + 8;
      s.rotation.y = s.userData.ry + Math.sin(t * 0.45 + s.userData.phase) * 0.22 * sway;
    }
    box.group.visible = box.group.position.y > HIDDEN_Y + 8;
  });

  const lineup = (gap, x0 = 0) => Object.fromEntries(order.map((id, i) => [id, { x: x0 + (i - 2) * gap, y: 0, z: 0, ry: 0 }]));

  const layouts = {
    hidden: () => ({ shots: {}, cam: { tx: 0, ty: 7, dist: 50, el: 0.2, az: 0 } }),
    lineup: () => ({ shots: lineup(5.4), cam: { tx: 0, ty: 8.6, dist: 64, el: 0.22, az: 0 } }),
    range: () => ({ shots: lineup(6.2), cam: { tx: 0, ty: 6.5, dist: 54, el: 0.2, az: 0 } }),
    end: () => ({ shots: lineup(5.4), cam: { tx: 10, ty: 14.3, dist: 90, el: 0.16, az: 0 } }),
    hero: (id) => ({ shots: { [id]: { x: 0, y: 0, z: 0, ry: -0.35 } }, cam: { tx: -6.5, ty: 6, dist: 30, el: 0.16, az: 0.12 } }),
    pack: () => ({
      shots: Object.fromEntries(cronos.items.map((id, i) => [id, { x: box.slotX[i], y: 0.18, z: 0, ry: 0, drop: true }])),
      box: true,
      cam: { tx: -9.5, ty: 5.5, dist: 44, el: 0.38, az: 0.14 },
    }),
  };

  let current = '';
  function setScene(name, { instant = false } = {}) {
    if (name === current) return;
    const [kind, arg] = name.split(':');
    const L = layouts[kind](arg);
    const d = instant ? 0 : 1.4;
    current = name;

    gsap.to(cam, { ...L.cam, duration: d, ease: 'power3.inOut', overwrite: true });

    order.forEach((id, i) => {
      const s = shots[id];
      const to = L.shots[id];
      gsap.killTweensOf([s.position, s.userData, s.scale]);
      s.userData.contact.visible = !to?.drop;
      if (!to) {
        if (s.position.y <= HIDDEN_Y + 1) return;
        gsap.to(s.position, { y: HIDDEN_Y, duration: d * 0.6, delay: i * 0.03 * (d && 1), ease: 'power2.in' });
        if (s.userData.activated) gsap.delayedCall(d * 0.6, () => resetPowder(s));
        return;
      }
      const hidden = s.position.y <= HIDDEN_Y + 1;
      if (to.drop) {
        // Entra en la caja desde arriba, como en la web
        if (hidden) s.position.set(to.x, 24, to.z);
        gsap.to(s.position, { x: to.x, z: to.z, duration: d * 0.6, ease: 'power2.out' });
        gsap.to(s.position, { y: to.y, duration: d * 0.9, delay: d * (0.35 + i * 0.1), ease: 'bounce.out' });
      } else {
        if (hidden) s.position.set(to.x, HIDDEN_Y, to.z);
        gsap.to(s.position, { x: to.x, y: to.y, z: to.z, duration: d, delay: i * 0.05 * (d && 1), ease: 'power3.inOut' });
      }
      gsap.to(s.userData, { ry: to.ry, duration: d, ease: 'power2.inOut' });
    });

    gsap.killTweensOf([box.group.position, box.group.scale]);
    if (L.box) {
      if (box.group.position.y <= HIDDEN_Y + 1) box.group.scale.setScalar(0.6);
      gsap.to(box.group.position, { y: 0, duration: d * 0.8, ease: 'power3.out' });
      gsap.to(box.group.scale, { x: 1, y: 1, z: 1, duration: d, ease: 'back.out(1.4)' });
    } else if (box.group.position.y > HIDDEN_Y + 1) {
      gsap.to(box.group.position, { y: HIDDEN_Y, duration: d * 0.6, ease: 'power2.in' });
    }
  }

  // Punto de la base de un shot en coordenadas del lienzo (1920 × 1080)
  const v = new THREE.Vector3();
  function project(id) {
    v.copy(shots[id].position).project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  }

  return {
    setScene,
    project,
    onTick: stage.onTick,
    setPixelRatio: (r) => renderer.setPixelRatio(r),
    setSway: (s) => (sway = s),
    powder(id) {
      const s = shots[id];
      if (s.userData.activated) resetPowder(s);
      return activatePowder(s);
    },
    resetPowder: (id) => resetPowder(shots[id]),
    debug: () => ({ cam: [cam.tx, cam.ty, cam.dist, cam.el, cam.az], pos: camera.position.toArray(), shots: order.map((id) => [id, shots[id].visible, shots[id].position.toArray().map((n) => +n.toFixed(1)), shots[id].scale.x]), box: [box.group.visible, box.group.position.y] }),
  };
}
