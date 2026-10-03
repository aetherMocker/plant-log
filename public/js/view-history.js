/* ---------------- history (every log, every plant, one timeline) ---------------- */

/** All logs across every plant, newest first. */
function allLogsSorted() {
  return DB.logs.slice().sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) ||
    String(b.createdAt).localeCompare(String(a.createdAt)));
}

function renderHistory() {
  const typesUsed = [...new Set(DB.logs.map((l) => l.type))];

  let list = allLogsSorted();
  if (ui.historyPlant !== 'all') list = list.filter((l) => l.plantId === ui.historyPlant);
  if (ui.historyFilter !== 'all') list = list.filter((l) => l.type === ui.historyFilter);

  const rows = list.map((l) => {
    const p = plantById(l.plantId);
    return `
      <tr${p ? ` class="row-plant" data-plant="${esc(p.id)}"` : ''}>
        <td>${esc(prettyDate(l.date))}<span class="cell-sub">${esc(agoPhrase(daysSince(l.date)))}</span></td>
        <td>${p ? esc(p.name) : '<span class="dash">deleted plant</span>'}</td>
        <td><span class="tag${l.type === 'water' ? '' : ' tag-none'}">${esc(typeLabel(l.type))}</span></td>
        <td>${typeof l.moisture === 'number'
              ? (p ? `<span class="pill pill-${moistureKey(p, l.moisture)}">${l.moisture}</span>` : esc(l.moisture))
              : '<span class="dash">—</span>'}</td>
        <td class="wrap-cell">${esc(l.detail) || '<span class="dash">—</span>'}</td>
        <td class="wrap-cell">${esc(l.notes) || '<span class="dash">—</span>'}</td>
        <td>
          <button class="btn-sm btn-quiet" data-action="edit-log" data-log="${esc(l.id)}" type="button">Edit</button>
          <button class="btn-sm btn-quiet" data-action="delete-log" data-log="${esc(l.id)}" type="button">Delete</button>
        </td>
      </tr>`;
  }).join('');

  const plantOptions = DB.plants
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `<option value="${esc(p.id)}"${ui.historyPlant === p.id ? ' selected' : ''}>${esc(p.name)}${p.archived ? ' (archived)' : ''}</option>`)
    .join('');

  app.innerHTML = `
    <button class="crumb" data-action="home" type="button">← All plants</button>
    
    <div class="detail-head">
      <div><h1>Log History</h1></div>
      <div class="detail-head-actions">
        <button class="btn btn-primary" data-action="new-log" type="button">Log something</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>${list.length} ${list.length === 1 ? 'entry' : 'entries'}</h2>
        <div class="right">
          <select id="history-plant-filter" style="width:auto">
            <option value="all">All plants</option>
            ${plantOptions}
          </select>
          <select id="history-type-filter" style="width:auto">
            <option value="all">Everything (${DB.logs.length})</option>
            ${typesUsed.map((t) => `<option value="${esc(t)}"${ui.historyFilter === t ? ' selected' : ''}>${esc(typeLabel(t))} (${DB.logs.filter((l) => l.type === t).length})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Date</th><th>Plant</th><th>What</th><th>Meter</th><th>Details</th><th>Notes</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--muted)">No entries match that.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('history-plant-filter').addEventListener('change', (e) => {
    ui.historyPlant = e.target.value;
    render();
  });
  document.getElementById('history-type-filter').addEventListener('change', (e) => {
    ui.historyFilter = e.target.value;
    render();
  });
}
