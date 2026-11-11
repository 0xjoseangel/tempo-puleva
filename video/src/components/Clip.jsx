import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, display } from '../theme.js';
import stockManifest from '../stock-manifest.json';

/** Clip de stock a pantalla completa con un zoom lento (Ken Burns). Sin clip, un fondo de reserva. */
export const Clip = ({ id, dur, zoom = [1.04, 1.14], style, fallback = C.nightSoft }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clip = stockManifest[id];
  const scale = interpolate(frame, [0, dur], zoom);

  if (!clip) {
    return (
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${fallback}, ${C.night})`, justifyContent: 'center', alignItems: 'center', ...style }}>
        <div style={{ fontFamily: display, fontSize: 40, color: 'rgba(255,255,255,0.5)' }}>[ clip «{id}» pendiente: npm run stock ]</div>
      </AbsoluteFill>
    );
  }
  // Si el clip es más corto que la escena, se ralentiza (hasta la mitad) para que no se acabe
  const need = dur / fps;
  const have = (clip.seconds ?? need) - (clip.start ?? 0);
  const rate = Math.max(0.5, Math.min(1, have / need));
  return (
    <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
      <OffthreadVideo
        playbackRate={rate}
        src={staticFile(clip.file)}
        trimBefore={Math.round((clip.start ?? 0) * fps)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`, filter: 'saturate(1.06) contrast(1.04)' }}
      />
    </AbsoluteFill>
  );
};
