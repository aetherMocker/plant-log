/* ---------------- moisture ---------------- */

function moistureLabel(v) {
  if (v === null || v === undefined) return '';
  const pct = v / MOISTURE_MAX;
  if (pct <= 0.2) return 'bone dry';
  if (pct <= 0.35) return 'dry';
  if (pct <= 0.55) return 'drying out';
  if (pct <= 0.75) return 'moist';
  return 'wet';
}

function moistureKey(plant, v) {
  if (v === null || v === undefined) return 'none';
  const threshold = waterAt(plant);
  if (v <= threshold) return 'dry';
  if (v <= threshold + 2) return 'soon';
  return 'wet';
}

const waterAt = (p) => (Number(p.waterAt) > 0 ? Number(p.waterAt) : DEFAULT_WATER_AT);

/** Most recent log carrying an actual meter reading. */
function lastReading(plantId) {
  return logsFor(plantId).find((l) => typeof l.moisture === 'number') || null;
}

/* ---------------- logs & stats ---------------- */

function logsFor(plantId, type) {
  return DB.logs
    .filter((l) => l.plantId === plantId && (!type || l.type === type))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
                    String(b.createdAt).localeCompare(String(a.createdAt)));
}

const lastLog = (plantId, type) => logsFor(plantId, type)[0] || null;

/** Checking and watering both count as laying hands on the plant. */
function lastTouch(plantId) {
  return logsFor(plantId).find((l) => l.type === 'check' || l.type === 'water') || null;
}

/** Gaps in days between consecutive logs of one type. */
function gaps(plantId, type) {
  const dates = logsFor(plantId, type).map((l) => l.date).sort();
  const out = [];
  for (let i = 1; i < dates.length; i++) {
    const g = Math.round((parseDate(dates[i]) - parseDate(dates[i - 1])) / DAY);
    if (g > 0) out.push({ gap: g, from: dates[i - 1], to: dates[i] });
  }
  return out;
}

function gapStats(plantId, type) {
  const g = gaps(plantId, type).map((x) => x.gap);
  if (!g.length) return null;
  return { avg: g.reduce((a, b) => a + b, 0) / g.length, min: Math.min(...g), max: Math.max(...g), n: g.length };
}

/**
 * How long this plant typically takes to dry out. Recent gaps are weighted
 * more heavily than old ones, because the seasons move.
 */
function dryDown(plant) {
  if (Number(plant.checkEveryDays) > 0) {
    return { days: Number(plant.checkEveryDays), source: 'your reminder' };
  }
  const g = gaps(plant.id, 'water');
  if (!g.length) return null;
  const recent = g.slice(-6);
  const avg = recent.reduce((a, b) => a + b.gap, 0) / recent.length;
  return { days: Math.max(1, Math.round(avg)), source: `its last ${recent.length} dry-downs`, n: g.length };
}

/**
 * Checks status of plant from last meter reading (soil check) to the "water at".
 * Not a reminder or instruction to water, but a *nudge* to at least check the soil again.
 */
function checkStatus(plant) {
  const touch = lastTouch(plant.id);
  const since = touch ? daysSince(touch.date) : null;
  const dd = dryDown(plant);
  const threshold = waterAt(plant);
  const lastWater = lastLog(plant.id, 'water');
  const reading = lastReading(plant.id);

  /* A reading only reflects the plant's *current* state if it was taken
  after the last watering — a moisture value attached to a 'water' log
  is the pre-water reading from a previous cycle, not where things sit now. */
  const currentReading = reading && reading.type === 'check' &&
    (!lastWater || reading.date >= lastWater.date) ? reading : null;

  if (currentReading) {
    /* The "approaching time to check" zone is a fixed number of meter
       units above the water-at line — NOT a fraction of the whole
       0–MOISTURE_MAX scale. Scaling against the full scale punished
       plants with a low water-at line (succulents, cacti): a reading
       just 1–2 units above their line used up most of that huge span
       and read as "due," even though sitting barely above the line is
       exactly where a drought-tolerant plant is supposed to live most
       of the time. checkBuffer() picks a buffer width per plant. */
    const buffer = checkBuffer(plant);
    const above = currentReading.moisture - threshold; // meter units above the line
    const ratio = Math.max(0, 1 - above / buffer);      // 1 = right at the line, 0 = a full buffer clear of it
    const pct = Math.max(3, Math.min(100, ratio * 100));
    const atOrBelow = currentReading.moisture <= threshold;
    const key = atOrBelow ? 'over' : ratio < 0.6 ? 'ok' : ratio < 0.85 ? 'soon' : 'due';
    const label = atOrBelow ? 'dry' : `${currentReading.moisture}/${threshold}`;
    return { key, since, dd, pct, sort: ratio, label };
  }

  if (since === null || !dd) return { key: 'none', since, dd, pct: 0, sort: -1, label: '' };

  /* No fresh reading to go on yet — fall back to the calendar rhythm.
     This part already adapts per plant on its own, no extra setting
     needed: dd.days comes from *this plant's* own recent watering gaps,
     so a succulent that's historically gone 40 days between waterings
     won't get flagged until it's proportionally close to 40 days again. */
  const ratio = since / dd.days;
  const key = ratio < 0.6 ? 'ok' : ratio < 0.9 ? 'soon' : ratio < 1.3 ? 'due' : 'over';
  return { key, since, dd, pct: Math.max(3, Math.min(100, ratio * 100)), sort: ratio, label: `${since}/${dd.days}d` };
}

/** How many meter units above the water-at line still feel comfortable,
    before the "worth a check" meter starts climbing. An explicit
    plant.checkBuffer (set by hand in data.json, say) always wins; otherwise
    it's the drought-tolerant or standard default from constants.js. */
function checkBuffer(plant) {
  const explicit = Number(plant.checkBuffer);
  if (explicit > 0) return explicit;
  return plant.droughtTolerant ? DROUGHT_TOLERANT_CHECK_BUFFER : STANDARD_CHECK_BUFFER;
}

/** Today's light for a plant, or null if latitude isn't set yet. */
function lightNow(plant) {
  const la = lat();
  return la === null ? null : plantLight(plant, la, today());
}

/**
 * Does this plant dry out faster when the days are long? Splits its
 * watering gaps by how much daylight there was over each interval.
 */
function dryDownByDaylight(plant) {
  const la = lat();
  if (la === null) return null;
  const long = [], short = [];
  for (const g of gaps(plant.id, 'water')) {
    const mid = new Date((parseDate(g.from).getTime() + parseDate(g.to).getTime()) / 2);
    const hours = daylightHours(la, dayOfYear(mid));
    (hours >= 12 ? long : short).push(g.gap);
  }
  if (long.length < 2 || short.length < 2) return null;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return { long: mean(long), longN: long.length, short: mean(short), shortN: short.length };
}