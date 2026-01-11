
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

  // Initialize Map Instance with High-Detail Tiles
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        preferCanvas: true,
        maxZoom: 20
      }).setView([6.1957, 6.7296], 14);

      // Using OSM France HOT tiles which provide superior POI density and building footprints in African urban hubs like Asaba
      const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors, Landmarks via HOT'
      });

      // Optional: Terrain/Landmark layer for detailed street navigation
      const osmStreets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      });

      osmHOT.addTo(map);

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

  // Enhanced Landmark/Navigation View
  useEffect(() => {
    if (mapRef.current && targetOrder && currentUser?.location) {
      const map = mapRef.current;
      const riderPos = [currentUser.location.lat, currentUser.location.lng];
      
      // Fly to highly zoomed view to see building footprints
      map.flyTo(riderPos, 18, { duration: 2.5 });
      
      const destIcon = L.divIcon({
        html: `<div class="dest-marker animate-bounce">
                <div class="dest-pin shadow-2xl"></div>
                <div class="dest-label-container shadow-xl">
                    <span class="dest-label-text">${targetOrder.dropoffAddress.split(',')[0]}</span>
                </div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });
      
      // Simulate/approximate landmark position for UI feedback (in real app, use geocoded coords)
      const landmarkPos: [number, number] = [currentUser.location.lat + 0.0015, currentUser.location.lng + 0.0015];
      const destMarker = L.marker(landmarkPos, { icon: destIcon }).addTo(map);
      
      destMarker.bindPopup(`
        <div class="p-3 font-outfit min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <p class="text-[10px] font-black uppercase text-rose-500 tracking-widest">Active Landmark Target</p>
          </div>
          <p class="font-bold text-slate-900 dark:text-white text-sm leading-tight mb-2">${targetOrder.dropoffAddress}</p>
          <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
            <p class="text-[9px] font-bold text-slate-500 uppercase">Package Note</p>
            <p class="text-[10px] text-slate-700 dark:text-slate-300 italic">"${targetOrder.packageNotes}"</p>
          </div>
        </div>
      `, { closeButton: false }).openPopup();
      
      return () => { destMarker.remove(); };
    }
  }, [targetOrder, currentUser?.location]);

  // Real-time Telemetry Subscription
  useEffect(() => {
    if (!mapRef.current) return;

    const ridersQuery = query(
      collection(db, 'users'), 
      where('role', '==', Role.Rider),
      where('active', '==', true),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(ridersQuery, (snapshot) => {
      const map = mapRef.current;
      const activeIds = new Set<string>();
      const ridersList: User[] = [];

      snapshot.docs.forEach(doc => {
        const rider = { id: doc.id, ...doc.data() } as User;
        activeIds.add(rider.id);
        ridersList.push(rider);
        
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
            <div class="p-3 min-w-[150px] font-outfit">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <p class="font-bold text-slate-900 dark:text-white">${rider.name}</p>
                <div class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                    <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full ${rider.riderStatus === 'On Delivery' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}"></span>
                <span class="text-[9px] font-black uppercase text-slate-500 tracking-widest">${rider.riderStatus || 'Active'}</span>
              </div>
              <p class="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Live Telemetry Active</p>
            </div>
          `, { closeButton: false });
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
        alert(`${rider.name} has disabled GPS tracking.`);
        return;
    }
    if (mapRef.current && rider.location) {
      mapRef.current.flyTo([rider.location.lat, rider.location.lng], 19, { duration: 1.5 });
      markersMapRef.current.get(rider.id)?.openPopup();
    }
  };

  const isAdminView = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-in zoom-in-95 duration-500">
      <div className="flex-grow bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-[0.1em]">
                      {targetOrder ? 'Landmark Navigation Mode' : 'Fleet Intelligence Feed'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">Delta Region • Asaba Core</span>
                </div>
            </div>
        </div>

        <div 
          ref={mapContainerRef} 
          className={`h-[700px] w-full relative z-10 ${systemSettings.theme === 'dark' ? 'leaflet-dark-theme' : ''}`} 
        />
        
        {/* Terrain Indicator Overlay */}
        <div className="absolute bottom-4 left-4 z-[400] bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black text-white uppercase tracking-widest pointer-events-none">
            HD Terrain Enabled
        </div>
      </div>

      {isAdminView && (
        <div className="xl:w-80 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personnel Grid</h3>
                <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <div className="space-y-3 overflow-y-auto no-scrollbar flex-grow pr-1">
              {activeRiders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <svg className="w-8 h-8 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round"/></svg>
                    <p className="text-xs text-slate-400 font-medium">No signals detected</p>
                </div>
              ) : activeRiders.map(rider => (
                <button 
                  key={rider.id}
                  onClick={() => focusRider(rider)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 group relative overflow-hidden ${
                      rider.locationStatus === 'Disabled' 
                      ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 opacity-60' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/30 hover:shadow-lg'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full border-2 overflow-hidden transition-all group-hover:scale-105 ${rider.locationStatus === 'Disabled' ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    {rider.profilePicture ? (
                      <img src={rider.profilePicture} className="w-full h-full object-cover" alt={rider.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800">
                        <span className="text-xs font-bold">{rider.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{rider.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${rider.riderStatus === 'On Delivery' ? 'bg-amber-500' : rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                          {rider.locationStatus === 'Disabled' ? 'SIGNAL LOST' : (rider.riderStatus || 'STANDBY')}
                        </span>
                    </div>
                  </div>
                  {rider.locationStatus !== 'Disabled' && (
                    <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"/></svg>
                    </div>
                  )}
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
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
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

        .dest-marker {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dest-pin {
          width: 16px;
          height: 16px;
          background: #ef4444;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
          z-index: 2;
        }

        .dest-label-container {
          position: absolute;
          top: -32px;
          background: #ef4444;
          color: white;
          padding: 4px 12px;
          border-radius: 10px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
          z-index: 3;
          white-space: nowrap;
        }

        .dest-label-text {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @keyframes pulse-wave {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
        }

        .leaflet-popup-content-wrapper {
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            padding: 0;
            border: 1px solid #f1f5f9;
            overflow: hidden;
        }
        .dark .leaflet-popup-content-wrapper { background: #0f172a; color: white; border-color: #1e293b; }
        .leaflet-popup-tip { background: white; }
        .dark .leaflet-popup-tip { background: #0f172a; }
        .leaflet-container { font-family: 'Inter', sans-serif !important; }
      `}</style>
    </div>
  );
};

export default MapView;
