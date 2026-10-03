/* ---------------- export ---------------- */

function download(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function exportCSV() {
  const header = ['Plant', 'Plant type', 'Last meter reading', 'Reading taken', 'Water at or below',
    'Days since watering', 'Last watered', 'Typical dry-down (days)', 'Average gap', 'Shortest gap', 'Longest gap',
    'Gap on long days', 'Gap on short days',
    'Light score today', 'Percent of its peak', 'Window faces', 'Distance from glass', 'Obstruction', 'Grow light hours',
    'How to water', 'Pot size', 'Pot colour', 'Soil', 'Where', 'Last repot', 'Last fertilized',
    'Care instructions', 'Notes', 'Archived'];

  const rows = DB.plants.map((p) => {
    const r = lastReading(p.id);
    const lw = lastLog(p.id, 'water');
    const lr = lastLog(p.id, 'repot');
    const lf = lastLog(p.id, 'fertilize');
    const s = gapStats(p.id, 'water');
    const dd = dryDown(p);
    const light = lightNow(p);
    const season = dryDownByDaylight(p);
    return [
      p.name, p.species,
      r ? r.moisture : '', r ? r.date : '', waterAt(p),
      lw ? daysSince(lw.date) : '', lw ? lw.date : '',
      dd ? dd.days : '', s ? s.avg.toFixed(1) : '', s ? s.min : '', s ? s.max : '',
      season ? season.long.toFixed(1) : '', season ? season.short.toFixed(1) : '',
      light ? light.score : '', light ? light.ofPeak : '',
      p.windowDirection, p.distance, p.obstruction, p.growLightHours,
      p.waterMethod, p.potSize, p.potColor, p.soil, p.location,
      lr ? lr.date : '', lf ? lf.date : '',
      p.careNotes, p.notes, p.archived ? 'yes' : '',
    ].map(csvCell).join(',');
  });

  download(`plants-${todayISO()}.csv`, [header.map(csvCell).join(','), ...rows].join('\n'), 'text/csv');
  toast('Table exported.');
}

function exportLogsCSV() {
  const header = ['Date', 'Plant', 'What', 'Meter reading', 'Method', 'Details', 'Notes', 'Daylight hours that day'];
  const la = lat();
  const rows = DB.logs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((l) => {
    const d = parseDate(l.date);
    return [l.date, (plantById(l.plantId) || {}).name || '(deleted)', typeLabel(l.type),
      typeof l.moisture === 'number' ? l.moisture : '', l.method, l.detail, l.notes,
      la !== null && d ? daylightHours(la, dayOfYear(d)).toFixed(2) : ''].map(csvCell).join(',');
  });
  download(`plant-logs-${todayISO()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv');
  toast('History exported.');
}

function backupModal() {
  openModal('Backup and restore', `
    <p class="modal-lede">Everything lives in <code>data.json</code> in the project folder, and the app
      keeps the last 20 versions in <code>backups/</code>. Use these for a copy somewhere else.</p>
    <div class="form-grid">
      <div class="field span-2">
        <button class="btn" type="button" id="dl-json" style="width:auto">Download data.json</button>
        <button class="btn" type="button" id="dl-logs" style="width:auto;margin-left:6px">Export full history as CSV</button>
      </div>
      <div class="form-section">Restore</div>
      <div class="field span-2">
        <label for="restore-file">Load a data.json file</label>
        <input id="restore-file" type="file" accept="application/json,.json">
        <div class="hint">This replaces everything currently in the app. The current data is copied into <code>backups/</code> first.</div>
      </div>
    </div>
    <div class="form-actions"><button class="btn" type="button" data-close-modal>Close</button></div>`);

  document.getElementById('dl-json').onclick = () =>
    download(`plant-log-${todayISO()}.json`,
      JSON.stringify({ version: 2, plants: DB.plants, logs: DB.logs, settings: DB.settings }, null, 2),
      'application/json');

  document.getElementById('dl-logs').onclick = exportLogsCSV;

  document.getElementById('restore-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.plants) || !Array.isArray(parsed.logs)) {
        throw new Error('That file has no "plants" and "logs" lists.');
      }
      if (!confirm(`Replace the current ${DB.plants.length} plants and ${DB.logs.length} entries with ${parsed.plants.length} plants and ${parsed.logs.length} entries?`)) return;
      DB = { plants: parsed.plants, logs: parsed.logs, settings: parsed.settings || {} };
      await saveDB();
      closeModal();
      route = { name: 'overview' };
      render();
      toast('Restored.');
    } catch (err) {
      toast(err.message);
    }
  };
}
