import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * Tapón dosificador: aro roscado + cámara transparente con la creatina en polvo,
 * sello de aluminio y pulsador. Al pulsar, el sello se rompe y el polvo cae al líquido.
 * d: dimensiones del envase (ver bottle.js). y0: altura donde arranca el tapón.
 * liquidTop: nivel del líquido, donde terminan de caer las partículas.
 */
export function createPowderCap(d, product, y0, liquidTop) {
  const group = new THREE.Group();
  const color = new THREE.Color(product.color);
  const R = d.neckR * 1.22;
  const capMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 });

  // Aro roscado (estrías) sobre el cuello
  const collarH = d.capH * 0.5;
  const collar = new THREE.Mesh(ribbedTube(R, collarH), capMat);
  collar.position.y = y0;

  // Cámara transparente
  const chamberH = d.capH * 0.95;
  const chamberY = y0 + collarH;
  const chamber = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.9, R * 0.9, chamberH, 64, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: color.clone().lerp(new THREE.Color(0xffffff), 0.75),
      roughness: 0.04,
      transmission: 1,
      thickness: 0.15,
      ior: 1.5,
      clearcoat: 1,
      side: THREE.DoubleSide,
    }),
  );
  chamber.position.y = chamberY + chamberH / 2;

  // Polvo (creatina) dentro de la cámara
  const powderH = chamberH * 0.62;
  const grain = grainTexture();
  const powderMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grain, bumpMap: grain, bumpScale: 0.6, roughness: 1 });
  const powder = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.84, R * 0.84, powderH, 48), powderMat);
  powder.position.y = chamberY + 0.04 + powderH / 2;
  // Superficie del polvo ligeramente irregular
  const top = powder.geometry.attributes.position;
  for (let i = 0; i < top.count; i++) {
    if (top.getY(i) > powderH / 2 - 0.001) top.setY(i, top.getY(i) + (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.06);
  }
  powder.geometry.computeVertexNormals();

  // Sello de aluminio entre cámara y botella
  const seal = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.88, 48),
    new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
  );
  seal.rotation.x = -Math.PI / 2;
  seal.position.y = chamberY + 0.02;

  // Pulsador
  const buttonY = chamberY + chamberH;
  const button = new THREE.Group();
  button.position.y = buttonY;
  const btnH = d.capH * 0.42;
  const cr = R * 0.25;
  const pts = [new THREE.Vector2(R * 0.96, 0), new THREE.Vector2(R, 0.04), new THREE.Vector2(R, btnH - cr)];
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - cr + cr * Math.cos(a), btnH - cr + cr * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(0.001, btnH));
  const buttonMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), capMat);
  // Disco blanco en la cara superior para indicar "pulsa aquí"
  const press = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.5, 48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  );
  press.rotation.x = -Math.PI / 2;
  press.position.y = btnH + 0.005;
  button.add(buttonMesh, press);

  // Partículas de polvo que caen al líquido
  const N = 480;
  const fallFrom = chamberY;
  const fallTo = liquidTop + 0.03;
  const seeds = Array.from({ length: N }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.sqrt(Math.random()) * d.neckR * 0.7,
    delay: Math.random() * 0.55,
    spread: 0.6 + Math.random() * 0.8,
  }));
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)),
    new THREE.PointsMaterial({ color: 0xfdfcf8, size: 0.13, sizeAttenuation: true }),
  );
  particles.visible = false;
  particles.frustumCulled = false;

  group.add(collar, chamber, powder, seal, button, particles);
  for (const m of [collar, chamber, buttonMesh, press]) m.userData.part = 'capButton';

  const state = { press: 0, fall: 0, powder: 1 };

  function apply() {
    button.position.y = buttonY - state.press * btnH * 0.45;
    seal.scale.setScalar(Math.max(0.001, 1 - state.press * 1.4));
    powder.scale.y = Math.max(0.001, state.powder);
    powder.position.y = chamberY + 0.04 + (powderH * state.powder) / 2;
    const pos = particles.geometry.attributes.position;
    particles.visible = state.fall > 0 && state.fall < 1;
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      const t = THREE.MathUtils.clamp((state.fall - s.delay) / 0.45, 0, 1);
      const e = t * t; // cae acelerando
      const r = s.r * (1 + e * s.spread);
      pos.setXYZ(i, Math.cos(s.a) * r, t <= 0 || t >= 1 ? -999 : fallFrom - (fallFrom - fallTo) * e, Math.sin(s.a) * r);
    }
    pos.needsUpdate = true;
  }
  apply();

  return {
    group,
    top: buttonY + btnH,
    pickables: [collar, chamber, buttonMesh, press],
    /** Línea de tiempo de activación. liquid: material del líquido, shake: objeto a agitar. */
    activate({ liquid, shake, reduced = false } = {}) {
      const mixed = new THREE.Color(liquid.color).lerp(new THREE.Color(0xffffff), 0.35);
      if (reduced) {
        Object.assign(state, { press: 1, fall: 1, powder: 0 });
        apply();
        liquid.color.copy(mixed);
        return gsap.timeline();
      }
      const tl = gsap.timeline({ onUpdate: apply });
      tl.to(state, { press: 1, duration: 0.35, ease: 'back.in(2)' })
        .to(state, { powder: 0, duration: 0.9, ease: 'power2.in' }, '>-0.05')
        .to(state, { fall: 1, duration: 1.8, ease: 'none' }, '<')
        .to(liquid.color, { r: mixed.r, g: mixed.g, b: mixed.b, duration: 0.8 }, '<0.6')
        .to(shake.rotation, { z: 0.12, duration: 0.09, yoyo: true, repeat: 7, ease: 'sine.inOut' }, '>-0.2')
        .set(shake.rotation, { z: 0 });
      return tl;
    },
    reset(liquid, color) {
      Object.assign(state, { press: 0, fall: 0, powder: 1 });
      apply();
      liquid.color.set(color);
    },
  };
}

// Textura granulada para el polvo
let _grain;
function grainTexture() {
  if (_grain) return _grain;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 214 + Math.random() * 41;
    img.data[i] = img.data[i + 1] = v;
    img.data[i + 2] = v - 6;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  _grain = new THREE.CanvasTexture(c);
  _grain.colorSpace = THREE.SRGBColorSpace;
  _grain.wrapS = _grain.wrapT = THREE.RepeatWrapping;
  _grain.repeat.set(3, 1);
  return _grain;
}

function ribbedTube(R, h) {
  const pts = [
    new THREE.Vector2(R * 0.94, 0),
    new THREE.Vector2(R, 0.05),
    new THREE.Vector2(R, h - 0.04),
    new THREE.Vector2(R * 0.95, h),
    new THREE.Vector2(R * 0.85, h),
  ];
  const geo = new THREE.LatheGeometry(pts, 180);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y > 0.08 && v.y < h - 0.06) {
      const k = 1 + 0.018 * Math.cos(Math.atan2(v.z, v.x) * 36);
      pos.setXYZ(i, v.x * k, v.y, v.z * k);
    }
  }
  geo.computeVertexNormals();
  return geo;
}
