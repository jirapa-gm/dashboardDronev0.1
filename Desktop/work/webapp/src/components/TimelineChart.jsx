import { buildDailyMap } from '../utils/chartUtils';

const GA_COLOR    = '#f97316';
const GB_COLOR    = '#eab308';
const TOTAL_COLOR = '#94a3b8';

const LEGEND = [
  { color: GA_COLOR,    label: 'GA',    dash: false },
  { color: GB_COLOR,    label: 'GB',    dash: false },
  { color: TOTAL_COLOR, label: 'Total', dash: true  },
];

const W   = 700;
const H   = 160;
const PAD = { top: 20, right: 24, bottom: 32, left: 32 };
const cW  = W - PAD.left - PAD.right;
const cH  = H - PAD.top  - PAD.bottom;

const xPos = (i, n) => PAD.left + (i / Math.max(n - 1, 1)) * cW;
const yPos = (v, max) => PAD.top + cH - (v / max) * cH;

function makePath(values, max, n) {
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xPos(i, n).toFixed(1)},${yPos(v, max).toFixed(1)}`)
    .join(' ');
}

function makeArea(values, max, n) {
  const pts   = values.map((v, i) => `${xPos(i, n).toFixed(1)},${yPos(v, max).toFixed(1)}`).join(' L');
  const baseY = (PAD.top + cH).toFixed(1);
  return `M${xPos(0, n).toFixed(1)},${baseY} L${pts} L${xPos(n - 1, n).toFixed(1)},${baseY} Z`;
}

export default function TimelineChart({ events }) {
  const dailyMap = buildDailyMap(events);
  const days     = Object.keys(dailyMap).sort();

  if (days.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#3a3a3a] rounded-xl p-8 text-center text-[#555] text-xs">
        No data available
      </div>
    );
  }

  const n           = days.length;
  const gaValues    = days.map((d) => dailyMap[d].GA);
  const gbValues    = days.map((d) => dailyMap[d].GB);
  const totalValues = days.map((d) => dailyMap[d].GA + dailyMap[d].GB);
  const maxVal      = Math.max(...totalValues, 1);
  const labelStep   = Math.max(1, Math.floor(n / 8));

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y:   PAD.top + cH * (1 - pct),
    val: Math.round(maxVal * pct),
  }));

  return (
    <div className="bg-[#141414] border border-[#3a3a3a] rounded-xl p-3 overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1">
        {LEGEND.map(({ color, label, dash }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width="18" height="6" viewBox="0 0 18 6">
              <line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="2"
                    strokeDasharray={dash ? '4 2' : '0'} />
              <circle cx="9" cy="3" r="2.5" fill={color} />
            </svg>
            <span className="text-[9px] text-[#888]">{label}</span>
          </div>
        ))}
        <span className="text-[9px] text-[#444] ml-auto">{n} days</span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', minWidth: `${Math.max(n * 36, 320)}px`, height: `${H}px` }}
      >
        <defs>
          {[['gaGrad', GA_COLOR, '0.18'], ['gbGrad', GB_COLOR, '0.14']].map(([id, color, op]) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={op} />
              <stop offset="100%" stopColor={color} stopOpacity="0"  />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {gridLines.map(({ y, val }) => (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                  stroke="#2a2a2a" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end"
                  fill="#444" fontSize="8" fontFamily="monospace">{val}</text>
          </g>
        ))}

        {/* Areas */}
        <path d={makeArea(gaValues, maxVal, n)} fill="url(#gaGrad)" />
        <path d={makeArea(gbValues, maxVal, n)} fill="url(#gbGrad)" />

        {/* Lines */}
        <path d={makePath(totalValues, maxVal, n)} fill="none" stroke={TOTAL_COLOR}
              strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
        <path d={makePath(gbValues, maxVal, n)} fill="none" stroke={GB_COLOR}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makePath(gaValues, maxVal, n)} fill="none" stroke={GA_COLOR}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + x-labels */}
        {days.map((date, i) => {
          const x       = xPos(i, n);
          const showLbl = i % labelStep === 0 || i === n - 1;
          return (
            <g key={date}>
              <circle cx={x} cy={yPos(gaValues[i],    maxVal)} r="3.5" fill={GA_COLOR}    stroke="#141414" strokeWidth="1.5" />
              <circle cx={x} cy={yPos(gbValues[i],    maxVal)} r="3.5" fill={GB_COLOR}    stroke="#141414" strokeWidth="1.5" />
              <circle cx={x} cy={yPos(totalValues[i], maxVal)} r="2.5" fill={TOTAL_COLOR} stroke="#141414" strokeWidth="1.5" />
              {showLbl && (
                <text x={x} y={PAD.top + cH + 14} textAnchor="middle"
                      fill="#555" fontSize="8" fontFamily="monospace">
                  {date.slice(5)}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top}      x2={PAD.left}        y2={PAD.top + cH} stroke="#3a3a3a" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top + cH} x2={W - PAD.right}   y2={PAD.top + cH} stroke="#3a3a3a" strokeWidth="1" />
      </svg>
    </div>
  );
}