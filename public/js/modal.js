/* ---------------- modal plumbing ---------------- */

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalLayer.hidden = false;
  const first = modalBody.querySelector('input, select, textarea, .scale-btn');
  if (first) first.focus();
}

function closeModal() {
  modalLayer.hidden = true;
  modalBody.innerHTML = '';
}

modalLayer.addEventListener('click', (e) => { if (e.target.closest('[data-close-modal]')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalLayer.hidden) closeModal(); });

const val = (id) => (document.getElementById(id)?.value ?? '').trim();
const options = (list, selected) =>
  list.map((o) => `<option value="${esc(o)}"${o === selected ? ' selected' : ''}>${esc(o)}</option>`).join('');

/** The 0–10 meter picker, used in both the quick check and the full log form. */
function scaleWidget(id, selected) {
  const buttons = [];
  for (let v = 0; v <= MOISTURE_MAX; v++) {
    buttons.push(`<button type="button" class="scale-btn" data-scale="${id}" data-value="${v}"
      aria-pressed="${String(v === selected)}">${v}</button>`);
  }
  return `
    <div class="scale" id="${id}">
      <div class="scale-row">${buttons.join('')}</div>
      <div class="scale-ends"><span>bone dry</span><span>soaked</span></div>
    </div>`;
}

function wireScale(id, onPick) {
  const el = document.getElementById(id);
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.scale-btn');
    if (!btn) return;
    el.querySelectorAll('.scale-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    onPick(Number(btn.dataset.value));
  });
}
