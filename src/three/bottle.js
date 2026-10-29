import * as THREE from 'three';
import { createLabelTexture } from './label.js';
import { createPowderCap } from './powderCap.js';

// Unidades: 1 = 1 cm aprox. Todas las gamas comparten el mismo envase.
const SHOT_ML = 100;

function dimensions(volumeMl = SHOT_ML) {
  const s = Math.cbrt(volumeMl / 60);
  const r = 1.8 * Math.pow(s, 0.6);
  return {
    r,
    bodyH: 6 * Math.pow(s, 1.8),
    bottomR: r * 0.32,
    shoulderH: r * 0.62,
    neckR: r * 0.5,
    neckH: r * 0.32,
    capH: r * 0.62,
  };
}

// fillY: corta el perfil a esa altura con una superficie plana (nivel de líquido)
function bottleProfile(d, inset = 0, fillY = Infinity) {
  const pts = [];
  const R = d.r - inset;
  const br = d.bottomR;
  const y0 = inset;
  pts.push(new THREE.Vector2(0.001, y0));
  // Esquina inferior redondeada
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - br + br * Math.cos(a), y0 + br + br * Math.sin(a)));
  }
  // Hombro (curva cúbica hasta el cuello)
  const shoulder = new THREE.CubicBezierCurve(
    new THREE.Vector2(R, d.bodyH),
    new THREE.Vector2(R, d.bodyH + d.shoulderH * 0.6),
    new THREE.Vector2(d.neckR - inset, d.bodyH + d.shoulderH * 0.45),
    new THREE.Vector2(d.neckR - inset, d.bodyH + d.shoulderH),
  );
  pts.push(...shoulder.getPoints(18));
  if (fillY === Infinity) return pts;
  const cut = pts.filter((p) => p.y < fillY);
  const last = cut[cut.length - 1];
  cut.push(new THREE.Vector2(last.x, fillY), new THREE.Vector2(0.001, fillY));
  return cut;
}

function neckProfile(d) {
  const y = d.bodyH + d.shoulderH;
  const top = y + d.neckH;
  const n = d.neckR;
  return [
    new THREE.Vector2(n, y),
    new THREE.Vector2(n, top - 0.12),
    new THREE.Vector2(n * 1.08, top - 0.08),
    new THREE.Vector2(n * 1.08, top),
    new THREE.Vector2(n * 0.86, top),
  ];
}

function capGeometry(d) {
  const y0 = d.bodyH + d.shoulderH + 0.05;
  const y1 = y0 + d.capH;
  const R = d.neckR * 1.18;
  const cr = R * 0.22;
  const pts = [
    new THREE.Vector2(R * 0.94, y0),
    new THREE.Vector2(R, y0 + 0.06),
    new THREE.Vector2(R, y1 - cr),
  ];
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - cr + cr * Math.cos(a), y1 - cr + cr * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(0.001, y1));
  const geo = new THREE.LatheGeometry(pts, 180);

  // Estrías verticales en el lateral del tapón
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y > y0 + 0.1 && v.y < y1 - cr) {
      const ang = Math.atan2(v.z, v.x);
      const k = 1 + 0.018 * Math.cos(ang * 36);
      v.x *= k;
      v.z *= k;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return { geo, top: y1 };
}

/**
 * Crea un shot completo. Devuelve un THREE.Group con el origen en la base.
 * group.userData: { product, height, radius, inner, contact, pickables, liquid, powderCap }
 */
export function createShot(product, renderer) {
  const d = dimensions();
  const group = new THREE.Group();
  group.name = product.id;
  const tint = new THREE.Color(product.color);

  // Inner: grupo que se eleva en hover sin mover la sombra de contacto
  const inner = new THREE.Group();
  group.add(inner);

  // Envase: plástico/vidrio esmerilado premium
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    // Con tapón dosificador, plástico más claro para ver caer el polvo
    roughness: product.cap === 'powder' ? 0.12 : 0.32,
    metalness: 0,
    transmission: 0.85,
    thickness: 0.6,
    ior: 1.45,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    attenuationColor: tint.clone().lerp(new THREE.Color(0xffffff), 0.7),
    attenuationDistance: 3,
  });
  const shell = new THREE.Mesh(new THREE.LatheGeometry(bottleProfile(d), 96), shellMat);
  const neck = new THREE.Mesh(new THREE.LatheGeometry(neckProfile(d), 96), shellMat);
  shell.castShadow = neck.castShadow = true;

  // Líquido interior (visible a través del hombro y el cuello)
  // Con tapón dosificador se deja aire en el hombro para ver caer el polvo
  const fillY = product.cap === 'powder' ? d.bodyH + d.shoulderH * 0.12 : Infinity;
  const liquid = new THREE.Mesh(
    new THREE.LatheGeometry(bottleProfile(d, 0.08, fillY), 64),
    new THREE.MeshStandardMaterial({ color: product.liquid, roughness: 0.4 }),
  );
  if (fillY === Infinity) liquid.scale.y = 0.96;

  // Etiqueta envolvente
  const labelBottom = d.bottomR + 0.12;
  const labelH = d.bodyH - labelBottom - 0.08;
  const labelR = d.r * 1.006;
  const aspect = (2 * Math.PI * labelR) / labelH;
  const labelTex = createLabelTexture(product, aspect, renderer);
  const label = new THREE.Mesh(
    // thetaStart = π  → u = 0.5 (centro del diseño) queda mirando a +Z (cámara)
    new THREE.CylinderGeometry(labelR, labelR, labelH, 128, 1, true, Math.PI, Math.PI * 2),
    new THREE.MeshPhysicalMaterial({
      map: labelTex,
      roughness: 0.55,
      clearcoat: 0.15,
      clearcoatRoughness: 0.5,
    }),
  );
  label.position.y = labelBottom + labelH / 2;
  label.castShadow = true;

  inner.add(liquid, shell, neck, label);
  const pickables = [shell, label, neck];
  let top;
  let powderCap = null;

  if (product.cap === 'powder') {
    // Tapón dosificador con la creatina en polvo
    powderCap = createPowderCap(d, product, d.bodyH + d.shoulderH + 0.05, fillY);
    inner.add(powderCap.group);
    pickables.push(...powderCap.pickables);
    top = powderCap.top;
  } else {
    // Tapón del color de la gama
    const capData = capGeometry(d);
    const cap = new THREE.Mesh(
      capData.geo,
      new THREE.MeshPhysicalMaterial({
        color: product.color,
        roughness: 0.38,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
      }),
    );
    cap.castShadow = true;
    inner.add(cap);
    pickables.push(cap);
    top = capData.top;
  }

  // Sombra de contacto suave (no se eleva con el envase)
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(d.r * 4.2, d.r * 4.2),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.01;
  contact.renderOrder = -1;
  group.add(contact);

  group.userData = { product, height: top, radius: d.r, inner, contact, pickables, liquid: liquid.material, powderCap };
  for (const m of pickables) m.userData.shot = group;
  return group;
}

/** Tapón dosificador: pulsar, liberar el polvo y agitar. Devuelve la línea de tiempo (o null). */
export function activatePowder(shot, { reduced = false } = {}) {
  const { powderCap, liquid, inner } = shot.userData;
  if (!powderCap || shot.userData.activated) return null;
  shot.userData.activated = true;
  return powderCap.activate({ liquid, shake: inner, reduced });
}

export function resetPowder(shot) {
  const { powderCap, liquid, product } = shot.userData;
  if (!powderCap) return;
  shot.userData.activated = false;
  powderCap.reset(liquid, product.liquid);
}

let _contactTex;
function contactShadowTexture() {
  if (_contactTex) return _contactTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(27,42,65,0.55)');
  g.addColorStop(0.35, 'rgba(27,42,65,0.25)');
  g.addColorStop(1, 'rgba(27,42,65,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  _contactTex = new THREE.CanvasTexture(c);
  return _contactTex;
}

/** Eleva / baja el envase (hover). t entre 0 y 1. */
export function setLift(shot, t) {
  const { inner, contact, height } = shot.userData;
  inner.position.y = t * height * 0.08;
  contact.material.opacity = 0.55 - t * 0.2;
  contact.scale.setScalar(1 + t * 0.12);
}
