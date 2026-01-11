
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

  // Initialize Map Instance with Advanced Terrain
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        preferCanvas: true
      }).setView([6.1957, 6.7296], 14);

      // Using a more detailed street layer that reveals shops/landmarks at high zoom
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors, Landmarks via HOT'
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
      const riderPos = [currentUser.location.lat, currentUser.location.lng];
      
      map.flyTo(riderPos, 18, { duration: 2 });
      
      const destIcon = L.divIcon({
        html: `<div class="dest-marker">
                <div class="dest-pin"></div>
                <div class="dest-label">${targetOrder.dropoffAddress.split(',')[0]}</div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });
      
      const destMarker = L.marker([currentUser.location.lat + 0.003, currentUser.location.lng + 0.003], { icon: destIcon }).addTo(map);
      destMarker.bindPopup(`
        <div class="p-2 font-outfit">
          <p class="text-[10px] font-black uppercase text-indigo-500 mb-1">Target Landmark</p>
          <p class="font-bold text-slate-800">${targetOrder.dropoffAddress}</p>
        </div>
      `).openPopup();
      
      return () => { destMarker.remove(); };
    }
  }, [targetOrder, currentUser?.location]);

  // Real-time Telemetry Subscription
  useEffect(() => {
    if (!mapRef.current) return;

    // Filter out users who are logically deleted or inactive
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
            <div class="p-2 min-w-[140px] font-outfit">
              <p class="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">${rider.name}</p>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="w-2 h-2 rounded-full ${rider.riderStatus === 'On Delivery' ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
                <span class="text-[10px] font-black uppercase text-slate-500">${rider.riderStatus || 'Active'}</span>
              </div>
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
        alert(`${rider.name} has disabled GPS tracking.`);
        return;
    }
    if (mapRef.current && rider.location) {
      mapRef.current.flyTo([rider.location.lat, rider.location.lng], 18, { duration: 1.5 });
      markersMapRef.current.get(rider.id)?.openPopup();
    }
  };

  const isAdminView = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-in zoom-in-95 duration-500">
      <div className="flex-grow bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-widest">
                        {targetOrder ? 'Detailed Landmark View' : 'Global Fleet Live'}
                    </span>
                </div>
            </div>
        </div>

        <div 
          ref={mapContainerRef} 
          className={`h-[650px] w-full relative z-10 ${systemSettings.theme === 'dark' ? 'leaflet-dark-theme' : ''}`} 
        />
      </div>

      {isAdminView && (
        <div className="xl:w-80 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">Active Grid Feed</h3>
            <div className="space-y-3 overflow-y-auto no-scrollbar flex-grow">
              {activeRiders.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-12">No active riders detected.</p>
              ) : activeRiders.map(rider => (
                <button 
                  key={rider.id}
                  onClick={() => focusRider(rider)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 group ${
                      rider.locationStatus === 'Disabled' 
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-950/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-colors ${rider.locationStatus === 'Disabled' ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    {rider.profilePicture ? (
                      <img src={rider.profilePicture} className="w-full h-full object-cover" alt={rider.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800">
                        <span className="text-xs font-bold">{rider.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{rider.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${rider.riderStatus === 'On Delivery' ? 'bg-amber-500' : rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                          {rider.locationStatus === 'Disabled' ? 'GPS OFFLINE' : (rider.riderStatus || 'IDLE')}
                        </span>
                    </div>
                  </div>
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
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          z-index: 2;
        }

        .dest-label {
          position: absolute;
          top: -25px;
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          text-transform: uppercase;
        }

        @keyframes pulse-wave {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
        }

        .leaflet-popup-content-wrapper {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            padding: 0;
            border: 1px solid #f1f5f9;
        }
        .dark .leaflet-popup-content-wrapper { background: #1e293b; color: white; border-color: #334155; }
      `}</style>
    </div>
  );
};

export default MapView;
