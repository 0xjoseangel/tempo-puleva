import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import * as THREE from 'three';
import { createShot, activatePowder } from '../../../src/three/bottle.js';
import { C, display, text, productById } from '../theme.js';
import { Clip } from '../components/Clip.jsx';
import { Stage3D, frameCamera, SHOT_H } from '../components/Stage3D.jsx';

const PANEL_W = 780;
const STAGE_H = 760;

/**
 * Escena de "momento del día": persona real (clip) y, a mitad, entra un panel
 * con los shots 3D de la web.
 * ids: productos del panel. panelAt: fracción de la escena en la que entra.
 * powderAt: (solo Fuerza + Ritmo) fracción en la que se pulsa el tapón.
 */
export const Momento = ({ id, dur, ids, kicker, title, sub, panelAt = 0.4, powderAt, bg = C.cream, ink = C.night }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const products = ids.map((p) => productById[p]);
  const accent = products[0].color;
  const inAt = Math.round(dur * panelAt);
  const open = spring({ frame: frame - inAt, fps, config: { damping: 18, mass: 0.9 } });
  const txt = (d) => spring({ frame: frame - inAt - d, fps, config: { damping: 15 } });
  const tag = spring({ frame: frame - 4, fps, config: { damping: 16 } });
  const steps = powderAt != null ? ['Pulsa', 'Agita', 'Listo'] : null;
  const pressAt = powderAt != null ? Math.round(dur * powderAt) : 0;

  const setup = ({ scene, camera }) => {
    const shots = products.map((p) => createShot(p, null));
    const gap = 5.4;
    shots.forEach((s, i) => {
      s.position.x = (i - (shots.length - 1) / 2) * gap;
      scene.add(s);
    });
    const tl = powderAt != null ? activatePowder(shots[0]) : null;
    tl?.pause(0);
    const solo = shots.length === 1;
    const width = shots.length * gap;
    const target = new THREE.Vector3(0, SHOT_H * 0.5, 0);
    const base = { width, height: SHOT_H, target, padding: powderAt != null ? 1.12 : solo ? 1.25 : 1.12 };

    return (f) => {
      const t = f - inAt;
      shots.forEach((s, i) => {
        const k = spring({ frame: t - 6 - i * 5, fps, config: { damping: 12, mass: 0.8 } });
        s.position.y = (1 - k) * -14;
        s.rotation.y = (1 - k) * 1.6 + Math.sin((f + i * 20) / 45) * 0.18 - (i - (shots.length - 1) / 2) * 0.12;
      });
      // Cámara: ligera órbita que da vida al plano
      const a = interpolate(f, [inAt, dur], [-0.12, 0.12]);
      frameCamera(camera, { ...base, dir: new THREE.Vector3(Math.sin(a), 0.22, Math.cos(a)) });
      if (tl) tl.seek(Math.max(0, (f - pressAt) / fps), false);
    };
  };

  // Paso del "Pulsa · Agita · Listo" según la línea de tiempo del tapón (powderCap.js)
  const step = steps ? [0, 1.9, 2.7].filter((s) => frame >= pressAt + s * fps).length : 0;

  return (
    <AbsoluteFill style={{ background: C.night }}>
      {/* El clip se encoge a la izquierda cuando entra el panel */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1920 - PANEL_W * open }}>
        <Clip id={id} dur={dur} fallback={accent} />
        <AbsoluteFill style={{ background: `linear-gradient(to top, ${accent}66, transparent 45%)` }} />
        <div
          style={{
            position: 'absolute',
            left: 90,
            bottom: 90,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 30}px)`,
          }}
        >
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: accent, boxShadow: '0 0 0 6px rgba(255,255,255,0.85)' }} />
          <span style={{ fontFamily: display, fontWeight: 700, fontSize: 58, color: '#fff', textShadow: '0 3px 24px rgba(0,0,0,0.45)' }}>{kicker}</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: PANEL_W,
          background: bg,
          transform: `translateX(${(1 - open) * PANEL_W}px)`,
          boxShadow: '-30px 0 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: PANEL_W / 2 - 330, top: 330, width: 660, height: 660, borderRadius: '50%', background: accent, opacity: 0.16 }} />
        {/* Con los pasos del tapón, el bote sube para dejarles sitio abajo */}
        <Stage3D
          setup={setup}
          width={PANEL_W}
          height={steps ? 600 : STAGE_H}
          style={{ position: 'absolute', left: 0, ...(steps ? { top: 340 } : { bottom: 0 }) }}
        />
        <div style={{ position: 'absolute', left: 70, right: 70, top: 80, color: ink }}>
          <div style={{ fontFamily: text, fontWeight: 700, fontSize: 30, letterSpacing: 5, textTransform: 'uppercase', color: ink === C.night ? C.nightSoft : ink, opacity: txt(4) * 0.85 }}>
            {sub}
          </div>
          <div
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: title.length > 14 ? 92 : 112,
              lineHeight: 1,
              letterSpacing: -3,
              marginTop: 12,
              opacity: txt(8),
              transform: `translateY(${(1 - txt(8)) * 40}px)`,
            }}
          >
            {title}
          </div>
          {steps && (
            <div style={{ position: 'absolute', top: 880, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
              {steps.map((s, i) => {
                const on = interpolate(step, [i, i + 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                return (
                  <span
                    key={s}
                    style={{
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 40,
                      padding: '8px 26px',
                      borderRadius: 999,
                      color: on > 0.5 ? '#fff' : ink,
                      background: on > 0.5 ? accent : 'transparent',
                      border: `3px solid ${accent}`,
                      opacity: 0.35 + on * 0.65,
                      transform: `scale(${0.9 + on * 0.1})`,
                    }}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
