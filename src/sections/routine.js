import { routineNutrients, productById } from '../data/products.js';

// Rutina vs. límite EFSA. Los valores salen de products.js y se pueden editar
// en directo (para el pitch); todos marcados "pendiente de validar".
export function initRoutine() {
  const table = document.querySelector('.routine__table');
  const head = `<div class="routine__row routine__row--head" role="row">
    <span role="columnheader">Nutriente</span><span role="columnheader">Dosis frente al límite</span>
    <span role="columnheader">Dosis rutina</span><span role="columnheader">Límite EFSA</span></div>`;

  table.innerHTML = head + routineNutrients
    .map((n, i) => {
      const src = n.source.split(' ')[0];
      const shots = n.source.split(' + ').map((id) => productById[id]?.range).filter(Boolean).join(', ');
      return `<div class="routine__row" role="row" data-i="${i}" style="--rc: var(--c-${src})">
        <span class="routine__nutrient" role="rowheader">${n.nutrient}<small>Tempo ${shots}</small></span>
        <span class="routine__gauge" role="cell"><span class="routine__bar"><span></span></span><small></small></span>
        <label class="routine__value" role="cell" data-label="Dosis">
          <span class="visually-hidden">Dosis de ${n.nutrient} en ${n.unit}</span>
          <input type="number" min="0" step="any" inputmode="decimal" name="dose" value="${n.dose ?? ''}" placeholder="—" /> <em>${n.unit}</em>
        </label>
        <label class="routine__value" role="cell" data-label="Límite EFSA">
          <span class="visually-hidden">Límite EFSA de ${n.nutrient} en ${n.unit}</span>
          <input type="number" min="0" step="any" inputmode="decimal" name="limit" value="${n.limit ?? ''}" placeholder="—" /> <em>${n.unit}</em>
        </label>
      </div>`;
    })
    .join('');

  const rows = [...table.querySelectorAll('.routine__row[data-i]')];
  let shown = false;

  function update(row) {
    const dose = parseFloat(row.querySelector('[name=dose]').value);
    const limit = parseFloat(row.querySelector('[name=limit]').value);
    const bar = row.querySelector('.routine__bar');
    const fill = bar.firstElementChild;
    const known = dose >= 0 && limit > 0;
    const pct = known ? Math.min(100, (dose / limit) * 100) : 0;
    bar.classList.toggle('is-pending', !known);
    bar.classList.toggle('is-over', known && dose > limit);
    fill.style.width = shown ? `${pct}%` : '0';
    row.querySelector('.routine__gauge small').textContent = known
      ? `${Math.round((dose / limit) * 100)} % del límite`
      : 'Pendiente de validar';
  }

  table.addEventListener('input', (e) => update(e.target.closest('.routine__row')));
  rows.forEach(update);

  // Las barras crecen al entrar en pantalla
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    shown = true;
    rows.forEach(update);
  }, { threshold: 0.2 });
  io.observe(table);
}
