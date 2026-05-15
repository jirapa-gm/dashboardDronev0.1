import raw from './mockData.json';

const mockData = [];

raw.groups.forEach((g) => {
  g.subgroups.forEach((sg) => {
    sg.detectors.forEach((det) => {
      det.data.events.forEach((evt) => {
        mockData.push({
          ...evt,
          group:         g.group,
          subgroup:      sg.subgroup,
          detector_id:   det.detector_id,
          detector_name: det.name,
        });
      });
    });
  });
});

export default mockData;