export function exportCSV(droneStats) {
  const headers = [
    'drone_id','model','group','detections','threat',
    'max_height_m','max_speed_ms','avg_speed_ms',
    'protocols','frequencies','directions',
    'first_seen','last_seen',
  ];
  const rows = droneStats.map(d => [
    d.drone_id ?? '',
    `"${(d.model ?? '').replace(/"/g,'""')}"`,
    d.group ?? '',
    d.detections ?? 0,
    d.threat ?? '',
    d.maxHeight ?? 0,
    d.maxSpeed ?? 0,
    d.avgSpeed ?? 0,
    `"${d.protocols?.join('; ') ?? ''}"`,
    `"${d.freqs?.join('; ') ?? ''}"`,
    `"${d.directions?.join(' ') ?? ''}"`,
    d.firstSeen ?? '',
    d.lastSeen ?? '',
  ].join(','));
  const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `drone_intel_${new Date().toISOString().split('T')[0]}.csv` }).click();
  URL.revokeObjectURL(url);
}
