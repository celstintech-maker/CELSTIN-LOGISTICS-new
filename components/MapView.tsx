import React, { useEffect, useRef, useContext } from 'react';
import { AppContext } from '../App';
import { Role, User } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Declare L as a global from the CDN script
declare const L: any;

const MapView: React.FC = () => {
  const { systemSettings } = useContext(AppContext);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null); 
  
  // CRITICAL: We use a Ref to store markers. This allows us to update markers
  // directly via the Leaflet API without triggering React re-renders.
  const markersMapRef = useRef<Map<string, any>>(new Map());

  // 1. Initialize Map Instance (Runs once)
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false 
      }).setView([6.1957, 6.7296], 14); // Centered on Asaba

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
    };
  }, []);

  // 2. Real-time Subscription (The WebSocket-like stream)
  useEffect(() => {
    if (!mapRef.current) return;

    // Direct query for riders
    const ridersQuery = query(
      collection(db, 'users'), 
      where('role', '==', Role.Rider)
    );

    // Listen to changes in the database. When a coordinate updates, 
    // Firestore pushes the delta to this listener immediately.
    const unsubscribe = onSnapshot(ridersQuery, (snapshot) => {
      const map = mapRef.current;
      const activeIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const rider = { id: doc.id, ...doc.data() } as User;
        if (!rider.location) return;

        activeIds.add(rider.id);
        const position: [number, number] = [rider.location.lat, rider.location.lng];

        // CHECK: If marker exists, update its position directly
        if (markersMapRef.current.has(rider.id)) {
          const existingMarker = markersMapRef.current.get(rider.id);
          existingMarker.setLatLng(position);
        } else {
          // CREATE: If new rider detected, create icon and marker
          const riderIcon = L.divIcon({
            html: `<div class="rider-pulse-marker">
                    <div class="marker-dot"></div>
                    <div class="marker-label">${rider.name.charAt(0)}</div>
                    <div class="marker-wave"></div>
                   </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const newMarker = L.marker(position, { icon: riderIcon }).addTo(map);
          newMarker.bindPopup(`
            <div class="p-2 min-w-[120px]">
              <p class="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">${rider.name}</p>
              <p class="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Live Telemetry</p>
              <div class="flex items-center gap-1 mt-1 text-[9px] text-indigo-600 font-mono">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ONLINE
              </div>
            </div>
          `);
          markersMapRef.current.set(rider.id, newMarker);
        }
      });

      // CLEANUP: Remove markers for riders no longer in the snapshot
      markersMapRef.current.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.remove();
          markersMapRef.current.delete(id);
        }
      });
    }, (error) => {
      console.error("Map Telemetry Error:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-500">
      <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
             <span className="flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
          </div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white font-outfit uppercase tracking-[0.15em]">
            Real-time Fleet Intelligence
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">WebSocket Stream active</span>
        </div>
      </div>
      
      <div 
        ref={mapContainerRef} 
        className={`h-[600px] w-full relative z-10 ${systemSettings.theme === 'dark' ? 'leaflet-dark-theme' : ''}`} 
      />

      <style>{`
        .leaflet-dark-theme .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-dark-theme .leaflet-container {
            background: #020617 !important;
        }

        .rider-pulse-marker {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .marker-dot {
            width: 24px;
            height: 24px;
            background: #4f46e5;
            border-radius: 50%;
            border: 2px solid white;
            z-index: 10;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }

        .marker-label {
            position: absolute;
            z-index: 11;
            color: white;
            font-size: 11px;
            font-weight: 900;
            pointer-events: none;
        }

        .marker-wave {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(79, 70, 229, 0.3);
            animation: pulse-wave 2s infinite ease-out;
            z-index: 1;
        }

        @keyframes pulse-wave {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
        }

        .leaflet-popup-content-wrapper {
            background: white;
            color: #1e293b;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            padding: 0;
        }
        .dark .leaflet-popup-content-wrapper {
            background: #1e293b;
            color: white;
        }
      `}</style>
    </div>
  );
};

export default MapView;