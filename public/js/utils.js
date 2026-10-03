/* ---------------- small helpers ---------------- */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DAY = 86400000;

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function todayISO() {
  const d = today();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse 'YYYY-MM-DD' in local time so dates never slip by a day. */
function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function daysSince(iso) {
  const d = parseDate(iso);
  return d ? Math.round((today() - d) / DAY) : null;
}

function prettyDate(iso) {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function agoPhrase(days) {
  if (days === null || days === undefined) return 'never';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 21) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30.44)} months ago`;
  const years = Math.floor(days / 365.25);
  const months = Math.round((days - years * 365.25) / 30.44);
  return months ? `${years}y ${months}m ago` : `${years}y ago`;
}

const typeMeta = (id) => LOG_TYPES.find((t) => t.id === id) || { label: id, detailLabel: 'Details' };
const typeLabel = (id) => typeMeta(id).label;
const plantById = (id) => DB.plants.find((p) => p.id === id) || null;

function toast(message, undo) {
  toastEl.innerHTML = esc(message);
  if (undo) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.style.marginLeft = '12px';
    btn.textContent = 'Undo';
    btn.onclick = async () => { await undo(); toastEl.hidden = true; render(); };
    toastEl.append(btn);
  }
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.hidden = true; }, undo ? 7000 : 2800);
}
