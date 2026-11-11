import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { scenes } from './script.js';
import manifest from './vo-manifest.json';
import { Hook } from './scenes/Hook.jsx';
import { Momento } from './scenes/Momento.jsx';
import { Promo } from './scenes/Promo.jsx';
import { Cierre } from './scenes/Cierre.jsx';
import { C, productById } from './theme.js';

export const FPS = 30;
const TRANSITION = 14; // frames que se solapan dos escenas
const VO_DELAY = 8; // la voz entra un poco después de que empiece la escena
const TAIL = 14; // silencio tras la voz antes de la transición

const moment = (props) => (p) => <Momento {...props} {...p} />;
const COMPONENTS = {
  hook: Hook,
  manana: moment({ id: 'manana', ids: ['impulso'], kicker: 'Por la mañana', title: 'Impulso', sub: 'Energía', panelAt: 0.5 }),
  dia: moment({ id: 'dia', ids: ['fuerza', 'firme'], kicker: 'Durante el día', title: 'Fuerza y Ritmo', sub: 'Músculos y huesos', panelAt: 0.28 }),
  mix: moment({ id: 'mix', ids: ['activo'], kicker: 'Mediodía y tarde', title: productById.activo.range, sub: 'Con creatina en el tapón', panelAt: 0.18, powderAt: 0.5 }),
  noche: moment({ id: 'noche', ids: ['pausa'], kicker: 'Por la noche', title: 'Pausa', sub: 'Descanso', panelAt: 0.32, bg: C.night, ink: C.cream }),
  promo: Promo,
  cierre: Cierre,
};
// Entre escenas con personas, fundido (lenguaje de anuncio); hacia el packshot, barrido
const PRESENTATIONS = [fade(), fade(), fade(), fade(), slide({ direction: 'from-right' }), wipe({ direction: 'from-left' })];

// La duración de cada escena se ajusta a su audio (si se ha generado)
export const timeline = scenes.map((s, i) => {
  const vo = manifest.scenes[s.id];
  const voFrames = vo ? VO_DELAY + Math.ceil(vo.seconds * FPS) + TAIL + (i < scenes.length - 1 ? TRANSITION : 0) : 0;
  return { ...s, vo, frames: Math.max(Math.round(s.minSeconds * FPS), voFrames) };
});

export const totalFrames = timeline.reduce((t, s) => t + s.frames, 0) - TRANSITION * (timeline.length - 1);

export const Ad = () => {
  const children = [];
  timeline.forEach((s, i) => {
    const Scene = COMPONENTS[s.id];
    children.push(
      <TransitionSeries.Sequence key={s.id} durationInFrames={s.frames}>
        <Scene dur={s.frames} />
        {s.vo && (
          <Sequence from={VO_DELAY}>
            <Audio src={staticFile(s.vo.file)} />
          </Sequence>
        )}
      </TransitionSeries.Sequence>,
    );
    if (i < timeline.length - 1) {
      children.push(
        <TransitionSeries.Transition key={`t${i}`} presentation={PRESENTATIONS[i % PRESENTATIONS.length]} timing={linearTiming({ durationInFrames: TRANSITION })} />,
      );
    }
  });

  return (
    <AbsoluteFill>
      <TransitionSeries>{children}</TransitionSeries>
      {manifest.music && (
        <Audio
          src={staticFile(manifest.music)}
          volume={(f) => interpolate(f, [0, 20, totalFrames - 50, totalFrames], [0, 0.1, 0.1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      )}
    </AbsoluteFill>
  );
};
