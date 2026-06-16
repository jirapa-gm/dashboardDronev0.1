const fs = require('fs');

const content = fs.readFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/Summaries.jsx', 'utf8');

// The file is separated into sections.
// shared: lines 1 to 134
// group: lines 136 to 169
// subgroup: lines 171 to 205
// detector: lines 207 to 311

const lines = content.split('\n');

const sharedContent = [
  "import { GROUP_COLOR, MODEL_COLORS } from '../../shared/constants';",
  "import { CompassIcon, SignalIcon, DroneIcon } from '../../shared/icons';",
  "import { ModelDonutChart } from '../charts/ModelDonutChart';",
  "import { MiniDirRose } from '../charts/MiniDirRose';",
  "import './Summaries.css';",
  "",
  ...lines.slice(8, 135)
].join('\n').replace(/export function/g, 'export function').replace(/function build/g, 'export function build').replace(/function SummaryHeader/g, 'export function SummaryHeader').replace(/function KpiStrip/g, 'export function KpiStrip').replace(/function ChartsRow/g, 'export function ChartsRow').replace(/function EmptyMsg/g, 'export function EmptyMsg').replace(/function BreakdownTable/g, 'export function BreakdownTable');

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/summaries/SummaryShared.jsx', sharedContent);

const groupContent = [
  "import { useMemo } from 'react';",
  "import { GROUP_COLOR } from '../../shared/constants';",
  "import { buildModelDist, buildDirDist } from '../../shared/helpers';",
  "import { buildSummaryKpis, SummaryHeader, KpiStrip, ChartsRow, EmptyMsg, BreakdownTable } from './SummaryShared';",
  "",
  ...lines.slice(136, 170)
].join('\n');

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/summaries/GroupSummary.jsx', groupContent);

const subgroupContent = [
  "import { useMemo } from 'react';",
  "import { GROUP_COLOR } from '../../shared/constants';",
  "import { buildModelDist, buildDirDist } from '../../shared/helpers';",
  "import { buildSummaryKpis, SummaryHeader, KpiStrip, ChartsRow, EmptyMsg, BreakdownTable } from './SummaryShared';",
  "",
  ...lines.slice(171, 206)
].join('\n');

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/summaries/SubgroupSummary.jsx', subgroupContent);

const detectorContent = [
  "import { useState, useMemo } from 'react';",
  "import { GROUP_COLOR, THREAT_COLOR, MODEL_COLORS } from '../../shared/constants';",
  "import { buildModelDist, buildDirDist } from '../../shared/helpers';",
  "import { CompassIcon, DroneIcon, CheckIcon, CloseIcon } from '../../shared/icons';",
  "import { ModelDonutChart } from '../charts/ModelDonutChart';",
  "import { MiniDirRose } from '../charts/MiniDirRose';",
  "import { buildSummaryKpis, SummaryHeader, KpiStrip, EmptyMsg } from './SummaryShared';",
  "",
  ...lines.slice(207, 311)
].join('\n');

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/summaries/DetectorSummary.jsx', detectorContent);

const indexContent = [
  "export { GroupSummary } from './GroupSummary';",
  "export { SubgroupSummary } from './SubgroupSummary';",
  "export { DetectorSummary } from './DetectorSummary';"
].join('\n');

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/summaries/index.js', indexContent);
