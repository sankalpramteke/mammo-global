'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Hospital { _id: string; hospitalId: string; name: string; location: string; status: string; lat: number; lng: number; totalScans: number; }

export default function IndiaMap({ hospitals }: { hospitals: Hospital[] }) {
  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '4px', overflow: 'hidden', border: '1px solid #d0d8e4', zIndex: 0 }}>
      {/* 
        Center is roughly Nagpur, India (20.5937, 78.9629) 
        Zoom level 4 is good for showing all of India
      */}
      <MapContainer center={[22.5937, 78.9629]} zoom={4.5} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {hospitals.map(h => (
          <Marker key={h._id} position={[h.lat, h.lng]} icon={icon}>
            <Popup>
              <div style={{ minWidth: 150 }}>
                <strong style={{ color: '#1a3a6b', display: 'block', fontSize: 14 }}>{h.name}</strong>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{h.location || h.hospitalId}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6, fontSize: 12 }}>
                  <span>Status:</span>
                  <strong style={{ color: h.status === 'online' ? '#155724' : '#721c24' }}>
                    {h.status.toUpperCase()}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>Total Scans:</span>
                  <strong>{h.totalScans}</strong>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
