import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Aparece con un muelle desde abajo
export const Rise = ({ delay = 0, distance = 60, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.7 } });
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>{children}</div>
  );
};
