import { applyLogo } from '../brand.js';

// Ficha de producto en un <dialog> nativo: atrapa el foco y se cierra con Esc.

let dialog;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'sheet';
  dialog.setAttribute('aria-labelledby', 'sheet-title');
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.appendChild(dialog);
  return dialog;
}

const row = (label, value) =>
  value ? `<div class="sheet__row"><dt>${label}</dt><dd>${value}</dd></div>` : '';

export function openSheet(p) {
  const d = ensureDialog();
  d.style.setProperty('--range', `var(--c-${p.id})`);
  d.style.setProperty('--range-ink', `var(--c-${p.id}-ink)`);
  d.innerHTML = `
    <article class="sheet__card">
      <header class="sheet__head">
        <p class="sheet__moment">${p.moment} · ${p.benefit}</p>
        <h2 id="sheet-title" class="sheet__title">${p.name}</h2>
        <p class="wordmark">by Puleva</p>
      </header>
      <blockquote class="sheet__claim">${p.claim}</blockquote>
      <dl class="sheet__list">
        ${row('Ingredientes', p.ingredients)}
        ${row('Tamaño', p.size)}
        ${row('Momento de consumo', p.moment)}
        ${row('Uso', p.usage)}
        ${row('Precio', p.price)}
        ${row('Aviso', p.claimStatus)}
      </dl>
      <form method="dialog"><button class="btn sheet__close" autofocus>Cerrar</button></form>
    </article>`;
  applyLogo(d.querySelector('.wordmark'));
  d.showModal();
}
