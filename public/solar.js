/* ==================================================================
   solar.js — where the sun is, and how much of it reaches a window.

   Everything here is pure math from your latitude and the date. No
   network, no sensors. Accuracy is about a minute on sunrise/sunset
   and a fraction of a degree on sun position, which is far finer
   than anything that matters for a houseplant.

   A rough calculation to create a light score out of 100.
   ================================================================== */

const RAD = Math.PI / 180;

/** Compass bearing each window faces, in degrees clockwise from north. */
const FACING = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

/** How much light survives the trip from the glass to the plant.
    Rough but directionally right — light falls off fast indoors. */
const DISTANCE_FACTOR = {
  'On the sill': 1,
  'Within 3 feet': 0.6,
  '3 to 6 feet': 0.3,
  'Across the room': 0.12,
};

const OBSTRUCTION_FACTOR = {
  'Nothing in the way': 1,
  'Sheer curtain or blinds': 0.6, /* Commercial sheer curtains are commonly rated 60–80% light transmission */
  'Tree or building outside': 0.5,
  'Mostly blocked': 0.25,
};

/** Light that arrives as sky glow rather than direct sun. A north window
    lives entirely on this, which is why it is dim but not dark. */
const AMBIENT_SHARE = 0.15;

/** Ignore the sun below this altitude — at that angle it is behind the
    houses across the street, whoever you are. */
const MIN_ALTITUDE = 3;

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

/** Sun's declination in degrees. Peaks at ±23.44° at the solstices.
    Accounts for the Earth's orbit being slightly elliptical, which keeps
    the equinoxes honest to about a fifth of a degree. */
function declination(n) {
  const a = 0.98565 * RAD * (n + 10);
  const b = 0.98565 * RAD * (n - 2);
  return -Math.asin(0.39779 * Math.cos(a + 1.914 * RAD * Math.sin(b))) / RAD;
}

/** The sun is called "up" when its centre sits 0.833° below the geometric
    horizon: half a sun-width, plus the amount the atmosphere bends its
    light over the edge. Skipping this loses ~12 minutes a day. */
const HORIZON = -0.833;

/** Minutes the sun runs ahead of or behind clock time. */
function equationOfTime(n) {
  const B = (2 * Math.PI / 365) * (n - 81);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/** Hours between sunrise and sunset. */
function daylightHours(lat, n) {
  const d = declination(n) * RAD;
  const phi = lat * RAD;
  const cosH = (Math.sin(HORIZON * RAD) - Math.sin(phi) * Math.sin(d)) /
               (Math.cos(phi) * Math.cos(d));
  if (cosH <= -1) return 24;   // midnight sun
  if (cosH >= 1) return 0;     // polar night
  return (2 * Math.acos(cosH)) / RAD / 15;
}

/** Sun altitude and compass azimuth at a given solar hour (0–24). */
function sunPosition(lat, n, solarHour) {
  const d = declination(n) * RAD;
  const phi = lat * RAD;
  const H = (solarHour - 12) * 15 * RAD;

  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAlt = Math.cos(altitude);
  let azimuth = 180;
  if (Math.abs(cosAlt) > 1e-6 && Math.abs(Math.cos(phi)) > 1e-6) {
    let cosAz = (Math.sin(d) - sinAlt * Math.sin(phi)) / (cosAlt * Math.cos(phi));
    cosAz = Math.max(-1, Math.min(1, cosAz));
    azimuth = Math.acos(cosAz) / RAD;
    if (H > 0) azimuth = 360 - azimuth;   // afternoon sun swings west
  }
  return { altitude: altitude / RAD, azimuth };
}

/** Smallest angle between two compass bearings, 0–180. */
function angleBetween(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Integrate the light a window sees across one day.
 * Units are arbitrary "sun-hours" — only useful compared to each other.
 */
const indexCache = new Map();

function windowLight(lat, n, direction) {
  const key = `${lat.toFixed(2)}|${n}|${direction || '-'}`;
  const hit = indexCache.get(key);
  if (hit) return hit;

  const facing = direction && direction in FACING ? FACING[direction] : null;
  const step = 10 / 60;
  let total = 0, direct = 0, directTime = 0;
  let firstDirect = null, lastDirect = null, peakAltitude = 0;

  for (let h = 0; h < 24; h += step) {
    const { altitude, azimuth } = sunPosition(lat, n, h);
    if (altitude <= MIN_ALTITUDE) continue;

    // sin(altitude) approximates how concentrated the light is: the same
    // beam spread over more floor when the sun is low.
    const energy = Math.sin(altitude * RAD) * step;
    total += energy;
    peakAltitude = Math.max(peakAltitude, altitude);

    if (facing !== null && angleBetween(azimuth, facing) < 90) {
      direct += energy;
      directTime += step;
      if (firstDirect === null) firstDirect = h;
      lastDirect = h + step;
    }
  }

  const result = {
    total,
    direct,
    directHours: directTime,
    // A north window catches sun early and late with a dead patch at midday,
    // so the span it arrives over is not the same as the hours it lasts.
    splitAcrossDay: lastDirect !== null && (lastDirect - firstDirect) - directTime > 0.5,
    received: direct + (total - direct) * AMBIENT_SHARE,
    firstDirect,
    lastDirect,
    peakAltitude,
    daylight: daylightHours(lat, n),
  };
  indexCache.set(key, result);
  return result;
}

/** The best any window anywhere gets: due south, midsummer, nothing in the way.
    This is the 100 that every light score is measured against. */
const bestCaseCache = new Map();
function bestCase(lat) {
  const key = lat.toFixed(2);
  if (bestCaseCache.has(key)) return bestCaseCache.get(key);
  let best = 0;
  for (let n = 1; n <= 365; n += 2) best = Math.max(best, windowLight(lat, n, 'S').received);
  best = best || 1;
  bestCaseCache.set(key, best);
  return best;
}

/** How much of the window's light survives to reach the plant. */
function indoorFactor(plant) {
  return (DISTANCE_FACTOR[plant.distance] ?? 0.6) * (OBSTRUCTION_FACTOR[plant.obstruction] ?? 1);
}

/** The longest natural day this latitude ever sees, found the robust way so it
    works in both hemispheres without hardcoding a solstice date. */
const longestDayCache = new Map();
function longestDaylight(lat) {
  const key = lat.toFixed(2);
  if (longestDayCache.has(key)) return longestDayCache.get(key);
  let max = 0;
  for (let n = 1; n <= 365; n++) max = Math.max(max, daylightHours(lat, n));
  longestDayCache.set(key, max);
  return max;
}

/**
 * Energy per hour a grow light counts for, calibrated so that running one for
 * as many hours as your longest natural day scores the same as a perfect
 * south sill on that same day (100). Cooler latitudes have longer summer
 * days, so the same number of grow-light hours scores lower there than it
 * would somewhere closer to the equator — same logic as natural light.
 */
function growLightRate(lat) {
  return bestCase(lat) / longestDaylight(lat);
}

/** Light score on any day of the year — used to draw the seasonal curve. */
function lightScoreOn(plant, lat, n) {
  const growHours = Number(plant.growLightHours) > 0 ? Number(plant.growLightHours) : 0;
  if (growHours > 0) {
    // A grow light runs on your schedule, not the sun's — flat all year.
    return (growHours * growLightRate(lat) / bestCase(lat)) * 100;
  }
  const received = windowLight(lat, n, plant.windowDirection).received * indoorFactor(plant);
  return (received / bestCase(lat)) * 100;
}

/** The plant's own best and worst days, so we can say "40% of its June peak". */
const peakCache = new Map();
function annualRange(plant, lat) {
  const key = `${lat.toFixed(2)}|${plant.windowDirection || '-'}|${plant.distance}|${plant.obstruction}`;
  if (peakCache.has(key)) return peakCache.get(key);
  let peak = 0, trough = Infinity, peakDay = 1, troughDay = 1;
  for (let n = 1; n <= 365; n += 2) {
    const v = lightScoreOn(plant, lat, n);
    if (v > peak) { peak = v; peakDay = n; }
    if (v < trough) { trough = v; troughDay = n; }
  }
  const out = { peak, trough, peakDay, troughDay };
  peakCache.set(key, out);
  return out;
}

/**
 * A plant's light on a given day.
 *   score  — 0–100, comparable between plants
 *   ofPeak — 0–100, this plant against its own best day of the year
 */
function plantLight(plant, lat, date) {
  if (typeof lat !== 'number' || Number.isNaN(lat)) return null;
  const n = dayOfYear(date);
  const growHours = Number(plant.growLightHours) > 0 ? Number(plant.growLightHours) : 0;

  if (growHours > 0) {
    // Grow lights don't track the sun, so there's no "today vs. its own peak"
    // — every day is the same day. Nothing here depends on the date.
    const received = growHours * growLightRate(lat);
    const score = Math.round((received / bestCase(lat)) * 100);
    return {
      received,
      score,
      ofPeak: 100,
      isGrowLight: true,
      growHours,
      peakDay: null,
      directHours: growHours,
      splitAcrossDay: false,
      firstDirect: null,
      lastDirect: null,
      daylight: daylightHours(lat, n),   // still worth showing: today's real outdoor daylight
      peakAltitude: null,
    };
  }

  const raw = windowLight(lat, n, plant.windowDirection);
  const received = raw.received * indoorFactor(plant);
  const score = (received / bestCase(lat)) * 100;
  const { peak, peakDay } = annualRange(plant, lat);

  return {
    received,
    score: Math.round(score),
    ofPeak: peak > 0 ? Math.round((score / peak) * 100) : 0,
    isGrowLight: false,
    peakDay,
    directHours: raw.directHours,
    splitAcrossDay: raw.splitAcrossDay,
    firstDirect: raw.firstDirect,
    lastDirect: raw.lastDirect,
    daylight: raw.daylight,
    peakAltitude: raw.peakAltitude,
  };
}

/**
 * Is the machine's clock in a timezone that matches this longitude?
 * A zone can sit up to ~3 hours off solar time legitimately (Spain, western
 * China), but beyond that the machine is somewhere else and converting solar
 * time to clock time would produce nonsense like a sunset at 2am.
 */
function clockZoneMatches(lng, date) {
  if (typeof lng !== 'number' || Number.isNaN(lng)) return false;
  const offsetHours = -date.getTimezoneOffset() / 60;
  return Math.abs(offsetHours - lng / 15) <= 3;
}

/** Convert solar hour to clock hour for a real place and date. */
function solarToClock(solarHour, lat, lng, date) {
  if (solarHour === null || !clockZoneMatches(lng, date)) return null;
  const n = dayOfYear(date);
  const offsetHours = -date.getTimezoneOffset() / 60;   // handles DST for that date
  const lstm = 15 * offsetHours;
  const correctionMinutes = 4 * (lng - lstm) + equationOfTime(n);
  return solarHour - correctionMinutes / 60;
}

function formatHour(h) {
  if (h === null || h === undefined) return '—';
  let hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h - Math.floor(h)) * 60) % 60;
  const suffix = hh >= 12 ? 'pm' : 'am';
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}:${String(mm).padStart(2, '0')}${suffix}`;
}

/** Minutes of daylight gained (+) or lost (−) per day right now. */
function daylightTrend(lat, date) {
  const n = dayOfYear(date);
  return (daylightHours(lat, n + 3) - daylightHours(lat, n - 3)) / 6 * 60;
}