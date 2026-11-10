/** Repository layer: MongoDB when connected, otherwise an in-memory fallback. */
const crypto = require('crypto');
const Simulation = require('../models/Simulation');
const { isConnected } = require('../config/db');

const memory = [];
const MAX_MEMORY = 200;

const toPlain = (doc) => {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = String(o._id || o.id);
  delete o._id; delete o.__v;
  return o;
};

module.exports = {
  mode: () => (isConnected() ? 'mongodb' : 'memory'),

  async create(data) {
    if (isConnected()) return toPlain(await Simulation.create(data));
    const now = new Date().toISOString();
    const rec = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    memory.unshift(rec);
    if (memory.length > MAX_MEMORY) memory.pop();
    return rec;
  },

  async list(limit = 25) {
    if (isConnected()) return (await Simulation.find().sort({ createdAt: -1 }).limit(limit)).map(toPlain);
    return memory.slice(0, limit);
  },

  async get(id) {
    if (isConnected()) {
      if (!/^[a-f\d]{24}$/i.test(id)) return null;
      const d = await Simulation.findById(id);
      return d ? toPlain(d) : null;
    }
    return memory.find((m) => m.id === id) || null;
  },

  async remove(id) {
    if (isConnected()) {
      if (!/^[a-f\d]{24}$/i.test(id)) return false;
      return !!(await Simulation.findByIdAndDelete(id));
    }
    const i = memory.findIndex((m) => m.id === id);
    if (i === -1) return false;
    memory.splice(i, 1);
    return true;
  },

  async clear() {
    if (isConnected()) { await Simulation.deleteMany({}); return; }
    memory.length = 0;
  },
};
