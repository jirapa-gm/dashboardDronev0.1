export function buildDailyMap(events) {
  return events.reduce((acc, e) => {
    const d = e.datetime.split('T')[0];
    if (!acc[d]) acc[d] = { GA: 0, GB: 0 };
    if (e.group === 'GA') acc[d].GA++;
    else if (e.group === 'GB') acc[d].GB++;
    return acc;
  }, {});
}

export function buildDistribution(events, field) {
  const map = events.reduce((acc, e) => {
    const key = String(e[field]);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}