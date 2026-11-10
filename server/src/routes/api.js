const express = require('express');
const { forecast, WEATHER, STRATEGIES, LIMITS } = require('../services/forecast');
const store = require('../services/store');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/health', (req, res) =>
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), database: store.mode(), time: new Date().toISOString() }));

router.get('/meta', (req, res) =>
  res.json({
    weather: Object.entries(WEATHER).map(([id, v]) => ({ id, label: v.label })),
    strategies: Object.entries(STRATEGIES).map(([id, v]) => ({ id, label: v.label })),
    limits: LIMITS,
  }));

// Live preview: compute only, nothing is stored.
router.post('/forecast', (req, res) => res.json(forecast(req.body)));

// Run and log: compute and commit to the audit ledger.
router.post('/simulations', wrap(async (req, res) => {
  const result = forecast(req.body);
  res.status(201).json(await store.create(result));
}));

router.get('/simulations', wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  res.json(await store.list(limit));
}));

router.get('/simulations/:id', wrap(async (req, res) => {
  const sim = await store.get(req.params.id);
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  res.json(sim);
}));

router.delete('/simulations/:id', wrap(async (req, res) => {
  if (!(await store.remove(req.params.id))) return res.status(404).json({ error: 'Simulation not found' });
  res.status(204).end();
}));

router.delete('/simulations', wrap(async (req, res) => { await store.clear(); res.status(204).end(); }));

module.exports = router;
