const mongoose = require('mongoose');

const simulationSchema = new mongoose.Schema(
  {
    inputs: {
      evCount: { type: Number, required: true, min: 0, max: 150000 },
      weather: { type: String, required: true, enum: ['clear', 'heatwave', 'storm', 'coldsnap'] },
      peakHour: { type: Number, required: true, min: 0, max: 23 },
      strategy: { type: String, default: 'uncontrolled', enum: ['uncontrolled', 'staggered', 'v2g'] },
    },
    capacityMW: Number,
    baselineMW: [Number],
    evLoadMW: [Number],
    totalMW: [Number],
    peakHour: Number,
    peakLoadMW: Number,
    utilizationPct: Number,
    riskPct: { type: Number, index: true },
    overloadHours: Number,
    status: { type: String, enum: ['stable', 'elevated', 'critical'] },
    advisories: [String],
  },
  { timestamps: true }
);

simulationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Simulation', simulationSchema);
