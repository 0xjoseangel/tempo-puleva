import { loadFont as loadOutfit } from '@remotion/google-fonts/Outfit';
import { loadFont as loadAtkinson } from '@remotion/google-fonts/AtkinsonHyperlegible';

// Datos y colores compartidos con la landing (única fuente de verdad)
export { brand, products, productById, packs, coreRange } from '../../src/data/products.js';

const outfit = loadOutfit('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] });
const atkinson = loadAtkinson('normal', { weights: ['400', '700'], subsets: ['latin'] });
export const display = outfit.fontFamily;
export const text = atkinson.fontFamily;
// Las etiquetas 3D se pintan en canvas: hay que esperar a las fuentes
export const fontsReady = Promise.all([outfit.waitUntilDone(), atkinson.waitUntilDone()]);

export const C = {
  cream: '#F7F2EA',
  creamDeep: '#EFE6D8',
  night: '#1B2A41',
  nightSoft: '#44536B',
  fuerzaInk: '#B03A16',
};

export const euros = (s) => Number(s.replace(/[^\d,]/g, '').replace(',', '.'));
export const fmt = (n) => `${n.toFixed(2).replace('.', ',')} €`;
