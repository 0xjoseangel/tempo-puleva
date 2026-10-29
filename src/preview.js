import './styles/tokens.css';
import './styles/base.css';
import { gsap } from 'gsap';
import { products, productById } from './data/products.js';
import { createStage, prefersReducedMotion } from './three/renderer.js';
import { createShot, activatePowder, resetPowder } from './three/bottle.js';
import { loadLabelFonts } from './three/label.js';
import { loadBrandLogo } from './brand.js';
import { createControls, enablePicking } from './three/interaction.js';
import { openSheet } from './ui/sheet.js';

const container = document.getElementById('stage');
const picker = document.querySelector('.picker');
const params = new URLSearchParams(location.search);

await Promise.all([loadLabelFonts(), loadBrandLogo()]);

const stage = createStage(container);
stage.camera.position.set(0, 6.5, Number(params.get('cam')) || 26);
const controls = createControls(stage, { x: 0, y: 5, z: 0 });

const shots = Object.fromEntries(products.map((p) => [p.id, createShot(p, stage.renderer)]));
let current = null;

function show(id) {
  if (current) stage.scene.remove(current);
  current = shots[id];
  current.rotation.y = Number(params.get('rot')) || 0;
  stage.scene.add(current);
  controls.target.set(0, current.userData.height * Number(params.get('ty') || 0.48), 0);
  container.setAttribute('aria-label', `Envase 3D de ${productById[id].name}, ${productById[id].size}`);
  for (const b of picker.children) b.setAttribute('aria-pressed', String(b.dataset.id === id));
  resetPowder(current);
  updateActivateButton();
  if (!prefersReducedMotion.matches && !params.has('still')) {
    gsap.fromTo(current.userData.inner.position, { y: 2 }, { y: 0, duration: 0.8, ease: 'bounce.out' });
  }
}

for (const p of products) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = p.range;
  b.dataset.id = p.id;
  b.addEventListener('click', () => show(p.id));
  picker.appendChild(b);
}

// Tapón dosificador (Tempo Fuerza + Ritmo)
const activateBtn = document.getElementById('activate');

function updateActivateButton() {
  const hasPowder = !!current?.userData.powderCap;
  activateBtn.hidden = !hasPowder;
  activateBtn.textContent = current?.userData.activated ? 'Volver a cargar el tapón' : 'Pulsar tapón';
}

function toggleActivate() {
  if (current.userData.activated) resetPowder(current);
  else {
    const tl = activatePowder(current, { reduced: prefersReducedMotion.matches });
    const mix = params.get('mix');
    if (tl && mix !== null) tl.pause().progress(Number(mix));
  }
  updateActivateButton();
}

activateBtn.addEventListener('click', toggleActivate);

enablePicking(stage, Object.values(shots), {
  onSelect: (p, shot, part) => (part === 'capButton' ? toggleActivate() : openSheet(p)),
});
document.getElementById('open-sheet').addEventListener('click', () => openSheet(current.userData.product));

// Giro suave continuo (desactivado con reduced-motion o si ?still)
if (!prefersReducedMotion.matches && !params.has('still')) {
  stage.onTick((dt) => {
    if (current) current.rotation.y += dt * 0.35;
  });
}

show(params.get('p') in shots ? params.get('p') : 'impulso');
if (params.has('mix') && current.userData.powderCap) toggleActivate();
