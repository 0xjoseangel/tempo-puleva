import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C, display } from '../theme.js';
import { Clip } from '../components/Clip.jsx';

const WORDS = ['Cuidarte', 'no', 'debería', 'ser'];

export const Hook = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word = (i) => spring({ frame: frame - 6 - i * 4, fps, config: { damping: 14 } });
  const last = spring({ frame: frame - 26, fps, config: { damping: 10, mass: 0.8 } });
  // Tachamos "complicado" al final de la frase
  const strike = interpolate(frame, [dur * 0.62, dur * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: C.night, justifyContent: 'center', alignItems: 'center' }}>
      <Clip id="hook" dur={dur} zoom={[1.12, 1.02]} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(27,42,65,0.55), rgba(27,42,65,0.8))' }} />
      <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: 132, color: '#fff', textAlign: 'center', position: 'relative', textShadow: '0 4px 30px rgba(0,0,0,0.35)', lineHeight: 1.05, margin: 0, letterSpacing: -3 }}>
        {WORDS.map((w, i) => (
          <span key={w} style={{ display: 'inline-block', marginRight: 32, opacity: word(i), transform: `translateY(${(1 - word(i)) * 70}px)` }}>
            {w}
          </span>
        ))}
        <br />
        <span style={{ position: 'relative', display: 'inline-block', color: '#F2A33A', fontStyle: 'italic', opacity: last, transform: `scale(${0.6 + last * 0.4}) rotate(${(1 - last) * -8}deg)` }}>
          complicado.
          <span
            style={{
              position: 'absolute',
              left: '-2%',
              top: '54%',
              height: 14,
              width: `${strike * 104}%`,
              background: '#fff',
              borderRadius: 7,
              transform: 'rotate(-3deg)',
            }}
          />
        </span>
      </h1>
    </AbsoluteFill>
  );
};
