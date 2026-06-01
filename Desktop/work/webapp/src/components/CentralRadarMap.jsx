import React, { useMemo } from 'react';
import { buildCentralRadarData } from '../utils/chartUtils';

export default function CentralRadarMap({ events }) {
  // 1. แปลงข้อมูล Event จาก API เป็นข้อมูล 8 ทิศทางหลัก
  const radarData = useMemo(() => buildCentralRadarData(events), [events]);
  
  // 2. คำนวณรายชื่อ Detector ทั้งหมดที่มีการส่งข้อมูลเข้ามาแบบ Dynamic (รองรับมากกว่า 8 ตัว)
  const activeDetectors = useMemo(() => {
    const uniqueDets = new Set();
    events.forEach(e => {
      if (e.detector_id) uniqueDets.add(e.detector_id);
    });
    return Array.from(uniqueDets);
  }, [events]);

  // ฟังก์ชันเลือกสีส่องสว่างตามระดับภัยคุกคาม
  const getThreatColor = (threat, count) => {
    if (count === 0) return 'rgba(34, 197, 94, 0.1)';
    if (threat === 'HIGH') return 'rgba(239, 68, 68, 0.6)';    // สีแดง
    if (threat === 'MEDIUM') return 'rgba(249, 115, 22, 0.5)';  // สีส้ม
    return 'rgba(234, 179, 8, 0.4)';                            // สีเหลือง
  };

  return (
    <div className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 flex flex-col items-center justify-center relative">
      
      {/* ส่วนหัว: แสดงสถานะระบบและการเชื่อมต่อ Detector แบบ Real-time */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 border-b border-[#222] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            Integrated Central Radar Tactical Center
          </h3>
          <p className="text-[11px] text-[#666] mt-0.5">
            วิเคราะห์และสรุปทิศทางการบินเข้าของโดรนร่วมจากสถานีตรวจจับทั้งหมดในระบบ
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-2.5">
          <span className="text-[10px] text-[#888] tracking-widest font-mono">ACTIVE DETECTORS:</span>
          <span className="text-xs font-mono font-bold text-orange-500">{activeDetectors.length} UNITS</span>
        </div>
      </div>

      {/* หน้าปัดเรดาร์วงกลมขนาดใหญ่กลางหน้าจอ */}
      <div className="relative w-[360px] h-[360px] flex items-center justify-center my-4">
        
        {/* Layer วาดโครงเรดาร์ยุทธวิธี (Pure SVG) */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-22.5" viewBox="0 0 200 200">
          {/* วงแหวนบอกระดับระยะทาง (Radar Concentric Rings) */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="#262626" strokeWidth="0.75" strokeDasharray="2,2" />
          <circle cx="100" cy="100" r="65" fill="none" stroke="#333" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="40" fill="none" stroke="#222" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="15" fill="none" stroke="#444" strokeWidth="0.5" />
          
          {/* เส้นแบ่งแกนทิศทางแบบ 8 แฉก */}
          <line x1="100" y1="10" x2="100" y2="190" stroke="#262626" strokeWidth="0.5" />
          <line x1="10" y1="100" x2="190" y2="100" stroke="#262626" strokeWidth="0.5" />
          <line x1="36.36" y1="36.36" x2="163.64" y2="163.64" stroke="#222" strokeWidth="0.5" />
          <line x1="36.36" y1="163.64" x2="163.64" y2="36.36" stroke="#222" strokeWidth="0.5" />
        </svg>

        {/* จุดศูนย์กลาง (Center Command Core) */}
        <div className="absolute w-3 h-3 bg-orange-500 rounded-full border-2 border-black z-20 shadow-[0_0_8px_#f97316]"></div>

        {/* ป้ายกำกับตัวอักษรทิศทางสากล (0 องศาอยู่ทิศเหนือ) */}
        <span className="absolute top-0 text-[11px] font-mono font-bold text-orange-500">N (0°)</span>
        <span className="absolute right-0 text-[11px] font-mono font-bold text-[#666]">E (90°)</span>
        <span className="absolute bottom-0 text-[11px] font-mono font-bold text-[#666]">S (180°)</span>
        <span className="absolute left-0 text-[11px] font-mono font-bold text-[#666]">W (270°)</span>

        {/* Layer แสดงเอฟเฟกต์ทิศทางที่ตรวจเจอโดรนบินเข้า */}
        <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center">
          {radarData.map((item, idx) => {
            const angle = idx * 45; // หมุนบล็อกละ 45 องศาให้ครบรอบวงกลมพอดี
            const isDetected = item.count > 0;
            
            return (
              <div 
                key={item.direction} 
                className="absolute origin-center flex flex-col items-center justify-start h-full pt-6"
                style={{ transform: `rotate(${angle}deg)`, width: '50px' }}
              >
                {/* แสง Flare เรืองแสงไล่เฉดสีสะท้อนความหนาแน่นและระดับภัยคุกคาม */}
                {isDetected && (
                  <div 
                    className="absolute rounded-t-full transition-all duration-500 animate-pulse"
                    style={{
                      top: '35px',
                      width: '42px',
                      height: `${Math.min(110, 25 + item.count * 5)}px`,
                      background: `linear-gradient(to bottom, ${getThreatColor(item.maxThreat, item.count)}, transparent)`
                    }}
                  />
                )}
                
                {/* ตัวเลขเคาน์เตอร์โดรน (หมุนสวนทางองศาเรดาร์เพื่อให้ตัวเลขตั้งตรงเสมอตลอดเวลา) */}
                <div 
                  className={`z-10 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all ${
                    isDetected 
                      ? 'bg-black text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                      : 'text-[#333] border-transparent'
                  }`}
                  style={{ transform: `rotate(${-angle}deg)` }}
                >
                  {isDetected ? `${item.count}🛸` : '0'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* แผงข้อมูล Grid ด้านล่าง: รายงานสรุปสถานการณ์แบบเรียลไทม์เจาะลึก 8 ทิศทาง */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 text-[10px] font-mono">
        {radarData.map(item => (
          <div 
            key={item.direction} 
            className={`p-2.5 rounded-lg border transition-all ${
              item.count > 0 
                ? 'bg-[#1c1212] border-red-900/60 text-red-200' 
                : 'bg-[#111111] border-[#222] text-[#555]'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-white text-xs">{item.direction} Sector</span>
              <span className={item.count > 0 ? 'text-red-400 font-bold' : 'text-[#444]'}>
                {item.count} Detections
              </span>
            </div>
            <div className="text-[9px] truncate">
              {item.count > 0 
                ? `⚡ Detectors: ${item.detectors.join(', ')}` 
                : '✓ Area is clear'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}