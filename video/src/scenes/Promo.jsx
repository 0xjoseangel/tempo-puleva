import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, text, packs, productById, euros, fmt } from '../theme.js';
import * as THREE from 'three';
import { createShot } from '../../../src/three/bottle.js';
import { createPackBox } from '../../../src/three/box.js';
import { Stage3D, frameCamera } from '../components/Stage3D.jsx';

const cronos = packs.find((p) => p.id === 'cronos');
const loose = cronos.items.reduce((t, id) => t + euros(productById[id].price), 0);
const price = euros(cronos.price);

// Caja del pack con los cuatro shots cayendo en su hueco, como en la web
const setupBox = (fps) => ({ scene, camera }) => {
  const box = createPackBox();
  box.print({ title: cronos.label, subtitle: cronos.subtitle, colors: cronos.items.map((id) => productById[id].color) });
  scene.add(box.group);
  const shots = cronos.items.map((id, i) => {
    const s = createShot(productById[id], null);
    s.userData.contact.visible = false;
    s.position.x = box.slotX[i];
    scene.add(s);
    return s;
  });
  const target = new THREE.Vector3(0, 5.8, 0);
  return (f) => {
    shots.forEach((s, i) => {
      const k = spring({ frame: f - 6 - i * 6, fps, config: { damping: 9, stiffness: 120 } });
      s.position.y = 0.18 + (1 - k) * 22;
    });
    const a = interpolate(f, [0, 200], [0.32, 0.02], { extrapolateRight: 'clamp' });
    frameCamera(camera, { width: box.width, height: 13, target, dir: new THREE.Vector3(a, 0.36, 1), padding: 1.3 });
  };
};

export const Promo = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 15 } });
  const stampAt = Math.round(dur * 0.5);
  const stamp = spring({ frame: frame - stampAt, fps, config: { damping: 8, stiffness: 160 } });
  const save = spring({ frame: frame - stampAt - 14, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: C.cream }}>
      {/* Rayos detrás del precio */}
      <div
        style={{
          position: 'absolute',
          left: 1420 - 700,
          top: 520 - 700,
          width: 1400,
          height: 1400,
          borderRadius: '50%',
          background: `repeating-conic-gradient(${C.creamDeep} 0deg 10deg, transparent 10deg 20deg)`,
          transform: `rotate(${frame * 0.4}deg) scale(${stamp})`,
          opacity: 0.9,
        }}
      />
      <div style={{ position: 'absolute', left: 140, top: 110, opacity: title, transform: `translateY(${(1 - title) * 40}px)` }}>
        <div style={{ fontFamily: text, fontWeight: 700, fontSize: 38, letterSpacing: 6, textTransform: 'uppercase', color: C.fuerzaInk }}>{cronos.subtitle}</div>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 150, lineHeight: 1, letterSpacing: -4, color: C.night, marginTop: 8 }}>{cronos.label}</div>
        <div style={{ fontFamily: display, fontSize: 64, color: C.nightSoft, marginTop: 14 }}>
          Cuatro shots. <em>Un día entero.</em>
        </div>
      </div>
      <Stage3D setup={setupBox(fps)} width={1160} height={740} style={{ position: 'absolute', left: 30, top: 340 }} />
      <div
        style={{
          position: 'absolute',
          left: 1420 - 260,
          top: 520 - 260,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: productById.fuerza.color,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 30px 80px rgba(27,42,65,0.3)',
          opacity: Math.min(1, stamp * 2),
          transform: `scale(${interpolate(stamp, [0, 1], [2.4, 1])}) rotate(${interpolate(stamp, [0, 1], [-30, -8])}deg)`,
        }}
      >
        <div style={{ fontFamily: text, fontWeight: 700, fontSize: 40, letterSpacing: 4, textTransform: 'uppercase' }}>Solo</div>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 170, lineHeight: 1, letterSpacing: -5 }}>{fmt(price)}</div>
        <div style={{ fontFamily: text, fontSize: 34, marginTop: 10, opacity: 0.9 }}>
          Por separado <s>{fmt(loose)}</s>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1420 - 170,
          top: 840,
          fontFamily: display,
          fontWeight: 800,
          fontSize: 54,
          color: C.cream,
          background: C.night,
          padding: '16px 40px',
          borderRadius: 999,
          opacity: save,
          transform: `translateY(${(1 - save) * 40}px)`,
        }}
      >
        Ahorras {fmt(loose - price)}
      </div>
    </AbsoluteFill>
  );
};
