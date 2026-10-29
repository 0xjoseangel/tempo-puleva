import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const MAX_PIXEL_RATIO = 1.5;

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Ejecuta fn una sola vez cuando el elemento se acerca a la pantalla (carga diferida). */
export function whenNear(el, fn, margin = '400px') {
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    fn();
  }, { rootMargin: margin });
  io.observe(el);
}

/**
 * Escena 3D montada en un contenedor. Renderiza solo cuando el contenedor está
 * en pantalla y la pestaña visible.
 */
export function createStage(container, { background = '#F7F2EA', fov = 30, label = 'Escena 3D' } = {}) {
  // background null = lienzo transparente (deja ver el fondo CSS de la sección)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: background == null, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', label);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (background != null) scene.background = new THREE.Color(background);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);

  // Luz principal que proyecta sombras suaves sobre el suelo
  const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
  key.position.set(2.5, 14, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -12;
  key.shadow.camera.right = key.shadow.camera.top = 12;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dccb, 0.6));

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.ShadowMaterial({ color: 0x1b2a41, opacity: 0.08 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const tickers = new Set();
  const resizers = new Set();
  const clock = new THREE.Clock();
  let inView = false;
  let running = false;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const fn of resizers) fn(w, h);
    renderOnce();
  }

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (const fn of tickers) fn(dt, t);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function update() {
    const shouldRun = inView && document.visibilityState === 'visible';
    if (shouldRun && !running) {
      running = true;
      clock.getDelta();
      requestAnimationFrame(frame);
    } else if (!shouldRun) running = false;
  }

  function renderOnce() {
    renderer.render(scene, camera);
  }

  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    update();
  }).observe(container);
  document.addEventListener('visibilitychange', update);
  resize();

  return {
    renderer,
    scene,
    camera,
    floor,
    canvas: renderer.domElement,
    onTick(fn) {
      tickers.add(fn);
      return () => tickers.delete(fn);
    },
    renderOnce,
    /** fn(w, h) en cada cambio de tamaño; se llama también al registrarla. */
    onResize(fn) {
      resizers.add(fn);
      if (container.clientWidth) fn(container.clientWidth, container.clientHeight);
    },
  };
}

/**
 * Coloca la cámara para que un rectángulo (width × height, centrado en target)
 * quepa en pantalla. dir: dirección desde el target hacia la cámara.
 */
export function fitCamera(camera, { width, height, target, dir = new THREE.Vector3(0, 0.25, 1), padding = 1.1 }) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const dist = Math.max(height / 2 / t, width / 2 / (t * camera.aspect)) * padding;
  camera.position.copy(target).addScaledVector(dir.clone().normalize(), dist);
  camera.lookAt(target);
  return dist;
}
