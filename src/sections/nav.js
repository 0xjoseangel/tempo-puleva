// Barra superior: fondo al hacer scroll y se esconde al bajar (reaparece al subir).
export function initNav() {
  const nav = document.getElementById('nav');
  let last = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    nav.classList.toggle('is-hidden', y > 400 && y > last && !nav.contains(document.activeElement));
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
