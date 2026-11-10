const PRESETS = [
  { name: 'Typical weekday', v: { evCount: 40000, weather: 'clear', peakHour: 18, strategy: 'uncontrolled' } },
  { name: 'Summer heatwave', v: { evCount: 90000, weather: 'heatwave', peakHour: 19, strategy: 'uncontrolled' } },
  { name: 'Storm night', v: { evCount: 60000, weather: 'storm', peakHour: 20, strategy: 'uncontrolled' } },
  { name: 'Holiday rush', v: { evCount: 140000, weather: 'clear', peakHour: 17, strategy: 'uncontrolled' } },
];

export default function Controls({ value, onChange, meta, onSave, saving }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <section className="panel controls" aria-label="Simulation controls">
      <h2>Scenario</h2>
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.name} className="chip" onClick={() => onChange(p.v)}>{p.name}</button>
        ))}
      </div>

      <label className="field">
        <span>Vehicles charging <b className="num">{value.evCount.toLocaleString()}</b></span>
        <input type="range" min="0" max="150000" step="1000" value={value.evCount}
          onChange={(e) => set('evCount', +e.target.value)} />
      </label>

      <label className="field">
        <span>Peak charging time <b className="num">{String(value.peakHour).padStart(2, '0')}:00</b></span>
        <input type="range" min="0" max="23" step="1" value={value.peakHour}
          onChange={(e) => set('peakHour', +e.target.value)} />
      </label>

      <fieldset className="field">
        <legend>Weather</legend>
        <div className="seg">
          {(meta?.weather || []).map((w) => (
            <button key={w.id} className={value.weather === w.id ? 'on' : ''} onClick={() => set('weather', w.id)}>{w.label}</button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Charging strategy</span>
        <select value={value.strategy} onChange={(e) => set('strategy', e.target.value)}>
          {(meta?.strategies || []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>

      <button className="primary" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Run and log simulation'}</button>
      <p className="hint">The chart updates as you adjust inputs. Logging stores the run in the audit ledger.</p>
    </section>
  );
}
