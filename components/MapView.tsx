
import React, { useEffect, useRef, useContext, useState } from 'react';
import { AppContext } from '../App';
import { Role, User, Delivery } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

declare const L: any;

interface MapViewProps {
  targetOrder?: Delivery | null;
}

const MapView: React.FC<MapViewProps> = ({ targetOrder }) => {
  const { systemSettings, currentUser } = useContext(AppContext);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null); 
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const [activeRiders, setActiveRiders] = useState<User[]>([]);

  // Initialize Map Instance
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false 
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
    };
  }, []);

  // Sync target location if navigation mode is active
  useEffect(() => {
    if (mapRef.current && targetOrder && currentUser?.location) {
      const map = mapRef.current;
      // In a real app, we'd geocode the address. Here we simulate near the rider.
      const riderPos = [currentUser.location.lat, currentUser.location.lng];
      map.setView(riderPos, 16);
      
      // Add a special marker for the delivery destination
      const destIcon = L.divIcon({
        html: `<div class="dest-marker"><svg class="w-8 h-8 text-rose-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      
      const destMarker = L.marker([currentUser.location.lat + 0.005, currentUser.location.lng + 0.005], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`<b>Destination</b><br/>${targetOrder.dropoffAddress}`).openPopup();
      
      return () => { destMarker.remove(); };
    }
  }, [targetOrder, currentUser?.location]);

  // Real-time Telemetry Subscription
  useEffect(() => {
    if (!mapRef.current) return;

    const ridersQuery = query(
      collection(db, 'users'), 
      where('role', '==', Role.Rider),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(ridersQuery, (snapshot) => {
      const map = mapRef.current;
      const activeIds = new Set<string>();
      const ridersList: User[] = [];

      snapshot.docs.forEach(doc => {
        const rider = { id: doc.id, ...doc.data() } as User;
        if (!rider.location && rider.locationStatus !== 'Disabled') return;

        activeIds.add(rider.id);
        ridersList.push(rider);
        
        // Skip map marker if location is disabled, but keep in list
        if (rider.locationStatus === 'Disabled' || !rider.location) {
            if (markersMapRef.current.has(rider.id)) {
                markersMapRef.current.get(rider.id).remove();
                markersMapRef.current.delete(rider.id);
            }
            return;
        }

        const position: [number, number] = [rider.location.lat, rider.location.lng];

        if (markersMapRef.current.has(rider.id)) {
          const existingMarker = markersMapRef.current.get(rider.id);
          existingMarker.setLatLng(position);
        } else {
          const statusColor = rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#10b981';
          const riderIcon = L.divIcon({
            html: `<div class="rider-pulse-marker">
                    <div class="marker-dot" style="background: ${statusColor}"></div>
                    <div class="marker-label">${rider.name.charAt(0)}</div>
                    <div class="marker-wave" style="background: ${statusColor}4d"></div>
                   </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const newMarker = L.marker(position, { icon: riderIcon }).addTo(map);
          newMarker.bindPopup(`
            <div class="p-2 min-w-[140px]">
              <p class="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">${rider.name}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="w-2 h-2 rounded-full ${rider.riderStatus === 'On Delivery' ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
                <span class="text-[10px] font-black uppercase text-slate-500">${rider.riderStatus || 'Active'}</span>
              </div>
              <p class="text-[9px] text-slate-400 mt-1">Vehicle: ${rider.vehicle || 'Standard'}</p>
            </div>
          `);
          markersMapRef.current.set(rider.id, newMarker);
        }
      });

      setActiveRiders(ridersList);

      markersMapRef.current.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.remove();
          markersMapRef.current.delete(id);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const focusRider = (rider: User) => {
    if (rider.locationStatus === 'Disabled') {
        alert(`${rider.name} has disabled GPS tracking. Command cannot snap to their coordinate.`);
        return;
    }
    if (mapRef.current && rider.location) {
      mapRef.current.flyTo([rider.location.lat, rider.location.lng], 16, { duration: 1.5 });
      markersMapRef.current.get(rider.id)?.openPopup();
    }
  };

  const isAdminView = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-in zoom-in-95 duration-500">
      <div className="flex-grow bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-widest">
                        {targetOrder ? 'Navigation Active' : 'Fleet Telemetry Live'}
                    </span>
                </div>
            </div>
        </div>

        <div 
          ref={mapContainerRef} 
          className={`h-[600px] w-full relative z-10 ${systemSettings.theme === 'dark' ? 'leaflet-dark-theme' : ''}`} 
        />
      </div>

      {isAdminView && (
        <div className="xl:w-80 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Fleet Feed ({activeRiders.length})</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar">
              {activeRiders.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No riders currently on grid.</p>
              ) : activeRiders.map(rider => (
                <button 
                  key={rider.id}
                  onClick={() => focusRider(rider)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 group ${
                      rider.locationStatus === 'Disabled' 
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 overflow-hidden transition-colors ${rider.locationStatus === 'Disabled' ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    {rider.profilePicture ? (
                      <img src={rider.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{rider.name}</p>
                        {rider.locationStatus === 'Disabled' && (
                            <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">OFFLINE GPS</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${rider.riderStatus === 'On Delivery' ? 'bg-amber-500' : rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{rider.riderStatus || 'Idle'}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-dark-theme .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-dark-theme .leaflet-container { background: #020617 !important; }

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
            animation: pulse-wave 2s infinite ease-out;
            z-index: 1;
        }

        .dest-marker { animation: bounce 2s infinite; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }

        @keyframes pulse-wave {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .leaflet-popup-content-wrapper {
            background: white;
            color: #1e293b;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            padding: 0;
        }
        .dark .leaflet-popup-content-wrapper { background: #1e293b; color: white; }
      `}</style>
    </div>
  );
};

export default MapView;
