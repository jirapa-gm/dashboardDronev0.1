import { GA, GB, DIR_LABELS } from '../../shared/constants';

// ── Radar chart (direction of origin) ─────────────────────────────────────────
export function RadarChart({ dirData, groupFilter }) {
  const R = 90, CX = 110, CY = 110;
  const maxVal = Math.max(...dirData.map(d => d.total), 1);
  const n      = 8;

  const polygon = (vals) => vals.map((v, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = (v / maxVal) * R;
    return `${(CX + r * Math.cos(angle)).toFixed(1)},${(CY + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');

  const gaVals = dirData.map(d => d.GA);
  const gbVals = dirData.map(d => d.GB);

  return (
    <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: '220px', margin: '0 auto', display: 'block' }}>
      {[0.25, 0.5, 0.75, 1.0].map(pct => (
        <circle key={pct} cx={CX} cy={CY} r={R * pct} fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {DIR_LABELS.map((_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={CX} y1={CY} x2={(CX + R * Math.cos(angle)).toFixed(1)} y2={(CY + R * Math.sin(angle)).toFixed(1)} stroke="#2a2a2a" strokeWidth="1" />;
      })}

      {(groupFilter !== 'GB') && <polygon points={polygon(gaVals)} fill={`${GA}22`} stroke={GA} strokeWidth="1.5" strokeLinejoin="round" />}
      {(groupFilter !== 'GA') && <polygon points={polygon(gbVals)} fill={`${GB}22`} stroke={GB} strokeWidth="1.5" strokeLinejoin="round" />}

      {DIR_LABELS.map((dir, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const lr = R + 16;
        const x = CX + lr * Math.cos(angle), y = CY + lr * Math.sin(angle);
        return (
          <g key={dir}>
            <text x={x.toFixed(1)} y={(y - 3).toFixed(1)} textAnchor="middle" fill="#aaa" fontSize="9" fontWeight="700" fontFamily="monospace">{dir}</text>
            <text x={x.toFixed(1)} y={(y + 7).toFixed(1)} textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace">{dirData[i].total}</text>
          </g>
        );
      })}
      <text x={CX} y={CY + 4} textAnchor="middle" fill="#444" fontSize="8" fontFamily="monospace">ORIGIN</text>
    </svg>
  );
}
