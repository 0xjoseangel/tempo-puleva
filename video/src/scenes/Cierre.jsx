import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display, text, brand, products } from '../theme.js';
import * as THREE from 'three';
import logo from '../../../public/brand/puleva-logo.svg';
import { createShot } from '../../../src/three/bottle.js';
import { Clip } from '../components/Clip.jsx';
import { Stage3D, frameCamera, SHOT_H } from '../components/Stage3D.jsx';

// La gama completa en fila
const setupLineup = (fps) => ({ scene, camera, floor }) => {
  floor.visible = false;
  const gap = 4.9;
  const shots = products.map((p, i) => {
    const s = createShot(p, null);
    s.userData.contact.visible = false;
    s.position.x = (i - 2) * gap;
    scene.add(s);
    return s;
  });
  const target = new THREE.Vector3(0, SHOT_H / 2, 0);
  frameCamera(camera, { width: gap * 5, height: SHOT_H, target, dir: new THREE.Vector3(0, 0.12, 1), padding: 1.05 });
  return (f) =>
    shots.forEach((s, i) => {
      const k = spring({ frame: f - i * 3, fps, config: { damping: 12 } });
      s.position.y = (1 - k) * -12;
      s.rotation.y = Math.sin((f + i * 15) / 40) * 0.15;
    });
};

export const Cierre = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const letters = [...brand.slogan];
  const by = spring({ frame: frame - 24, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ background: C.night, justifyContent: 'center', alignItems: 'center', color: C.cream }}>
      <Clip id="cierre" dur={dur} zoom={[1.02, 1.1]} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(27,42,65,0.6), rgba(27,42,65,0.88))' }} />
      <Stage3D setup={setupLineup(fps)} width={1000} height={340} style={{ position: 'relative', marginBottom: 30 }} />
      <h1 style={{ position: 'relative', fontFamily: display, fontWeight: 800, fontSize: 180, margin: 0, letterSpacing: -6, lineHeight: 1 }}>
        {letters.map((l, i) => {
          const s = spring({ frame: frame - 4 - i * 1.5, fps, config: { damping: 13 } });
          return (
            <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: s, transform: `translateY(${(1 - s) * 80}px)` }}>
              {l}
            </span>
          );
        })}
      </h1>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, marginTop: 40, opacity: by, transform: `translateY(${(1 - by) * 30}px)` }}>
        <span style={{ fontFamily: display, fontWeight: 800, fontSize: 84 }}>{brand.name}</span>
        <span style={{ fontFamily: text, fontSize: 44, opacity: 0.8 }}>by</span>
        <Img src={logo} style={{ height: 110 }} />
      </div>
      <p style={{ position: 'absolute', bottom: 50, fontFamily: text, fontSize: 24, opacity: 0.6, textAlign: 'center', maxWidth: 1500 }}>
        Propuesta académica – Hackathon UGR × Lactalis Puleva 2026. Concepto no comercial; claims pendientes de verificación regulatoria.
      </p>
    </AbsoluteFill>
  );
};
