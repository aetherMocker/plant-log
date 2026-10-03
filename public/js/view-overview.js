/* ---------------- overview ---------------- */

function visiblePlants() {
  const q = ui.query.trim().toLowerCase();
  let list = DB.plants.filter((p) => (ui.filter === 'archived' ? p.archived : !p.archived));

  if (ui.filter === 'check') list = list.filter((p) => ['due', 'over'].includes(checkStatus(p).key));
  if (ui.filter === 'dim') list = list.filter((p) => { const l = lightNow(p); return l && l.ofPeak < 50; });

  if (q) {
    list = list.filter((p) => [p.name, p.species, p.location, p.potColor, p.potSize, p.careNotes, p.notes]
      .join(' ').toLowerCase().includes(q));
  }

  const val = (p) => {
    switch (ui.sort) {
      case 'check': return checkStatus(p).sort;
      case 'moisture': { const r = lastReading(p.id); return r ? -r.moisture : -99; }
      case 'light': { const l = lightNow(p); return l ? l.score : -1; }
      case 'lastWater': { const l = lastLog(p.id, 'water'); return l ? -daysSince(l.date) : -1e9; }
      case 'lastRepot': { const l = lastLog(p.id, 'repot'); return l ? -daysSince(l.date) : -1e9; }
      case 'dryDown': { const d = dryDown(p); return d ? d.days : -1; }
      case 'location': return (p.location || '~').toLowerCase();
      default: return (p.name || '').toLowerCase();
    }
  };

  list.sort((a, b) => {
    const [x, y] = [val(a), val(b)];
    const cmp = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return ui.dir === 'asc' ? cmp : -cmp;
  });
  return list;
}

function lightSetupText(p) {
  const bits = [];
  if (p.windowDirection) bits.push(`${p.windowDirection} window`);
  if (p.distance) bits.push(p.distance.toLowerCase());
  if (Number(p.growLightHours) > 0) bits.push(`+${p.growLightHours} h lamp`);
  return bits.join(', ');
}

const potSummary = (p) => [p.potSize, p.potColor].filter(Boolean).join(' · ');

function settingsBanner() {
  if (lat() !== null) return '';
  return `
    <div class="banner">
      <div>
        <strong>Turn on light tracking.</strong>
        Set your latitude and the app works out how much daylight each window
        gets on any date.
      </div>
      <button class="btn btn-primary" data-action="settings" type="button">Set location</button>
    </div>`;
}

function renderOverview() {
  const live = DB.plants.filter((p) => !p.archived);
  const toCheck = live.filter((p) => ['due', 'over'].includes(checkStatus(p).key)).length;
  const la = lat();

  if (!DB.plants.length) {
    app.innerHTML = settingsBanner() + `
      <div class="empty">
        <h2>Nothing growing here yet</h2>
        <p>Add your first plant. Log what the meter says each time you check it,
           and the app will learn how fast it dries out and how that shifts with the season.</p>
        <button class="btn btn-primary" data-action="new-plant" type="button">Add a plant</button>
      </div>`;
    return;
  }

  const rows = visiblePlants().map((p) => {
    const cs = checkStatus(p);
    const reading = lastReading(p.id);
    const lw = lastLog(p.id, 'water');
    const lr = lastLog(p.id, 'repot');
    const dd = cs.dd;
    const light = lightNow(p);

    const moistureCell = reading
      ? `<span class="pill pill-${moistureKey(p, reading.moisture)}">${reading.moisture}<span class="pill-of">/${MOISTURE_MAX}</span></span>
         <span class="cell-sub">${esc(moistureLabel(reading.moisture))}, ${esc(agoPhrase(daysSince(reading.date)))}</span>`
      : '<span class="dash">no reading</span>';

    const checkCell = cs.key === 'none'
      ? `<span class="tag tag-none">${cs.since === null ? 'Never checked' : 'Learning'}</span>`
      : `<div class="meter is-${cs.key}">
          <div class="meter-track"><div class="meter-fill" style="width:${100 - cs.pct.toFixed(0)}%"></div></div>
          <span class="meter-num">${cs.label}</span>
        </div>`;

    const lightCell = light
      ? `<div class="meter is-light">
           <div class="meter-track"><div class="meter-fill" style="width:${Math.min(100, light.score)}%"></div></div>
           <span class="meter-num">${light.score}</span>
         </div>
         <span class="cell-sub">${light.ofPeak}% of its peak · ${esc(lightSetupText(p)) || 'no window set'}</span>`
      : `<span class="dash">${la === null ? 'set location' : 'no window set'}</span>`;

    return `
      <tr class="row-plant" data-plant="${esc(p.id)}">
        <td><span class="cell-name">${esc(p.name)}</span>${p.species ? `<span class="cell-sub">${esc(p.species)}</span>` : ''}</td>
        <td>${moistureCell}</td>
        <td>${checkCell}</td>
        <td>${lightCell}</td>
        <td>${lw ? esc(prettyDate(lw.date)) + `<span class="cell-sub">${esc(agoPhrase(daysSince(lw.date)))}</span>` : '<span class="dash">—</span>'}</td>
        <td class="num">${dd ? `${dd.days} d` : '<span class="dash">—</span>'}</td>
        <td>${esc(potSummary(p)) || '<span class="dash">—</span>'}</td>
        <td>${esc(p.location) || '<span class="dash">—</span>'}</td>
        <td>${lr ? esc(agoPhrase(daysSince(lr.date))) : '<span class="dash">—</span>'}</td>
        <td class="col-actions">
          <button class="btn btn-sm btn-primary" data-action="quick-check" data-plant="${esc(p.id)}" type="button">Check</button>
          <button class="btn btn-sm btn-quiet" data-action="new-log" data-plant="${esc(p.id)}" type="button">Log</button>
        </td>
      </tr>`;
  }).join('');

  const heads = COLUMNS.map((c) => {
    const caret = ui.sort === c.key ? `<span class="caret">${ui.dir === 'asc' ? '↑' : '↓'}</span>` : '';
    return c.sortable
      ? `<th class="sortable${c.num ? ' num' : ''}" data-sort="${c.key}">${esc(c.label)}${caret}</th>`
      : `<th${c.num ? ' class="num"' : ''}>${esc(c.label)}</th>`;
  }).join('');

  const daylight = la !== null ? daylightHours(la, dayOfYear(today())) : null;
  const trend = la !== null ? daylightTrend(la, today()) : null;

  const daylightStrip = daylight === null ? '' : `
    <div class="strip-item">
      <span class="strip-num">${Math.floor(daylight)}h ${String(Math.round((daylight % 1) * 60)).padStart(2, '0')}</span>
      <span class="strip-label">of daylight today, ${trend >= 0 ? 'gaining' : 'losing'}
        ${Math.abs(trend).toFixed(1)} min a day</span>
    </div>`;

  app.innerHTML = settingsBanner() + `
    <div class="strip">
      <div class="strip-item"><span class="strip-num">${live.length}</span><span class="strip-label">plants</span></div>
      <div class="strip-item${toCheck ? ' is-alert' : ''}"><span class="strip-num">${toCheck}</span><span class="strip-label">worth checking</span></div>
      ${daylightStrip}
    </div>

    <div class="toolbar">
      <div class="field-search">
        <input id="search" type="search" placeholder="Search name, species, spot…" value="${esc(ui.query)}">
      </div>
      <div class="seg">
        <button type="button" data-filter="all"      aria-pressed="${ui.filter === 'all'}">All</button>
        <button type="button" data-filter="check"    aria-pressed="${ui.filter === 'check'}">Worth checking</button>
        <button type="button" data-filter="dim"      aria-pressed="${ui.filter === 'dim'}">Low light</button>
        <button type="button" data-filter="archived" aria-pressed="${ui.filter === 'archived'}">Archived</button>
      </div>
      <button class="btn-quiet" data-action="new-log" type="button">Log something</button>
    </div>

    <div class="table-card">
      <div class="table-scroll">
        <table>
          <thead><tr>${heads}</tr></thead>
          <tbody>${rows || `<tr><td colspan="${COLUMNS.length}" style="padding:34px;text-align:center;color:var(--muted)">No plants match that.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

  const search = document.getElementById('search');
  search.addEventListener('input', (e) => {
    ui.query = e.target.value;
    render();
    const s = document.getElementById('search');
    s.focus();
    s.setSelectionRange(s.value.length, s.value.length);
  });
}
