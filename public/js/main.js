/* ---------------- events ---------------- */

document.body.addEventListener('click', (e) => {
  const sortHead = e.target.closest('th[data-sort]');
  if (sortHead) {
    const key = sortHead.dataset.sort;
    if (ui.sort === key) ui.dir = ui.dir === 'asc' ? 'desc' : 'asc';
    else { ui.sort = key; ui.dir = key === 'name' || key === 'location' ? 'asc' : 'desc'; }
    return render();
  }

  const filterBtn = e.target.closest('[data-filter]');
  if (filterBtn) { ui.filter = filterBtn.dataset.filter; return render(); }

  const actionEl = e.target.closest('[data-action]');
  if (actionEl) {
    e.stopPropagation();
    const { action, plant, log } = actionEl.dataset;
    switch (action) {
      case 'home': route = { name: 'overview' }; return render();
      case 'settings': return settingsModal();
      case 'new-plant': return plantForm(null);
      case 'edit-plant': return plantForm(plantById(plant));
      case 'quick-check': return quickCheck(plant);
      case 'new-log': return logForm(null, plant);
      case 'edit-log': return logForm(DB.logs.find((l) => l.id === log));
      case 'delete-log': return deleteLog(log);
      case 'archive-plant': return archivePlant(plant);
      case 'delete-plant': return deletePlant(plant);
    }
    return;
  }

  // Clicking anywhere else on a plant's row — on the overview table or the
  // history page — jumps to that plant's detail view.
  const row = e.target.closest('tr.row-plant');
  if (row) {
    route = { name: 'plant', plantId: row.dataset.plant };
    ui.logFilter = 'all';
    window.scrollTo(0, 0);
    render();
  }
});

document.getElementById('home-btn').onclick = () => { route = { name: 'overview' }; render(); };
document.getElementById('new-plant-btn').onclick = () => plantForm(null);
document.getElementById('export-csv-btn').onclick = exportCSV;
document.getElementById('backup-btn').onclick = backupModal;
document.getElementById('settings-btn').onclick = settingsModal;

// New: a nav button that shows the all-plants activity timeline.
// Add <button id="history-btn" type="button">History</button> next to the
// other nav buttons in index.html for this to have something to bind to.
const historyBtn = document.getElementById('history-btn');
if (historyBtn) {
  historyBtn.onclick = () => {
    route = { name: 'history' };
    window.scrollTo(0, 0);
    render();
  };
}

/* ---------------- boot ---------------- */

function render() {
  if (route.name === 'plant') renderPlant(route.plantId);
  else if (route.name === 'history') renderHistory();
  else renderOverview();
}

loadDB()
  .then(render)
  .catch((err) => {
    app.innerHTML = `<div class="empty"><h2>Can't reach the server</h2>
      <p>${esc(err.message)}. Start it with <code>node server.js</code> in the project folder, then reload this page.</p></div>`;
  });
