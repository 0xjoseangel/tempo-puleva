import './styles/tokens.css';
import './styles/base.css';
import './styles/landing.css';
import { hasWebGL, whenNear } from './three/renderer.js';
import { loadLabelFonts } from './three/label.js';
import { loadBrandLogo } from './brand.js';
import { ScrollTrigger, setupReveals, animateSplit } from './sections/fx.js';
import { initNav } from './sections/nav.js';
import { initHero } from './sections/hero.js';
import { initRhythm } from './sections/rhythm.js';
import { initPack } from './sections/pack.js';
import { initActivo } from './sections/activo.js';
import { initRange, initRangeList } from './sections/range.js';
import { initRoutine } from './sections/routine.js';

const webgl = hasWebGL();
if (!webgl) {
  document.documentElement.classList.add('no-webgl');
  // Sin 3D: quitamos los contenedores para que las secciones usen solo HTML
  for (const id of ['hero-stage', 'rhythm-stage', 'pack-stage', 'activo-stage', 'range-stage']) document.getElementById(id)?.remove();
}

initNav();
setupReveals();
initRoutine();
initRangeList();

// Las etiquetas 3D necesitan las fuentes y el logo cargados
await Promise.all([loadLabelFonts(), loadBrandLogo()]);

initHero();
// Las secciones fijadas (pin) se crean en orden para que ScrollTrigger calcule bien
initRhythm();
initActivo();
whenNear(document.getElementById('pack'), initPack);
whenNear(document.getElementById('gama'), initRange);
animateSplit(document.getElementById('final-title'));

ScrollTrigger.refresh();
document.fonts.ready.then(() => ScrollTrigger.refresh());
