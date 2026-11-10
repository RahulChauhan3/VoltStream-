'use strict';
/**
 * VoltStream forecasting engine.
 * Deterministic model: city baseline demand (MW) x weather factor
 * + EV fast-charging demand (Gaussian-shaped around a chosen peak hour),
 * adjusted by a charging strategy. Risk is a logistic function of
 * grid utilisation (peak load / weather-derated capacity).
 */

const BASE_CURVE = [1180, 1120, 1080, 1060, 1070, 1150, 1350, 1580, 1700, 1690, 1670, 1680,
  1700, 1710, 1720, 1740, 1790, 1900, 2000, 1960, 1800, 1600, 1400, 1260];

const GRID_CAPACITY_MW = 2600;
const KWH_PER_EV = 28; // average fast-charge energy per vehicle per day

const WEATHER = {
  clear:    { label: 'Clear',     demand: 1.0,  capacity: 1.0 },
  heatwave: { label: 'Heatwave',  demand: 1.18, capacity: 0.95 },
  storm:    { label: 'Storm',     demand: 1.08, capacity: 0.9 },
  coldsnap: { label: 'Cold snap', demand: 1.14, capacity: 0.97 },
};

const STRATEGIES = {
  uncontrolled: { label: 'Uncontrolled charging' },
  staggered:    { label: 'Staggered charging' },
  v2g:          { label: 'Vehicle-to-grid discharge' },
};

const LIMITS = { evCount: [0, 150000], peakHour: [0, 23] };

function validate(input = {}) {
  const errors = [];
  const evCount = Number(input.evCount);
  const peakHour = Number(input.peakHour);
  if (!Number.isFinite(evCount) || evCount < LIMITS.evCount[0] || evCount > LIMITS.evCount[1])
    errors.push(`evCount must be a number between ${LIMITS.evCount[0]} and ${LIMITS.evCount[1]}`);
  if (!Number.isInteger(peakHour) || peakHour < 0 || peakHour > 23)
    errors.push('peakHour must be an integer between 0 and 23');
  if (!WEATHER[input.weather]) errors.push(`weather must be one of: ${Object.keys(WEATHER).join(', ')}`);
  const strategy = input.strategy || 'uncontrolled';
  if (!STRATEGIES[strategy]) errors.push(`strategy must be one of: ${Object.keys(STRATEGIES).join(', ')}`);
  return { errors, value: { evCount: Math.round(evCount), peakHour, weather: input.weather, strategy } };
}

const round1 = (n) => Math.round(n * 10) / 10;

function evLoadCurve({ evCount, peakHour, strategy }) {
  const energyMWh = (evCount * KWH_PER_EV) / 1000;
  const sigma = strategy === 'staggered' ? 6 : 2.2;
  const w = Array.from({ length: 24 }, (_, h) => {
    const d = Math.min(Math.abs(h - peakHour), 24 - Math.abs(h - peakHour));
    let x = Math.exp(-(d * d) / (2 * sigma * sigma));
    if (strategy === 'staggered' && h <= 5) x *= 2.2; // off-peak incentive
    return x;
  });
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  const load = w.map((x) => (x / sum) * energyMWh);

  if (strategy === 'v2g') {
    const perHour = evCount * 0.00175; // 25% participation x 7 kW
    const discharge = [17, 18, 19, 20, 21];
    discharge.forEach((h) => { load[h] -= perHour; });
    [1, 2, 3, 4].forEach((h) => { load[h] += (perHour * discharge.length) / 4; });
  }
  return load;
}

function forecast(rawInput) {
  const { errors, value } = validate(rawInput);
  if (errors.length) { const e = new Error('Invalid simulation inputs'); e.status = 400; e.details = errors; throw e; }

  const wx = WEATHER[value.weather];
  const capacityMW = Math.round(GRID_CAPACITY_MW * wx.capacity);
  const baselineMW = BASE_CURVE.map((b) => round1(b * wx.demand));
  const evLoadMW = evLoadCurve(value).map(round1);
  const totalMW = baselineMW.map((b, h) => round1(b + evLoadMW[h]));

  const peakLoadMW = Math.max(...totalMW);
  const peakHour = totalMW.indexOf(peakLoadMW);
  const utilization = peakLoadMW / capacityMW;
  const riskPct = round1(100 / (1 + Math.exp(-(utilization - 0.92) * 22)));
  const overloadHours = totalMW.filter((t) => t > capacityMW).length;
  const status = riskPct >= 70 ? 'critical' : riskPct >= 40 ? 'elevated' : 'stable';

  return {
    inputs: value, capacityMW, baselineMW, evLoadMW, totalMW, peakHour, peakLoadMW,
    utilizationPct: round1(utilization * 100), riskPct, overloadHours, status,
    advisories: advise({ ...value, peakHour, riskPct, status, overloadHours }),
  };
}

function advise(r) {
  const out = [];
  const eveningPeak = r.peakHour >= 17 && r.peakHour <= 21;
  if (r.status === 'critical') out.push('Critical: activate demand-response programmes and notify the grid operator immediately.');
  if (r.strategy === 'uncontrolled' && r.status !== 'stable')
    out.push('Switch to staggered charging: moving sessions to 00:00-05:00 flattens the evening peak.');
  if (r.strategy !== 'v2g' && eveningPeak && r.status !== 'stable')
    out.push('Enable vehicle-to-grid discharge between 17:00 and 21:00 to offset the evening ramp.');
  if (r.weather === 'heatwave') out.push('Heatwave: pre-cool public buildings off-peak and throttle non-essential cooling load.');
  if (r.weather === 'storm') out.push('Storm: line capacity is derated, so keep reserve margin above 15% and stage repair crews.');
  if (r.weather === 'coldsnap') out.push('Cold snap: expect elevated heating demand before 07:00 and after 18:00.');
  if (r.overloadHours > 0) out.push(`Demand exceeds capacity for ${r.overloadHours} hour(s); apply temporary power caps at fast-charge hubs.`);
  if (r.status === 'stable') out.push('Grid is operating within safe margins. Keep monitoring and maintain the current strategy.');
  return out;
}

module.exports = { forecast, validate, WEATHER, STRATEGIES, LIMITS, GRID_CAPACITY_MW };
