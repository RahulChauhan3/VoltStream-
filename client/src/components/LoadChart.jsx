import { useRef, useState } from 'react';

const W = 820, H = 340, P = { l: 52, r: 16, t: 16, b: 34 };
const hh = (h) => `${String(h).padStart(2, '0')}:00`;

export default function LoadChart({ data, compare }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const yMax = Math.ceil(Math.max(data.capacityMW * 1.08, ...data.totalMW, ...(compare?.totalMW || [])) / 200) * 200;
  const x = (h) => P.l + (h / 23) * (W - P.l - P.r);
  const y = (v) => H - P.b - (v / yMax) * (H - P.t - P.b);
  const line = (arr) => arr.map((v, h) => `${h ? 'L' : 'M'}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = (arr) => `${line(arr)} L${x(23)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = Array.from({ length: yMax / 400 + 1 }, (_, i) => i * 400);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(23, Math.round(((px - P.l) / (W - P.l - P.r)) * 23))));
  };

  return (
    <div className="chart-wrap">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="24-hour projected power load in megawatts"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3CC8F4" stopOpacity=".38" /><stop offset="1" stopColor="#3CC8F4" stopOpacity="0" />
          </linearGradient>
          <clipPath id="over"><rect x={P.l} y="0" width={W} height={y(data.capacityMW)} /></clipPath>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => (
          <text key={h} x={x(h)} y={H - 10} textAnchor="middle" className="axis">{hh(h)}</text>
        ))}
        <text x="12" y={H / 2} className="axis" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">Megawatts</text>

        <path d={area(data.baselineMW)} className="area-base" />
        <path d={area(data.totalMW)} fill="url(#gTotal)" />
        <path d={line(data.baselineMW)} className="line-base" />
        <path d={line(data.totalMW)} className="line-total" />
        <path d={line(data.totalMW)} className="line-over" clipPath="url(#over)" />
        {compare && <path d={line(compare.totalMW)} className="line-compare" />}

        <line x1={P.l} x2={W - P.r} y1={y(data.capacityMW)} y2={y(data.capacityMW)} className="line-cap" />
        <text x={W - P.r} y={y(data.capacityMW) - 6} textAnchor="end" className="cap-label">Capacity {data.capacityMW} MW</text>

        <circle cx={x(data.peakHour)} cy={y(data.totalMW[data.peakHour])} r="5" className="peak-dot" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} className="cursor" />
            <circle cx={x(hover)} cy={y(data.totalMW[hover])} r="4" fill="#fff" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <strong>{hh(hover)}</strong>
          <span>Total {data.totalMW[hover].toFixed(0)} MW</span>
          <span>City {data.baselineMW[hover].toFixed(0)} MW</span>
          <span>EV {data.evLoadMW[hover].toFixed(0)} MW</span>
          {compare && <span className="cmp">Archived {compare.totalMW[hover].toFixed(0)} MW</span>}
        </div>
      )}
      <ul className="legend">
        <li><i className="sw total" />Total load</li>
        <li><i className="sw base" />City baseline</li>
        <li><i className="sw cap" />Grid capacity</li>
        {compare && <li><i className="sw cmp" />Archived run</li>}
      </ul>
    </div>
  );
}
