import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import Controls from './components/Controls';
import LoadChart from './components/LoadChart';
import RiskGauge from './components/RiskGauge';
import History from './components/History';

const DEFAULTS = { evCount: 60000, weather: 'clear', peakHour: 19, strategy: 'uncontrolled' };
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
const STATUS_TEXT = { stable: 'Grid stable', elevated: 'Elevated load', critical: 'Critical risk' };

export default function App() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [meta, setMeta] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [compare, setCompare] = useState(null);
  const [db, setDb] = useState('...');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef();

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const loadHistory = useCallback(async () => {
    try { setHistory(await api.list()); } catch (e) { setError(e.message); } finally { setHistLoading(false); }
  }, []);

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setError(e.message));
    api.health().then((h) => setDb(h.database)).catch(() => setDb('offline'));
    loadHistory();
  }, [loadHistory]);

  // Live forecast preview (debounced, cancels stale requests)
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try { setResult(await api.forecast(inputs, ctrl.signal)); setError(''); }
      catch (e) { if (e.name !== 'AbortError') setError(`Cannot reach the forecasting service. ${e.message}`); }
    }, 120);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [inputs]);

  const save = async () => {
    setSaving(true);
    try {
      const rec = await api.save(inputs);
      setHistory((h) => [rec, ...h]);
      notify('Simulation logged to audit ledger');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    try {
      await api.remove(id);
      setHistory((h) => h.filter((s) => s.id !== id));
      if (compare?.id === id) setCompare(null);
      notify('Run deleted');
    } catch (e) { setError(e.message); }
  };

  const clearAll = async () => {
    if (!window.confirm('Delete every logged simulation? This cannot be undone.')) return;
    try { await api.clear(); setHistory([]); setCompare(null); notify('Audit log cleared'); } catch (e) { setError(e.message); }
  };

  const exportCsv = () => {
    const rows = ['hour,city_baseline_mw,ev_load_mw,total_mw,capacity_mw',
      ...result.totalMW.map((t, h) => `${hh(h)},${result.baselineMW[h]},${result.evLoadMW[h]},${t},${result.capacityMW}`)];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'voltstream-forecast.csv' });
    a.click(); URL.revokeObjectURL(url);
  };

  const critical = result?.status === 'critical';

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#17233B" /><path d="M36 8 16 36h14l-4 20 22-30H34z" fill="#3CC8F4" /></svg>
          <div><h1>VoltStream</h1><p>EV grid load forecasting</p></div>
        </div>
        <div className="top-r">
          <span className="pill"><i className={`dot ${db === 'offline' ? 'bad' : 'ok'}`} />{db === 'mongodb' ? 'MongoDB connected' : db === 'memory' ? 'In-memory store' : db === 'offline' ? 'API offline' : 'Connecting'}</span>
          {result && <span className={`pill s-${result.status}`}>{STATUS_TEXT[result.status]}</span>}
        </div>
      </header>

      {critical && (
        <div className="alarm" role="alert">
          <strong>Grid security warning</strong>
          <span>Blackout risk is {result.riskPct.toFixed(1)}%, above the 70% critical threshold. Apply mitigation now.</span>
        </div>
      )}
      {error && <div className="err" role="alert">{error}</div>}

      <main className="layout">
        <Controls value={inputs} onChange={setInputs} meta={meta} onSave={save} saving={saving} />

        <div className="center">
          {result ? (
            <>
              <section className="panel summary">
                <RiskGauge risk={result.riskPct} status={result.status} />
                <dl className="stats">
                  <div><dt>Peak load</dt><dd className="num">{result.peakLoadMW.toFixed(0)}<small> MW</small></dd></div>
                  <div><dt>Peak hour</dt><dd className="num">{hh(result.peakHour)}</dd></div>
                  <div><dt>Capacity used</dt><dd className="num">{result.utilizationPct.toFixed(1)}<small>%</small></dd></div>
                  <div><dt>Hours over capacity</dt><dd className="num">{result.overloadHours}<small> h</small></dd></div>
                </dl>
              </section>

              <section className="panel">
                <div className="p-head">
                  <h2>24-hour load forecast</h2>
                  <button className="ghost" onClick={exportCsv}>Export CSV</button>
                </div>
                <LoadChart data={result} compare={compare} />
              </section>

              <section className="panel">
                <h2>AI advisory</h2>
                <ul className="advice">{result.advisories.map((a) => <li key={a}>{a}</li>)}</ul>
              </section>
            </>
          ) : (
            <section className="panel skeleton" aria-busy="true">Calculating forecast...</section>
          )}
        </div>

        <History items={history} loading={histLoading} activeId={compare?.id}
          onPick={(s) => setCompare((c) => (c?.id === s.id ? null : s))} onDelete={remove} onClear={clearAll} />
      </main>

      <footer className="foot">VoltStream simulates demand with a deterministic model for planning and education. It is not connected to live utility telemetry.</footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
