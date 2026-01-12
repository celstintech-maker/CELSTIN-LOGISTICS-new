
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
  const [isLocating, setIsLocating] = useState(false);

  const centerMap = (coords: {lat: number, lng: number}, zoom = 15) => {
    if (mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], zoom, { duration: 1.5, easeLinearity: 0.25 });
    }
  };

  const locateMe = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        centerMap({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 17);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const isDark = systemSettings.theme === 'dark';
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        preferCanvas: true,
        fadeAnimation: true
      }).setView([6.1957, 6.7296], 13);

      // Using CartoDB high-contrast tiles for better logistics visibility
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 20,
        attribution: '&copy; CartoDB | CLESTIN FLEET INTEL'
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
  }, [systemSettings.theme]);

  useEffect(() => {
    if (targetOrder?.rider?.location) {
      centerMap(targetOrder.rider.location, 17);
      if (markersMapRef.current.has(targetOrder.rider.id)) {
        markersMapRef.current.get(targetOrder.rider.id).openPopup();
      }
    }
  }, [targetOrder]);

  useEffect(() => {
    const ridersQuery = query(
      collection(db, 'users'), 
      where('role', '==', Role.Rider),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(ridersQuery, (snapshot) => {
      const map = mapRef.current;
      if (!map) return;
      
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
          markersMapRef.current.get(rider.id).setLatLng(position);
        } else {
          const statusColor = rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#4f46e5';
          const riderIcon = L.divIcon({
            html: `<div class="rider-marker-v2">
                    <div class="marker-pulse" style="background: ${statusColor}"></div>
                    <div class="marker-body" style="background: ${statusColor}">
                      ${rider.profilePicture ? `<img src="${rider.profilePicture}" class="marker-img" />` : `<span class="marker-initial">${rider.name.charAt(0)}</span>`}
                    </div>
                   </div>`,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          const marker = L.marker(position, { icon: riderIcon }).addTo(map);
          marker.bindPopup(`
            <div class="p-3 text-center min-w-[140px]">
              <p class="font-black text-[10px] uppercase tracking-widest text-indigo-600 mb-1">${rider.name}</p>
              <div class="flex items-center justify-center gap-1.5 mb-2">
                <span class="w-1.5 h-1.5 rounded-full ${rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-tighter">${rider.riderStatus}</span>
              </div>
              ${rider.vehicle ? `<p class="text-[8px] font-bold text-indigo-500 uppercase italic mb-2">📍 ${rider.vehicle}</p>` : ''}
              <p class="text-[8px] text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800 pt-2">${rider.location.lat.toFixed(5)}, ${rider.location.lng.toFixed(5)}</p>
            </div>
          `, { closeButton: false, offset: [0, -15] });
          markersMapRef.current.set(rider.id, marker);
        }
      });

      markersMapRef.current.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.remove();
          markersMapRef.current.delete(id);
        }
      });
      setActiveRiders(ridersList);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full w-full flex flex-col gap-4 animate-in fade-in duration-700">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative h-[500px] md:h-[600px]">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        
        <div className="absolute top-6 left-6 z-[400] flex flex-col gap-3">
          <button 
            onClick={locateMe} 
            disabled={isLocating}
            className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 hover:scale-110 active:scale-95 transition-all text-indigo-600 disabled:opacity-50"
          >
            {isLocating ? (
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            )}
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:w-64 z-[400]">
           <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Fleet Signal</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">Live Nodes</span>
                </div>
                <span className="text-xs font-black text-indigo-600">{activeRiders.filter(r => r.locationStatus === 'Active').length}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {activeRiders.length === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase py-4">No active fleet nodes detected</p>}
          {activeRiders.map(rider => (
            <button 
              key={rider.id}
              onClick={() => rider.location && centerMap(rider.location, 18)}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all shrink-0 hover:shadow-lg group"
            >
              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm group-hover:border-indigo-500 transition-colors">
                {rider.profilePicture ? <img src={rider.profilePicture} className="w-full h-full object-cover" /> : <div className="bg-indigo-600 text-white w-full h-full flex items-center justify-center font-bold text-xs">{rider.name.charAt(0)}</div>}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate max-w-[120px]">{rider.name}</p>
                <div className="flex flex-col mt-0.5">
                  <span className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5 italic">{rider.vehicle || 'Unknown Loc'}</span>
                  <div className="flex items-center gap-1">
                    <span className={`w-1 h-1 rounded-full ${rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">{rider.riderStatus}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .rider-marker-v2 {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .marker-body {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid white;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 2;
        }
        .marker-pulse {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          opacity: 0.4;
          animation: marker-pulse-anim 2s infinite ease-out;
          z-index: 1;
        }
        @keyframes marker-pulse-anim {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .marker-img, .marker-initial {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .marker-initial {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 14px;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .dark .leaflet-popup-content-wrapper {
          background: #0f172a;
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default MapView;
