"""
DroneSentinel — Backend Stub (FastAPI)
ใช้สำหรับทดสอบ Postman และ Frontend ก่อนมี DB จริง

Run:
  uvicorn main:app --reload --port 8000

Postman URL: http://localhost:8000/api/events
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import math
import datetime

app = FastAPI(title="DroneSentinel API")

# ── CORS (อนุญาต Vite dev server) ────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ── Request schema (Format ใหม่) ──────────────────────────────────────────────
class TimeRange(BaseModel):
    start: str
    end:   str

class Filters(BaseModel):
    group:     Optional[str]       = None   # None = ทุกกลุ่ม
    subgroup:  Optional[str]       = None
    detectors: Optional[List[str]] = None   # None = ทุกเครื่อง

class SearchRequest(BaseModel):
    filters:    Optional[Filters]    = None
    time_range: TimeRange
    metrics:    Optional[List[str]]  = None  # None = คืนทุก metric

# ── Utility helpers ────────────────────────────────────────────────────────────
def calc_bearing(lat1, lon1, lat2, lon2) -> float:
    d_lon = math.radians(lon2 - lon1)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    x = math.sin(d_lon) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360

def bearing_to_dir(bearing: float) -> str:
    dirs = ['N','NE','E','SE','S','SW','W','NW']
    return dirs[round(bearing / 45) % 8]

def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(d_lon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def freq_to_protocol(freq: int) -> str:
    if freq < 2430: return "OcuSync"
    if freq < 2460: return "LBv2"
    return "Enhanced Wi-Fi"

def calc_threat(height: int, speed: float, protocol_name: str) -> str:
    base = (speed / 20) * 0.5 + (0.3 if height > 50 else 0.1)
    p = (protocol_name or "").upper()
    if "DIY" in p or "FPV" in p or p == "UNKNOWN":
        base += 0.25
    if base > 0.65: return "HIGH"
    if base > 0.35: return "MEDIUM"
    return "LOW"

# ── Mock data (โครงสร้างเดียวกับ mockData.json) ───────────────────────────────
RAW_EVENTS = [
    # ── GROUP GA EVENTS (Mostly Daytime, N/NE Direction, 2.4 GHz, Registered) ──
    {
        "id": "EVT-A1-001-1", "datetime": "2026-04-02T08:15:00",
        "group": "GA", "subgroup": "SG_A1",
        "detector_id": "A1-001", "detector_name": "Detector_A1_001",
        "detector_lat": 13.7569, "detector_lon": 100.5915,
        "drone_id": "DR-3299", "model": "DJI Mini 3",
        "latitude": 13.7689, "longitude": 100.6015,
        "height": 28, "speed": 2.68, "freq": 2415,
        "has_gps": True, "pilot_lat": 13.7545, "pilot_lng": 100.5890,
        "aoa_degrees": None, "rssi_dbm": -68, "snr_db": 18.4,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A1-001-2", "datetime": "2026-04-02T10:30:00",
        "group": "GA", "subgroup": "SG_A1",
        "detector_id": "A1-001", "detector_name": "Detector_A1_001",
        "detector_lat": 13.7569, "detector_lon": 100.5915,
        "drone_id": "DR-3299", "model": "DJI Mini 3",
        "latitude": 13.7719, "longitude": 100.5915,
        "height": 45, "speed": 3.12, "freq": 2425,
        "has_gps": True, "pilot_lat": 13.7545, "pilot_lng": 100.5890,
        "aoa_degrees": None, "rssi_dbm": -72, "snr_db": 14.2,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A1-002-1", "datetime": "2026-04-04T09:40:00",
        "group": "GA", "subgroup": "SG_A1",
        "detector_id": "A1-002", "detector_name": "Detector_A1_002",
        "detector_lat": 13.7142, "detector_lon": 100.5159,
        "drone_id": "DR-3258", "model": "DJI Air 2S",
        "latitude": 13.7292, "longitude": 100.5289,
        "height": 49, "speed": 2.01, "freq": 2450,
        "has_gps": True, "pilot_lat": 13.7120, "pilot_lng": 100.5180,
        "aoa_degrees": None, "rssi_dbm": -55, "snr_db": 24.7,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A1-002-2", "datetime": "2026-04-04T14:15:00",
        "group": "GA", "subgroup": "SG_A1",
        "detector_id": "A1-002", "detector_name": "Detector_A1_002",
        "detector_lat": 13.7142, "detector_lon": 100.5159,
        "drone_id": "DR-4783", "model": "DJI Mini 4 Pro",
        "latitude": 13.7312, "longitude": 100.5159,
        "height": 46, "speed": 4.96, "freq": 2435,
        "has_gps": True, "pilot_lat": 13.7630, "pilot_lng": 100.5720,
        "aoa_degrees": None, "rssi_dbm": -71, "snr_db": 15.2,
        "protocol_name": "DJI OcuSync", "registered": False,
    },
    {
        "id": "EVT-A2-001-1", "datetime": "2026-04-06T08:00:00",
        "group": "GA", "subgroup": "SG_A2",
        "detector_id": "A2-001", "detector_name": "Detector_A2_001",
        "detector_lat": 13.7845, "detector_lon": 100.5059,
        "drone_id": "DR-7683", "model": "DJI Air 3",
        "latitude": 13.7995, "longitude": 100.5209,
        "height": 12, "speed": 4.62, "freq": 2420,
        "has_gps": True, "pilot_lat": 13.7860, "pilot_lng": 100.5040,
        "aoa_degrees": None, "rssi_dbm": -50, "snr_db": 28.3,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A2-001-2", "datetime": "2026-04-06T11:05:00",
        "group": "GA", "subgroup": "SG_A2",
        "detector_id": "A2-001", "detector_name": "Detector_A2_001",
        "detector_lat": 13.7845, "detector_lon": 100.5059,
        "drone_id": "DR-2011", "model": "DJI Mini 3",
        "latitude": 13.8015, "longitude": 100.5059,
        "height": 31, "speed": 1.81, "freq": 2410,
        "has_gps": True, "pilot_lat": 13.7860, "pilot_lng": 100.5040,
        "aoa_degrees": None, "rssi_dbm": -62, "snr_db": 20.5,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A2-002-1", "datetime": "2026-04-08T13:20:00",
        "group": "GA", "subgroup": "SG_A2",
        "detector_id": "A2-002", "detector_name": "Detector_A2_002",
        "detector_lat": 13.7596, "detector_lon": 100.5094,
        "drone_id": "DR-9251", "model": "DJI Air 3",
        "latitude": 13.7746, "longitude": 100.5214,
        "height": 18, "speed": 3.68, "freq": 2455,
        "has_gps": True, "pilot_lat": 13.7570, "pilot_lng": 100.5110,
        "aoa_degrees": None, "rssi_dbm": -62, "snr_db": 20.1,
        "protocol_name": "DJI LightBridge", "registered": True,
    },
    {
        "id": "EVT-A2-002-2", "datetime": "2026-04-08T15:50:00",
        "group": "GA", "subgroup": "SG_A2",
        "detector_id": "A2-002", "detector_name": "Detector_A2_002",
        "detector_lat": 13.7596, "detector_lon": 100.5094,
        "drone_id": "DR-7787", "model": "DJI Air 2S",
        "latitude": 13.7786, "longitude": 100.5094,
        "height": 54, "speed": 0.80, "freq": 2430,
        "has_gps": True, "pilot_lat": 13.7570, "pilot_lng": 100.5110,
        "aoa_degrees": None, "rssi_dbm": -71, "snr_db": 16.5,
        "protocol_name": "DJI LightBridge", "registered": True,
    },
    {
        "id": "EVT-A1-001-3", "datetime": "2026-04-02T13:45:00",
        "group": "GA", "subgroup": "SG_A1",
        "detector_id": "A1-001", "detector_name": "Detector_A1_001",
        "detector_lat": 13.7569, "detector_lon": 100.5915,
        "drone_id": "DR-3299", "model": "DJI Mini 3",
        "latitude": 13.7669, "longitude": 100.6015,
        "height": 30, "speed": 2.50, "freq": 2445,
        "has_gps": True, "pilot_lat": 13.7545, "pilot_lng": 100.5890,
        "aoa_degrees": None, "rssi_dbm": -65, "snr_db": 19.8,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A1-002-3", "datetime": "2026-04-04T16:10:00",
        "group": "GA", "subgroup": "SG_A1",
        "detector_id": "A1-002", "detector_name": "Detector_A1_002",
        "detector_lat": 13.7142, "detector_lon": 100.5159,
        "drone_id": "DR-3258", "model": "DJI Air 2S",
        "latitude": 13.7292, "longitude": 100.5159,
        "height": 45, "speed": 2.20, "freq": 2415,
        "has_gps": True, "pilot_lat": 13.7120, "pilot_lng": 100.5180,
        "aoa_degrees": None, "rssi_dbm": -58, "snr_db": 22.1,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A2-001-3", "datetime": "2026-04-06T15:30:00",
        "group": "GA", "subgroup": "SG_A2",
        "detector_id": "A2-001", "detector_name": "Detector_A2_001",
        "detector_lat": 13.7845, "detector_lon": 100.5059,
        "drone_id": "DR-2011", "model": "DJI Mini 3",
        "latitude": 13.7995, "longitude": 100.5059,
        "height": 28, "speed": 1.70, "freq": 2420,
        "has_gps": True, "pilot_lat": 13.7860, "pilot_lng": 100.5040,
        "aoa_degrees": None, "rssi_dbm": -60, "snr_db": 21.0,
        "protocol_name": "DJI OcuSync", "registered": True,
    },
    {
        "id": "EVT-A2-002-3", "datetime": "2026-04-08T10:15:00",
        "group": "GA", "subgroup": "SG_A2",
        "detector_id": "A2-002", "detector_name": "Detector_A2_002",
        "detector_lat": 13.7596, "detector_lon": 100.5094,
        "drone_id": "DR-9251", "model": "DJI Air 3",
        "latitude": 13.7716, "longitude": 100.5214,
        "height": 20, "speed": 3.80, "freq": 2435,
        "has_gps": True, "pilot_lat": 13.7570, "pilot_lng": 100.5110,
        "aoa_degrees": None, "rssi_dbm": -59, "snr_db": 21.5,
        "protocol_name": "DJI LightBridge", "registered": True,
    },

    # ── GROUP GB EVENTS (Mostly Nighttime, S/SW Direction, 5.8 GHz, Unregistered) ──
    {
        "id": "EVT-B1-001-1", "datetime": "2026-04-03T19:20:00",
        "group": "GB", "subgroup": "SG_B1",
        "detector_id": "B1-001", "detector_name": "Detector_B1_001",
        "detector_lat": 13.7425, "detector_lon": 100.5512,
        "drone_id": "DR-9911", "model": "DJI Mavic 3",
        "latitude": 13.7225, "longitude": 100.5312,
        "height": 55, "speed": 6.21, "freq": 5765,
        "has_gps": True, "pilot_lat": 13.7400, "pilot_lng": 100.5490,
        "aoa_degrees": None, "rssi_dbm": -53, "snr_db": 26.5,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B1-001-2", "datetime": "2026-04-03T21:40:00",
        "group": "GB", "subgroup": "SG_B1",
        "detector_id": "B1-001", "detector_name": "Detector_B1_001",
        "detector_lat": 13.7425, "detector_lon": 100.5512,
        "drone_id": "DR-8822", "model": "DIY FPV Quad",
        "latitude": 13.7125, "longitude": 100.5512,
        "height": 85, "speed": 9.50, "freq": 5800,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 180.0, "rssi_dbm": -82, "snr_db": 8.4,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B1-002-1", "datetime": "2026-04-05T20:15:00",
        "group": "GB", "subgroup": "SG_B1",
        "detector_id": "B1-002", "detector_name": "Detector_B1_002",
        "detector_lat": 13.7219, "detector_lon": 100.5610,
        "drone_id": "DR-7733", "model": "Autel Evo II",
        "latitude": 13.7019, "longitude": 100.5410,
        "height": 80, "speed": 5.45, "freq": 5745,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 225.0, "rssi_dbm": -77, "snr_db": 11.0,
        "protocol_name": "Autel Skylink", "registered": False,
    },
    {
        "id": "EVT-B1-002-2", "datetime": "2026-04-05T23:55:00",
        "group": "GB", "subgroup": "SG_B1",
        "detector_id": "B1-002", "detector_name": "Detector_B1_002",
        "detector_lat": 13.7219, "detector_lon": 100.5610,
        "drone_id": "DR-6644", "model": "DIY FPV Quad",
        "latitude": 13.6919, "longitude": 100.5610,
        "height": 110, "speed": 11.2, "freq": 5825,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 180.0, "rssi_dbm": -85, "snr_db": 5.6,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B2-001-1", "datetime": "2026-04-07T22:30:00",
        "group": "GB", "subgroup": "SG_B2",
        "detector_id": "B2-001", "detector_name": "Detector_B2_001",
        "detector_lat": 13.7312, "detector_lon": 100.5646,
        "drone_id": "DR-5006", "model": "DJI Mavic 3",
        "latitude": 13.7112, "longitude": 100.5446,
        "height": 67, "speed": 4.23, "freq": 5780,
        "has_gps": True, "pilot_lat": 13.7285, "pilot_lng": 100.5620,
        "aoa_degrees": None, "rssi_dbm": -70, "snr_db": 16.3,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B2-001-2", "datetime": "2026-04-07T01:10:00",
        "group": "GB", "subgroup": "SG_B2",
        "detector_id": "B2-001", "detector_name": "Detector_B2_001",
        "detector_lat": 13.7312, "detector_lon": 100.5646,
        "drone_id": "DR-1219", "model": "Autel Evo II",
        "latitude": 13.7012, "longitude": 100.5646,
        "height": 124, "speed": 5.76, "freq": 5755,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 180.0, "rssi_dbm": -73, "snr_db": 13.5,
        "protocol_name": "Autel Skylink", "registered": False,
    },
    {
        "id": "EVT-B2-002-1", "datetime": "2026-04-09T23:05:00",
        "group": "GB", "subgroup": "SG_B2",
        "detector_id": "B2-002", "detector_name": "Detector_B2_002",
        "detector_lat": 13.7450, "detector_lon": 100.5200,
        "drone_id": "DR-9112", "model": "DIY FPV Quad",
        "latitude": 13.7250, "longitude": 100.5000,
        "height": 98, "speed": 8.50, "freq": 5850,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 225.0, "rssi_dbm": -79, "snr_db": 9.2,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B2-002-2", "datetime": "2026-04-09T03:40:00",
        "group": "GB", "subgroup": "SG_B2",
        "detector_id": "B2-002", "detector_name": "Detector_B2_002",
        "detector_lat": 13.7450, "detector_lon": 100.5200,
        "drone_id": "DR-4115", "model": "DJI Mavic 3",
        "latitude": 13.7150, "longitude": 100.5200,
        "height": 92, "speed": 6.10, "freq": 5790,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 180.0, "rssi_dbm": -85, "snr_db": 5.6,
        "protocol_name": "Unknown", "registered": False,
    },
    {
        "id": "EVT-B1-001-3", "datetime": "2026-04-03T23:10:00",
        "group": "GB", "subgroup": "SG_B1",
        "detector_id": "B1-001", "detector_name": "Detector_B1_001",
        "detector_lat": 13.7425, "detector_lon": 100.5512,
        "drone_id": "DR-8822", "model": "DIY FPV Quad",
        "latitude": 13.7225, "longitude": 100.5312,
        "height": 90, "speed": 10.2, "freq": 5815,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 225.0, "rssi_dbm": -81, "snr_db": 6.2,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B1-002-3", "datetime": "2026-04-05T01:50:00",
        "group": "GB", "subgroup": "SG_B1",
        "detector_id": "B1-002", "detector_name": "Detector_B1_002",
        "detector_lat": 13.7219, "detector_lon": 100.5610,
        "drone_id": "DR-7733", "model": "Autel Evo II",
        "latitude": 13.6919, "longitude": 100.5610,
        "height": 82, "speed": 5.10, "freq": 5740,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 180.0, "rssi_dbm": -75, "snr_db": 12.0,
        "protocol_name": "Autel Skylink", "registered": False,
    },
    {
        "id": "EVT-B2-001-3", "datetime": "2026-04-07T02:45:00",
        "group": "GB", "subgroup": "SG_B2",
        "detector_id": "B2-001", "detector_name": "Detector_B2_001",
        "detector_lat": 13.7312, "detector_lon": 100.5646,
        "drone_id": "DR-5006", "model": "DIY FPV Quad",
        "latitude": 13.7112, "longitude": 100.5446,
        "height": 94, "speed": 9.80, "freq": 5835,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 225.0, "rssi_dbm": -83, "snr_db": 5.8,
        "protocol_name": "DIY/FPV", "registered": False,
    },
    {
        "id": "EVT-B2-002-3", "datetime": "2026-04-09T21:15:00",
        "group": "GB", "subgroup": "SG_B2",
        "detector_id": "B2-002", "detector_name": "Detector_B2_002",
        "detector_lat": 13.7450, "detector_lon": 100.5200,
        "drone_id": "DR-4115", "model": "DJI Mavic 3",
        "latitude": 13.7250, "longitude": 100.5200,
        "height": 88, "speed": 5.90, "freq": 5770,
        "has_gps": False, "pilot_lat": None, "pilot_lng": None,
        "aoa_degrees": 180.0, "rssi_dbm": -76, "snr_db": 12.8,
        "protocol_name": "Unknown", "registered": False,
    },
]

# ── Enrich event (compute derived fields) ─────────────────────────────────────
def enrich(e: dict) -> dict:
    det_lat = e["detector_lat"]
    det_lon = e["detector_lon"]
    d_lat   = e["latitude"]
    d_lon   = e["longitude"]

    bearing = calc_bearing(det_lat, det_lon, d_lat, d_lon)
    dist    = haversine(det_lat, det_lon, d_lat, d_lon)
    threat  = calc_threat(e["height"], e["speed"], e.get("protocol_name", ""))

    pilot_dist = None
    if e.get("has_gps") and e.get("pilot_lat") and e.get("pilot_lng"):
        pilot_dist = round(haversine(e["pilot_lat"], e["pilot_lng"], d_lat, d_lon))

    return {
        **e,
        "bearing":                round(bearing, 1),
        "direction":              bearing_to_dir(bearing),
        "protocol":               freq_to_protocol(e["freq"]),
        "threat":                 threat,
        "estimated_distance_m":   e.get("estimated_distance_m") or round(dist),
        "pilot_drone_distance_m": pilot_dist,
    }

# ── Aggregation functions (Format ใหม่) ───────────────────────────────────────

def compute_kpi_summary(events: list) -> dict:
    """KPI หลัก — ใช้ camelCase ตาม API spec"""
    if not events:
        return {
            "total": 0, "ga": 0, "gb": 0,
            "unique": 0, "highThreat": 0,
            "avgSpeed": 0, "maxSpeed": 0, "avgHeight": 0,
        }
    speeds  = [e["speed"]  for e in events]
    heights = [e["height"] for e in events]
    return {
        "total":      len(events),
        "ga":         sum(1 for e in events if e["group"] == "GA"),
        "gb":         sum(1 for e in events if e["group"] == "GB"),
        "unique":     len(set(e["drone_id"] for e in events)),
        "highThreat": sum(1 for e in events if e.get("threat") == "HIGH"),
        "avgSpeed":   round(sum(speeds)  / len(speeds),  2),
        "maxSpeed":   round(max(speeds),                 2),
        "avgHeight":  round(sum(heights) / len(heights)),
    }

def compute_model_count(events: list) -> list:
    """จำนวนตรวจพบแยกตามรุ่น — [{device_type, count}]"""
    counts = {}
    for e in events:
        m = e.get("model", "Unknown")
        counts[m] = counts.get(m, 0) + 1
    return [
        {"device_type": m, "count": c}
        for m, c in sorted(counts.items(), key=lambda x: -x[1])
    ]

def compute_protocol_summary(events: list) -> list:
    """จำนวนตรวจพบแยกตามโปรโตคอล — [{name, count}]"""
    counts = {}
    for e in events:
        p = e.get("protocol_name") or "Unknown"
        counts[p] = counts.get(p, 0) + 1
    return [
        {"name": p, "count": c}
        for p, c in sorted(counts.items(), key=lambda x: -x[1])
    ]

def compute_daily_detection(events: list) -> list:
    """การตรวจพบรายวัน — [{date, GA, GB}] เรียงตามวันที่"""
    result = {}
    for e in events:
        day = e["datetime"][:10]
        if day not in result:
            result[day] = {"GA": 0, "GB": 0}
        result[day][e["group"]] = result[day].get(e["group"], 0) + 1
    return [
        {"date": day, "GA": v["GA"], "GB": v["GB"]}
        for day, v in sorted(result.items())
    ]

def compute_hourly_detection(events: list) -> list:
    """การตรวจพบรายชั่วโมง (sparse) — [{hour, GA, GB}] เฉพาะชั่วโมงที่มีข้อมูล"""
    hourly = {}
    for e in events:
        h = int(e["datetime"][11:13])
        if h not in hourly:
            hourly[h] = {"GA": 0, "GB": 0}
        hourly[h][e["group"]] = hourly[h].get(e["group"], 0) + 1
    return [
        {"hour": h, "GA": v["GA"], "GB": v["GB"]}
        for h, v in sorted(hourly.items())
    ]

def compute_direction_summary(events: list) -> list:
    """สรุปทิศทาง — [{dir, GA, GB, total}]"""
    dirs = ['N','NE','E','SE','S','SW','W','NW']
    dmap = {d: {"GA": 0, "GB": 0} for d in dirs}
    for e in events:
        d = e.get("direction")
        if d and d in dmap:
            dmap[d][e["group"]] = dmap[d].get(e["group"], 0) + 1
    return [{"dir": d, **dmap[d], "total": dmap[d]["GA"] + dmap[d]["GB"]} for d in dirs]

def compute_frequency_distribution(events: list) -> list:
    """การกระจายความถี่ — [{range:"2400-2429 MHz", count}]"""
    bands = {"2400-2429 MHz": 0, "2430-2459 MHz": 0, "2460-2500 MHz": 0, "5725-5875 MHz": 0}
    for e in events:
        f = float(e.get("freq", 0))
        if 2400 <= f < 2430:   bands["2400-2429 MHz"] += 1
        elif 2430 <= f < 2460: bands["2430-2459 MHz"] += 1
        elif 2460 <= f <= 2500: bands["2460-2500 MHz"] += 1
        elif 5725 <= f <= 5875: bands["5725-5875 MHz"] += 1
    return [{"range": b, "count": c} for b, c in bands.items()]

def compute_drone_stats(events: list) -> list:
    """สถิติโดรนรายลำ — [{drone_id, model, group, detections, threat...}]"""
    dmap = {}
    rank = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    for e in events:
        did = e["drone_id"]
        if did not in dmap:
            dmap[did] = {
                "drone_id": did, "model": e.get("model","Unknown"),
                "group": e["group"], "detections": 0,
                "max_height": 0, "max_speed": 0, "total_speed": 0,
                "protocols": set(), "freqs": set(), "directions": set(),
                "first_seen": e["datetime"], "last_seen": e["datetime"],
                "threat": e.get("threat","LOW"),
            }
        d = dmap[did]
        d["detections"]  += 1
        d["max_height"]   = max(d["max_height"], e.get("height", 0))
        d["max_speed"]    = max(d["max_speed"],  e.get("speed", 0))
        d["total_speed"] += e.get("speed", 0)
        if e.get("protocol_name"): d["protocols"].add(e.get("protocol_name"))
        if e.get("freq"):          d["freqs"].add(e.get("freq"))
        if e.get("direction"):     d["directions"].add(e.get("direction"))
        if e["datetime"] < d["first_seen"]: d["first_seen"] = e["datetime"]
        if e["datetime"] > d["last_seen"]:  d["last_seen"]  = e["datetime"]
        if rank.get(e.get("threat","LOW"),0) > rank.get(d["threat"],0):
            d["threat"] = e.get("threat")

    result = []
    for d in sorted(dmap.values(), key=lambda x: -x["detections"]):
        result.append({
            "drone_id":   d["drone_id"],
            "model":      d["model"],
            "group":      d["group"],
            "detections": d["detections"],
            "threat":     d["threat"],
            "max_height": d["max_height"],
            "max_speed":  round(d["max_speed"], 2),
            "avg_speed":  round(d["total_speed"] / d["detections"], 2),
            "protocols":  list(d["protocols"]),
            "freqs":      sorted(d["freqs"]),
            "directions": list(d["directions"]),
            "first_seen": d["first_seen"],
            "last_seen":  d["last_seen"],
        })
    return result

# ── Main endpoint ─────────────────────────────────────────────────────────────
@app.post("/api/events")
def search_events(req: SearchRequest):
    f = req.filters or Filters()

    # 1. Filter events ──────────────────────────────────────────────────────────
    filtered = []
    for e in RAW_EVENTS:
        day = e["datetime"][:10]
        if day < req.time_range.start or day > req.time_range.end:   continue
        if f.group    and e["group"]       != f.group:                continue
        if f.subgroup and e["subgroup"]    != f.subgroup:             continue
        if f.detectors and e["detector_id"] not in f.detectors:       continue
        filtered.append(e)

    # 2. Enrich (compute derived fields per event) ────────────────────────────
    enriched = [enrich(e) for e in filtered]

    # 3. Build response ────────────────────────────────────────────────────────
    #    ถ้าไม่ระบุ metrics → คืนทุก metric
    want = set(req.metrics) if req.metrics else {
        "kpi_summary", "model_count", "frequency_distribution",
        "daily_detection", "hourly_detection", "direction_summary",
        "protocol_summary", "drone_stats", "raw_events"
    }

    data = {}
    if "kpi_summary"            in want: data["kpi_summary"]            = compute_kpi_summary(enriched)
    if "model_count"            in want: data["model_count"]            = compute_model_count(enriched)
    if "frequency_distribution" in want: data["frequency_distribution"] = compute_frequency_distribution(enriched)
    if "daily_detection"        in want: data["daily_detection"]        = compute_daily_detection(enriched)
    if "hourly_detection"       in want: data["hourly_detection"]       = compute_hourly_detection(enriched)
    if "direction_summary"      in want: data["direction_summary"]      = compute_direction_summary(enriched)
    if "protocol_summary"       in want: data["protocol_summary"]       = compute_protocol_summary(enriched)
    if "drone_stats"            in want: data["drone_stats"]            = compute_drone_stats(enriched)
    if "raw_events"             in want: data["raw_events"]             = enriched

    return {
        "status":     "success",
        "filters":    {
            "group":     f.group,
            "subgroup":  f.subgroup,
            "detectors": f.detectors,
        },
        "time_range": {"start": req.time_range.start, "end": req.time_range.end},
        "data":       data,
        "meta": {
            "total_records": len(enriched),
            "generated_at":  datetime.datetime.utcnow().isoformat() + "Z",
        },
    }

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "events_in_db": len(RAW_EVENTS)}

# ── Run directly ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)