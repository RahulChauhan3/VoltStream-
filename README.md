<div align="center">

# ⚡ VoltStream

### Smart-city EV charging & power grid load forecasting dashboard

Move the sliders. Watch the grid respond. Catch a blackout before it happens.

![MERN](https://img.shields.io/badge/stack-MERN-3CC8F4) ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white) ![Node](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white) ![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Overview

When thousands of electric vehicles fast-charge at the same time, city power grids can be pushed past capacity. **VoltStream** is a digital-twin control room that makes this risk visible. Operators change real-world variables (number of charging EVs, weather, peak charging hour, charging strategy) and instantly see a 24-hour load forecast, the exact peak hour, a **blackout risk percentage**, and actionable recommendations.

Every simulation can be logged to a MongoDB Atlas audit ledger and overlaid on the live chart for comparison.

## Features

| Area | What you get |
|---|---|
| **Control center** | Sliders for EV count and peak hour, weather selector, charging strategy, one-click scenario presets |
| **Forecast engine** | 24-hour load curve in MW, peak hour detection, grid utilisation, hours over capacity, logistic blackout risk |
| **Live analytics** | Custom SVG chart with hover tooltips, capacity line, overload highlighting, animated risk gauge |
| **Security warning** | Flashing alert banner when risk reaches the 70% critical threshold |
| **AI advisory** | Rule-based recommendations: staggered charging, vehicle-to-grid discharge, demand response |
| **Audit ledger** | Every logged run saved to MongoDB; click any past run to overlay it on the current forecast |
| **Pro touches** | CSV export, responsive layout, keyboard focus states, reduced-motion support, toasts, error handling |
| **Hardening** | Helmet, CORS allow-list, rate limiting, strict input validation, graceful shutdown |

> **No database yet?** Leave `MONGODB_URI` empty and the API falls back to an in-memory store, so the app runs immediately.

## Tech stack

- **Frontend:** React 18, Vite 5, hand-written SVG charts (zero chart dependencies), responsive CSS grid
- **Backend:** Node.js, Express 4, Helmet, express-rate-limit, Morgan
- **Database:** MongoDB Atlas with Mongoose ODM
- **Tests & CI:** Node's built-in test runner, GitHub Actions

## Project structure

```
voltstream/
├── client/                    # React + Vite frontend
│   ├── public/favicon.svg
│   └── src/
│       ├── components/        # Controls, LoadChart, RiskGauge, History
│       ├── api.js             # Fetch wrapper for the REST API
│       ├── App.jsx            # State, live forecast, audit log
│       └── styles.css         # Design tokens and layout
├── server/
│   ├── src/
│   │   ├── config/db.js       # MongoDB connection (with fallback)
│   │   ├── models/            # Mongoose schema
│   │   ├── routes/api.js      # REST endpoints
│   │   ├── services/
│   │   │   ├── forecast.js    # Forecasting engine
│   │   │   └── store.js       # Repository (MongoDB or memory)
│   │   ├── app.js             # Express app + security middleware
│   │   └── index.js           # Entry point
│   └── test/                  # Unit tests for the engine
├── .github/workflows/ci.yml   # Test + build on every push
├── render.yaml                # One-click Render deployment
└── package.json               # Root scripts
```

## Getting started

**Prerequisites:** Node.js 18+ and (optionally) a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
# 1. Install everything
npm install                # root tooling (concurrently)
npm run install:all        # server + client

# 2. Configure the server
cp server/.env.example server/.env
# add your MONGODB_URI (optional)

# 3. Run both apps
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000/api/health

### MongoDB Atlas setup

1. Create a free cluster and a database user.
2. Under **Network Access**, allow your IP (or `0.0.0.0/0` for deployment).
3. Copy the connection string into `MONGODB_URI` in `server/.env`.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status and active storage mode |
| `GET` | `/api/meta` | Available weather types, strategies, input limits |
| `POST` | `/api/forecast` | Compute a forecast (not stored) |
| `POST` | `/api/simulations` | Compute and log a run |
| `GET` | `/api/simulations?limit=25` | List logged runs, newest first |
| `GET` | `/api/simulations/:id` | Fetch one run |
| `DELETE` | `/api/simulations/:id` | Delete one run |
| `DELETE` | `/api/simulations` | Clear the audit log |

**Request body**

```json
{ "evCount": 90000, "weather": "heatwave", "peakHour": 19, "strategy": "uncontrolled" }
```

`weather`: `clear | heatwave | storm | coldsnap` · `strategy`: `uncontrolled | staggered | v2g` · `evCount`: 0 to 150,000 · `peakHour`: 0 to 23

## How the forecast works

1. **Baseline:** a 24-point city demand curve (MW) multiplied by a weather demand factor (e.g. heatwave ×1.18).
2. **EV load:** total daily charging energy (`EVs × 28 kWh`) is distributed with a Gaussian curve centred on the chosen peak hour.
3. **Strategy:** *staggered* widens the curve and shifts energy to 00:00-05:00; *v2g* discharges 25% of the fleet (7 kW each) from 17:00 to 21:00 and recharges overnight.
4. **Capacity:** 2,600 MW, derated by weather (storm ×0.90, heatwave ×0.95).
5. **Risk:** `risk = 100 / (1 + e^(-(utilisation - 0.92) × 22))`. Status is *stable* under 40%, *elevated* from 40%, and *critical* from 70%, which triggers the flashing warning.

The model is intentionally deterministic and transparent. Tune the constants at the top of `server/src/services/forecast.js` to match your own city data.

## Deployment

### Option A: single service on Render (recommended)

The Express server serves the built React app, so one service runs everything.

1. Push this repo to GitHub.
2. On [Render](https://render.com), choose **New → Blueprint** and select the repo (`render.yaml` is included).
3. Set the `MONGODB_URI` environment variable.
4. Deploy. Health check: `/api/health`.

### Option B: split hosting

- **Backend** on Render/Railway: build `npm install --prefix server`, start `node server/src/index.js`, set `MONGODB_URI` and `CLIENT_ORIGIN=https://your-frontend-domain`.
- **Frontend** on Vercel/Netlify: root `client`, build `npm run build`, output `dist`. Add a rewrite from `/api/*` to your backend URL.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run API and frontend with hot reload |
| `npm run build` | Build the production frontend |
| `npm start` | Start the production server |
| `npm test` | Run the forecasting engine tests |

## Roadmap

- Live weather and tariff data integration
- User authentication and per-operator ledgers
- Multi-district grid maps
- Forecast model calibration from real telemetry

## License

MIT. Free to use, modify, and showcase in your portfolio.
