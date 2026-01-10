
import React, { useEffect, useRef, useContext } from 'react';
import { AppContext } from '../App';
import { Role } from '../types';

// Declare L as a global from the CDN script
declare const L: any;

const MapView: React.FC = () => {
  const { allUsers, systemSettings } = useContext(AppContext);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null); 
  const riderMarkersRef = useRef<{ [key: string]: any }>({});

  const riders = allUsers.filter(u => u.role === Role.Rider && u.location);

  // Initialize map effect
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Use standard OpenStreetMap tiles from a robust mirror
      const map = L.map(mapContainerRef.current, {
        zoomControl: false // Custom placement later
      }).setView([6.1957, 6.7296], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
    }
    
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    }
  }, []);

  // Update markers effect
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    const currentMarkers = riderMarkersRef.current;

    riders.forEach(rider => {
      if (!rider.location) return;

      const position: [number, number] = [rider.location.lat, rider.location.lng];
      
      const riderIcon = L.divIcon({
          html: `<div class="rider-marker-v2 ${rider.id === 'user-3' ? 'marker-blue' : 'marker-emerald'}">
                  <div class="marker-inner">${rider.name.charAt(0)}</div>
                  <div class="marker-pulse"></div>
                 </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
      });

      if (currentMarkers[rider.id]) {
        currentMarkers[rider.id].setLatLng(position);
      } else {
        const newMarker = L.marker(position, { icon: riderIcon }).addTo(map);
        newMarker.bindPopup(`<div class="p-2">
            <p class="font-bold text-slate-900">${rider.name}</p>
            <p class="text-[10px] text-slate-500 uppercase tracking-widest">Active Rider</p>
        </div>`);
        currentMarkers[rider.id] = newMarker;
      }
    });

    Object.keys(currentMarkers).forEach(markerId => {
        if (!riders.find(r => r.id === markerId)) {
            currentMarkers[markerId].remove();
            delete currentMarkers[markerId];
        }
    });

  }, [riders]);

  return (
    <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-500">
      <div className="p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white font-outfit uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Fleet Node Monitor
        </h2>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{riders.length} Active Units</span>
      </div>
      
      <div 
        ref={mapContainerRef} 
        className={`h-[500px] w-full relative z-10 transition-all duration-1000 ${systemSettings.theme === 'dark' ? 'leaflet-dark-mode' : ''}`} 
      />

      <style>{`
        /* Deep Dark Mode for Map */
        .leaflet-dark-mode .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-dark-mode .leaflet-container {
            background: #0f172a !important;
        }

        .rider-marker-v2 {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 20;
        }
        .marker-inner {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: 11px;
            z-index: 2;
            border: 2px solid white;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
        }
        .marker-blue .marker-inner { background: #3b82f6; }
        .marker-emerald .marker-inner { background: #10b981; }

        .marker-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            z-index: 1;
            animation: marker-pulse-anim 2s infinite;
        }
        .marker-blue .marker-pulse { background: rgba(59, 130, 246, 0.4); }
        .marker-emerald .marker-pulse { background: rgba(16, 185, 129, 0.4); }

        @keyframes marker-pulse-anim {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
        }

        .leaflet-popup-content-wrapper {
            background: white;
            color: #1e293b;
            border-radius: 12px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-tip { background: white; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out { 
            background: white !important; 
            color: #64748b !important; 
            border: 1px solid #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
};

export default MapView;
