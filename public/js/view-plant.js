/* ---------------- plant detail ---------------- */

function renderPlant(id) {
  const p = plantById(id);
  if (!p) { route = { name: 'overview' }; return renderOverview(); }

  const la = lat();
  const cs = checkStatus(p);
  const reading = lastReading(p.id);
  const water = gapStats(p.id, 'water');
  const lastWater = lastLog(p.id, 'water');
  const lastRepot = lastLog(p.id, 'repot');
  const lastFert = lastLog(p.id, 'fertilize');
  const light = lightNow(p);
  const season = dryDownByDaylight(p);

  const stat = (num, label, note) =>
    `<div class="stat"><div class="stat-num">${num}</div><div class="stat-label">${label}</div>${note ? `<div class="stat-note">${note}</div>` : ''}</div>`;

  const spec = (label, value, long) =>
    value ? `<div><dt>${esc(label)}</dt><dd${long ? ' class="long"' : ''}>${esc(value)}</dd></div>` : '';

  /* -- light panel -- */
  let lightPanel = '';
  if (light && la !== null) {
    const { peak, trough, peakDay } = annualRange(p, la);
    const peakDate = new Date(today().getFullYear(), 0, peakDay);
    const first = solarToClock(light.firstDirect, la, lng(), today());
    const second = solarToClock(light.lastDirect, la, lng(), today());
    const trend = daylightTrend(la, today());

    const canShowClock = first !== null && second !== null;
    const directLine = light.directHours > 0
      ? `${light.directHours.toFixed(1)} hours of direct sun` +
        (light.splitAcrossDay
          ? ', arriving early morning and again in the evening, with a gap at midday'
          : canShowClock ? `, roughly ${formatHour(first)} to ${formatHour(second)}` : '') + '.'
      : 'No direct sun today. This spot lives on grow light alone.';

    lightPanel = `
      <div class="panel">
        <div class="panel-head">
          <h2>Light</h2>
          <div class="right"><span class="plant-light cell-sub">${esc(lightSetupText(p)) || 'window not set'}</span></div>
        </div>
        <div class="panel-pad">
          <div class="stats stats-flat">
            ${stat(light.score, 'light score today', `100 is a south sill in midsummer`)}
            ${stat(light.ofPeak + '%', 'of its own best day', `peaks around ${peakDate.toLocaleDateString(undefined, { month: 'long' })}`)}
            ${stat(light.daylight.toFixed(1) + ' h', 'daylight today', `${trend >= 0 ? 'gaining' : 'losing'} ${Math.abs(trend).toFixed(1)} min a day`)}
            ${stat(Math.round(light.peakAltitude) + '°', 'sun height at noon', light.peakAltitude < 30 ? 'low and weak' : 'high and strong')}
          </div>
          <p class="panel-note">${directLine}
            Across the year this spot runs between about ${Math.round(trough)} and ${Math.round(peak)}.</p>
          ${yearLightChart(p)}
          <p class="chart-caption">Light through the year for this spot. The dot is today;
             the ticks below the line are waterings.</p>
        </div>
      </div>`;
  }

  /* -- season comparison -- */
  const seasonPanel = season ? `
    <div class="panel">
      <div class="panel-head"><h2>Does light change how often you water?</h2></div>
      <div class="panel-pad">
        <div class="compare">
          <div class="compare-side">
            <div class="compare-num">${season.long.toFixed(1)} days</div>
            <div class="compare-label">between waterings when days are long</div>
            <div class="stat-note">${season.longN} intervals</div>
          </div>
          <div class="compare-side">
            <div class="compare-num">${season.short.toFixed(1)} days</div>
            <div class="compare-label">between waterings when days are short</div>
            <div class="stat-note">${season.shortN} intervals</div>
          </div>
        </div>
        <p class="panel-note">${
          season.short > season.long * 1.15
            ? `It drinks about ${Math.round((season.short / season.long - 1) * 100)}% slower in the dark half of the year.`
            : season.long > season.short * 1.15
              ? `It dries out faster in the dark half of the year, which is unusual! Worth a look at what else changed.`
              : `No real difference so far. Either the light isn't moving the needle here, or there isn't enough history yet.`
        }</p>
      </div>
    </div>` : '';

  /* -- history -- */
  const shown = logsFor(p.id).filter((l) => ui.logFilter === 'all' || l.type === ui.logFilter);
  const usedTypes = [...new Set(logsFor(p.id).map((l) => l.type))];

  const logRows = shown.map((l) => {
    const sameType = logsFor(p.id, l.type);
    const prev = sameType[sameType.findIndex((x) => x.id === l.id) + 1];
    const gap = prev ? Math.round((parseDate(l.date) - parseDate(prev.date)) / DAY) : null;
    return `
      <tr>
        <td>${esc(prettyDate(l.date))}<span class="cell-sub">${esc(agoPhrase(daysSince(l.date)))}</span></td>
        <td><span class="tag${l.type === 'water' ? '' : ' tag-none'}">${esc(typeLabel(l.type))}</span></td>
        <td>${typeof l.moisture === 'number'
              ? `<span class="pill pill-${moistureKey(p, l.moisture)}">${l.moisture}</span>`
              : '<span class="dash">—</span>'}</td>
        <td class="num">${gap === null ? '<span class="dash">—</span>' : gap + ' d'}</td>
        <td class="wrap-cell">${esc(l.detail) || '<span class="dash">—</span>'}</td>
        <td class="wrap-cell">${esc(l.notes) || '<span class="dash">—</span>'}</td>
        <td>
          <button class="btn-sm btn-quiet" data-action="edit-log" data-log="${esc(l.id)}" type="button">Edit</button>
          <button class="btn-sm btn-quiet" data-action="delete-log" data-log="${esc(l.id)}" type="button">Delete</button>
        </td>
      </tr>`;
  }).join('');

  const chart = moistureChart(p);

  app.innerHTML = `
    <button class="crumb" data-action="home" type="button">← All plants</button>

    <div class="detail-head">
      <div>
        <h1>${esc(p.name)}</h1>
        ${p.species ? `<div class="species">${esc(p.species)}</div>` : ''}
      </div>
      <div class="detail-head-actions">
        <button class="btn btn-primary" data-action="quick-check" data-plant="${esc(p.id)}" type="button">Check the soil</button>
        <button class="btn" data-action="new-log" data-plant="${esc(p.id)}" type="button">Add a log</button>
        <button class="btn" data-action="edit-plant" data-plant="${esc(p.id)}" type="button">Edit</button>
      </div>
    </div>

    <div class="stats">
      ${stat(reading ? reading.moisture : '—', 'last meter reading',
             reading ? `${moistureLabel(reading.moisture)}, ${agoPhrase(daysSince(reading.date))}` : 'none logged')}
      ${stat(lastWater ? daysSince(lastWater.date) : '—', 'days since watering',
             cs.dd ? `usually dries out in ${cs.dd.days}` : 'no rhythm yet')}
      ${stat(water ? water.avg.toFixed(1) : '—', 'average days between',
             water ? `ranged ${water.min}–${water.max}` : 'needs two waterings')}
      ${stat(lastRepot ? agoPhrase(daysSince(lastRepot.date)).replace(' ago', '') : '—', 'since repotting',
             lastRepot ? prettyDate(lastRepot.date) : 'never logged')}
      ${stat(lastFert ? agoPhrase(daysSince(lastFert.date)).replace(' ago', '') : '—', 'since fertilizing',
             lastFert ? prettyDate(lastFert.date) : 'never logged')}
    </div>

    ${lightPanel}

    ${chart ? `
    <div class="panel">
      <div class="panel-head"><h2>Moisture readings</h2></div>
      <div class="panel-pad">
        ${chart}
        <p class="chart-caption">Filled dots are readings taken when you watered.
           The line across is where you've said to water this one.</p>
      </div>
    </div>` : ''}

    ${seasonPanel}

    <div class="panel">
      <div class="panel-head"><h2>Care card</h2></div>
      <div class="panel-pad">
        <dl class="spec">
          ${spec('How to water', p.waterMethod)}
          ${spec('Water when the meter reads', `${waterAt(p)} or below`)}
          ${spec('Watering personality', p.droughtTolerant
            ? `Drought-tolerant — narrow "worth a check" buffer (${checkBuffer(p)} units above the line)`
            : '')}
          ${spec('Window', p.windowDirection ? `faces ${p.windowDirection}` : '')}
          ${spec('Distance from glass', p.distance)}
          ${spec('In the way', p.obstruction)}
          ${spec('Grow light', Number(p.growLightHours) > 0 ? `${p.growLightHours} hours a day` : '')}
          ${spec('Pot', potSummary(p))}
          ${spec('Soil', p.soil)}
          ${spec('Where it lives', p.location)}
          ${spec('In my care since', p.acquired ? prettyDate(p.acquired) : '')}
        </dl>
        ${p.careNotes ? `<dl class="spec" style="margin-top:16px">${spec('Care instructions', p.careNotes, true)}</dl>` : ''}
        ${p.notes ? `<dl class="spec" style="margin-top:16px">${spec('Notes', p.notes, true)}</dl>` : ''}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>History</h2>
        <div class="right">
          <select id="log-filter" style="width:auto">
            <option value="all">Everything (${logsFor(p.id).length})</option>
            ${usedTypes.map((t) => `<option value="${esc(t)}"${ui.logFilter === t ? ' selected' : ''}>${esc(typeLabel(t))} (${logsFor(p.id, t).length})</option>`).join('')}
          </select>
          <button class="btn btn-sm" data-action="new-log" data-plant="${esc(p.id)}" type="button">Add a log</button>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Date</th><th>What</th><th>Meter</th><th class="num">Gap</th><th>Details</th><th>Notes</th><th></th></tr></thead>
          <tbody>${logRows || `<tr><td colspan="7" style="padding:30px;text-align:center;color:var(--muted)">No entries yet.</td></tr>`}</tbody>
        </table>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" data-action="archive-plant" data-plant="${esc(p.id)}" type="button">
        ${p.archived ? 'Bring back to the list' : 'Archive this plant'}
      </button>
      <button class="btn btn-danger" data-action="delete-plant" data-plant="${esc(p.id)}" type="button">Delete plant and history</button>
    </div>`;

  document.getElementById('log-filter').addEventListener('change', (e) => {
    ui.logFilter = e.target.value;
    render();
  });
}