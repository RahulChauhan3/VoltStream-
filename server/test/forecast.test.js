const test = require('node:test');
const assert = require('node:assert');
const { forecast } = require('../src/services/forecast');

const base = { evCount: 50000, weather: 'clear', peakHour: 19, strategy: 'uncontrolled' };

test('returns 24 hourly points', () => {
  const r = forecast(base);
  assert.strictEqual(r.totalMW.length, 24);
  assert.ok(r.riskPct >= 0 && r.riskPct <= 100);
});

test('more EVs and heatwave increase risk', () => {
  const calm = forecast(base);
  const hot = forecast({ ...base, evCount: 120000, weather: 'heatwave' });
  assert.ok(hot.riskPct > calm.riskPct);
  assert.strictEqual(hot.status, 'critical');
});

test('staggered charging lowers peak load', () => {
  const a = forecast({ ...base, evCount: 120000 });
  const b = forecast({ ...base, evCount: 120000, strategy: 'staggered' });
  assert.ok(b.peakLoadMW < a.peakLoadMW);
});

test('rejects invalid input', () => {
  assert.throws(() => forecast({ ...base, weather: 'meteor' }), /Invalid/);
  assert.throws(() => forecast({ ...base, evCount: -5 }), /Invalid/);
});
