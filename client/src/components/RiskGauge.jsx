export default function RiskGauge({ risk, status }) {
  return (
    <div className={`gauge ${status}`} role="meter" aria-valuenow={risk} aria-valuemin="0" aria-valuemax="100" aria-label="Blackout risk">
      <svg viewBox="0 0 200 116">
        <path d="M14 104 A86 86 0 0 1 186 104" pathLength="100" className="g-track" />
        <path d="M14 104 A86 86 0 0 1 186 104" pathLength="100" className="g-fill" style={{ strokeDasharray: `${risk} 100` }} />
        <line x1="100" y1="104" x2="100" y2="104" />
      </svg>
      <div className="g-read"><span className="num">{risk.toFixed(1)}%</span><small>Blackout risk</small></div>
    </div>
  );
}
