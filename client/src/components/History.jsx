const fmt = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const WX = { clear: 'Clear', heatwave: 'Heatwave', storm: 'Storm', coldsnap: 'Cold snap' };

export default function History({ items, activeId, onPick, onDelete, onClear, loading }) {
  return (
    <aside className="panel history" aria-label="Audit log">
      <div className="h-head">
        <h2>Audit log</h2>
        {items.length > 0 && <button className="link" onClick={onClear}>Clear all</button>}
      </div>
      {loading && <p className="hint">Loading runs...</p>}
      {!loading && items.length === 0 && (
        <p className="empty">No runs logged yet. Adjust the scenario and choose Run and log simulation to start your history.</p>
      )}
      <ul>
        {items.map((s) => (
          <li key={s.id} className={s.id === activeId ? 'active' : ''}>
            <button className="h-item" onClick={() => onPick(s)} aria-pressed={s.id === activeId}>
              <span className={`badge ${s.status}`}>{s.riskPct.toFixed(0)}%</span>
              <span className="h-main">
                <b>{s.inputs.evCount.toLocaleString()} EVs, {WX[s.inputs.weather]}</b>
                <small>Peak {s.peakLoadMW.toFixed(0)} MW at {String(s.peakHour).padStart(2, '0')}:00 &middot; {fmt(s.createdAt)}</small>
              </span>
            </button>
            <button className="x" aria-label="Delete run" onClick={() => onDelete(s.id)}>&times;</button>
          </li>
        ))}
      </ul>
      {activeId && <p className="hint">Dashed line on the chart shows the selected archived run. Select it again to remove.</p>}
    </aside>
  );
}
