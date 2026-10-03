/* ---------------- charts ---------------- */

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

/** Light through the year for one plant, with waterings marked underneath. */
function yearLightChart(plant) {
  const la = lat();
  if (la === null) return '';

  const W = 720, H = 180, L = 30, R = 12, T = 14, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const { peak } = annualRange(plant, la);
  const top = Math.max(peak, 5) * 1.15;

  const x = (n) => L + ((n - 1) / 364) * iw;
  const y = (v) => T + ih - (v / top) * ih;

  let path = '', area = '';
  for (let n = 1; n <= 365; n += 2) {
    const px = x(n).toFixed(1), py = y(lightScoreOn(plant, la, n)).toFixed(1);
    path += `${path ? 'L' : 'M'}${px} ${py}`;
    area += `${area ? 'L' : `M${L} ${T + ih}L`}${px} ${py}`;
  }
  area += `L${(L + iw).toFixed(1)} ${T + ih}Z`;

  const n0 = dayOfYear(today());
  const todayScore = lightScoreOn(plant, la, n0);

  const months = MONTH_STARTS.map((n, i) =>
    `<text x="${x(n) + 2}" y="${H - 14}" class="cx-tick">${MONTHS[i]}</text>
     <line x1="${x(n)}" y1="${T}" x2="${x(n)}" y2="${T + ih}" class="cx-grid"/>`).join('');

  const marks = [...new Set(logsFor(plant.id, 'water').map((l) => l.date))].map((d) => {
    const n = dayOfYear(parseDate(d));
    return `<line x1="${x(n).toFixed(1)}" y1="${T + ih + 3}" x2="${x(n).toFixed(1)}" y2="${T + ih + 9}" class="cx-mark"/>`;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img"
         aria-label="Light through the year for ${esc(plant.name)}">
      ${months}
      <path d="${area}" class="cx-area"/>
      <path d="${path}" class="cx-line"/>
      <line x1="${x(n0)}" y1="${T}" x2="${x(n0)}" y2="${T + ih + 10}" class="cx-today"/>
      <circle cx="${x(n0)}" cy="${y(todayScore)}" r="4" class="cx-dot"/>
      <text x="${L - 6}" y="${y(peak) + 4}" class="cx-tick cx-right">${Math.round(peak)}</text>
      <text x="${L - 6}" y="${T + ih + 4}" class="cx-tick cx-right">0</text>
      ${marks}
    </svg>`;
}

/** Meter readings over time, against the plant's water-at line. */
function moistureChart(plant, days = 150) {
  const readings = logsFor(plant.id)
    .filter((l) => typeof l.moisture === 'number' && daysSince(l.date) <= days)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (readings.length < 2) return '';

  const W = 720, H = 160, L = 26, R = 12, T = 12, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const x = (d) => L + (1 - Math.min(days, daysSince(d)) / days) * iw;
  const y = (v) => T + ih - (v / MOISTURE_MAX) * ih;

  const line = readings.map((r, i) => `${i ? 'L' : 'M'}${x(r.date).toFixed(1)} ${y(r.moisture).toFixed(1)}`).join('');
  const dots = readings.map((r) =>
    `<circle cx="${x(r.date).toFixed(1)}" cy="${y(r.moisture).toFixed(1)}" r="${r.type === 'water' ? 4.5 : 3}"
      class="${r.type === 'water' ? 'cx-dot-water' : 'cx-dot-read'}"><title>${esc(prettyDate(r.date))}: ${r.moisture}${r.type === 'water' ? ' — watered' : ''}</title></circle>`).join('');

  const thresholdY = y(waterAt(plant)).toFixed(1);

  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Soil moisture readings for ${esc(plant.name)}">
      <line x1="${L}" y1="${thresholdY}" x2="${W - R}" y2="${thresholdY}" class="cx-threshold"/>
      <text x="${W - R}" y="${Number(thresholdY) - 5}" class="cx-tick cx-right">water at ${waterAt(plant)}</text>
      <path d="${line}" class="cx-line cx-line-moist"/>
      ${dots}
      <text x="${L - 4}" y="${y(MOISTURE_MAX) + 4}" class="cx-tick cx-right">${MOISTURE_MAX}</text>
      <text x="${L - 4}" y="${y(0) + 4}" class="cx-tick cx-right">0</text>
      <text x="${L}" y="${H - 10}" class="cx-tick">${days} days ago</text>
      <text x="${W - R}" y="${H - 10}" class="cx-tick cx-right">today</text>
    </svg>`;
}
