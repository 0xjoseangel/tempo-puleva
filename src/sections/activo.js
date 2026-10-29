import * as THREE from 'three';
import { productById } from '../data/products.js';
import { createStage, fitCamera } from '../three/renderer.js';
import { createShot, activatePowder } from '../three/bottle.js';
import { enablePicking } from '../three/interaction.js';
import { openSheet } from '../ui/sheet.js';
import { gsap, ScrollTrigger, reduced, float } from './fx.js';

// Tempo Activo, "el mix": al hacer scroll se pulsa el tapón, cae la creatina y se agita.
export function initActivo() {
  const pin = document.querySelector('.activo__pin');
  const steps = [...pin.querySelectorAll('.activo__steps li')];
  const replay = document.getElementById('activo-replay');
  const container = document.getElementById('activo-stage');

  const setActive = (i) => steps.forEach((el, j) => el.classList.toggle('is-active', j <= i));

  if (!container) {
    setActive(2);
    replay.hidden = true;
    return;
  }

  const stage = createStage(container, {
    background: null,
    label: 'Tempo Activo: al pulsar el tapón la creatina en polvo cae al líquido',
  });
  stage.floor.material.opacity = 0.18;
  const shot = createShot(productById.activo, stage.renderer);
  shot.userData.contact.material.opacity = 0.35;
  stage.scene.add(shot);
  const h = shot.userData.height;
  const cam = { zoom: 0 }; // 0 = envase entero, 1 = primer plano del tapón
  const frame = () => {
    const w = container.clientWidth;
    const narrow = w / container.clientHeight < 1;
    const target = new THREE.Vector3(0, THREE.MathUtils.lerp(h * 0.52, h * 0.82, cam.zoom), 0);
    fitCamera(stage.camera, {
      width: THREE.MathUtils.lerp(8, 5, cam.zoom),
      height: THREE.MathUtils.lerp(h * 1.3, h * 0.6, cam.zoom),
      target,
      dir: new THREE.Vector3(0, THREE.MathUtils.lerp(0.18, 0.5, cam.zoom), 1),
      padding: narrow ? 1.1 : 1.3,
    });
  };
  stage.onResize(frame);

  // Línea de tiempo del tapón dosificador, controlada por el scroll
  let tl = activatePowder(shot, { reduced: false });
  tl.pause(0);
  const total = tl.duration();
  const stepAt = (time) => (time < 0.35 ? 0 : time < 1.9 ? 1 : 2);

  const spin = { y: -0.35 };
  stage.onTick((dt, t) => {
    shot.rotation.y = spin.y + (reduced() ? 0 : Math.sin(t * 0.5) * 0.12);
    shot.position.y = float(t, 0, 0.2) + 0.2;
  });

  if (reduced()) {
    // Sin scroll animado: estado final visible y botón que alterna
    tl.progress(1);
    setActive(2);
  } else {
    setActive(0);
    ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: () => `+=${window.innerHeight * 1.8}`,
      pin: true,
      scrub: 0.5,
      onUpdate: (st) => {
        const p = st.progress;
        // 0–0.25: acercar al tapón · 0.25–0.85: activar · 0.85–1: alejar
        cam.zoom = Math.sin(Math.PI * THREE.MathUtils.clamp(p / 0.9, 0, 1));
        frame();
        const k = THREE.MathUtils.clamp((p - 0.2) / 0.65, 0, 1);
        tl.progress(k);
        spin.y = -0.35 + p * 0.7;
        setActive(stepAt(k * total));
      },
    });
  }

  // Botón y clic en el tapón: repetir la animación completa
  const play = () => {
    if (reduced()) {
      const done = tl.progress() === 1;
      tl.progress(done ? 0 : 1);
      setActive(done ? 0 : 2);
      return;
    }
    gsap.fromTo(tl, { progress: 0 }, {
      progress: 1, duration: total, ease: 'none',
      onUpdate: () => setActive(stepAt(tl.time())),
    });
  };
  replay.addEventListener('click', play);
  enablePicking(stage, [shot], {
    onSelect: (p, s, part) => (part === 'capButton' ? play() : openSheet(p)),
  });
}

