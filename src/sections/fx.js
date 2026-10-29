import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../three/renderer.js';

gsap.registerPlugin(ScrollTrigger);
// ?nolag: para capturas en navegadores sin GPU (no frena las animaciones lentas)
if (new URLSearchParams(location.search).has('nolag')) gsap.ticker.lagSmoothing(0);
export { gsap, ScrollTrigger };

export const reduced = () => prefersReducedMotion.matches;

/** Parte un título en letras animables. Los lectores de pantalla leen el texto completo. */
export function splitChars(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.innerHTML = text
    .split(' ')
    .map((w) => `<span class="split-word" aria-hidden="true">${[...w].map((c) => `<span class="split-char">${c}</span>`).join('')}</span>`)
    .join(' ');
  return el.querySelectorAll('.split-char');
}

/** Títulos letra a letra: entran con rebote al aparecer en pantalla. */
export function animateSplit(el, { delay = 0, scroll = true } = {}) {
  const chars = splitChars(el);
  if (reduced()) return;
  const colors = ['#F2A33A', '#E4572E', '#3A7CA5', '#3D348B'];
  gsap.from(chars, {
    yPercent: 110,
    rotate: (i) => (i % 2 ? 8 : -8),
    opacity: 0,
    duration: 0.9,
    ease: 'back.out(2.2)',
    stagger: 0.045,
    delay,
    scrollTrigger: scroll ? { trigger: el, start: 'top 85%' } : undefined,
  });
  // Destello de color que recorre las letras
  gsap.fromTo(
    chars,
    { color: (i) => colors[i % colors.length] },
    { color: 'inherit', duration: 0.8, stagger: 0.045, delay: delay + 0.35, scrollTrigger: scroll ? { trigger: el, start: 'top 85%' } : undefined },
  );
}

/** Elementos [data-reveal]: aparecen subiendo al entrar en pantalla. */
export function setupReveals() {
  if (reduced()) return;
  const items = gsap.utils.toArray('[data-reveal]');
  gsap.set(items, { y: 40, opacity: 0 });
  ScrollTrigger.batch(items, {
    start: 'top 88%',
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1, overwrite: true }),
  });
}

/** Flotación suave (seno) para shots: devuelve el desplazamiento en Y. */
export const float = (t, phase = 0, amp = 0.35) => (reduced() ? 0 : Math.sin(t * 1.1 + phase) * amp);
