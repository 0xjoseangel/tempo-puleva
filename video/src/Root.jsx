import { Composition } from 'remotion';
import { Ad, FPS, totalFrames } from './Ad.jsx';

export const Root = () => (
  <Composition id="TempoAnuncio" component={Ad} durationInFrames={totalFrames} fps={FPS} width={1920} height={1080} />
);
