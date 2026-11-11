import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { setBrandLogo } from '../../../src/brand.js';
import { fontsReady } from '../theme.js';
import logoUrl from '../../../public/brand/puleva-logo.svg';

// Fuentes y logo listos antes de pintar las etiquetas (se hace una vez)
const assetsReady = fontsReady.then(
  () =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(setBrandLogo(img));
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    }),
);

/** Altura del shot completo (cm), para encuadrar */
export const SHOT_H = 11.3;

/** Coloca la cámara para que quepa una caja de width × height centrada en target. */
export function frameCamera(camera, { width, height, target, dir = new THREE.Vector3(0, 0.2, 1), padding = 1.1 }) {
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const dist = Math.max((height / 2) * padding / Math.tan(vFov / 2), (width / 2) * padding / Math.tan(hFov / 2));
  camera.position.copy(target).addScaledVector(dir.clone().normalize(), dist);
  camera.lookAt(target);
}

/**
 * Lienzo three.js transparente con la iluminación de la web.
 * setup({ scene, camera, renderer }) se llama una vez y devuelve update(frame, fps),
 * que coloca la escena para cada fotograma antes de renderizar.
 */
export const Stage3D = ({ setup, width, height, style }) => {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender('Escena 3D'));
  const ctx = useRef(null);

  const draw = (f) => {
    const c = ctx.current;
    if (!c) return;
    c.update?.(f, fps);
    c.renderer.render(c.scene, c.camera);
  };

  useEffect(() => {
    let alive = true;
    let renderer;
    assetsReady.then(() => {
      if (!alive) return;
      renderer = new THREE.WebGLRenderer({ canvas: ref.current, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.9;
      pmrem.dispose();

      const key = new THREE.DirectionalLight(0xfff4e6, 1.6);
      key.position.set(2.5, 14, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = key.shadow.camera.bottom = -14;
      key.shadow.camera.right = key.shadow.camera.top = 14;
      key.shadow.radius = 6;
      key.shadow.bias = -0.0005;
      scene.add(key, new THREE.HemisphereLight(0xffffff, 0xe9dccb, 0.6));

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x1b2a41, opacity: 0.1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 300);
      const c = { scene, camera, renderer, floor };
      c.update = setup(c);
      ctx.current = c;
      draw(frame);
      continueRender(handle);
    });
    return () => {
      alive = false;
      ctx.current = null;
      renderer?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => draw(frame), [frame]);

  return <canvas ref={ref} width={width} height={height} style={{ width, height, ...style }} />;
};
