
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
  const layersRef = useRef<{ [key: string]: any }>({});
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const [activeRiders, setActiveRiders] = useState<User[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [mapMode, setMapMode] = useState<'logistics' | 'satellite'>('logistics');

  const centerMap = (coords: {lat: number, lng: number}, zoom = 15) => {
    if (mapRef.current) {
      mapRef.current.flyTo([coords.lat, coords.lng], zoom, { 
        duration: 1.5, 
        easeLinearity: 0.25,
        noMoveStart: true 
      });
    }
  };

  const toggleMapMode = () => {
    const newMode = mapMode === 'logistics' ? 'satellite' : 'logistics';
    setMapMode(newMode);
    
    if (mapRef.current) {
      if (newMode === 'satellite') {
        mapRef.current.removeLayer(layersRef.current.logistics);
        layersRef.current.satellite.addTo(mapRef.current);
      } else {
        mapRef.current.removeLayer(layersRef.current.satellite);
        layersRef.current.logistics.addTo(mapRef.current);
      }
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
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([6.1957, 6.7296], 13);

      const logisticsUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      layersRef.current.logistics = L.tileLayer(logisticsUrl, {
        maxZoom: 20,
        attribution: '&copy; CartoDB'
      });

      layersRef.current.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
      });

      layersRef.current.logistics.addTo(map);
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

  const generatePopupContent = (rider: User) => {
    const isOff = rider.locationStatus === 'Disabled';
    return `
      <div class="p-4 text-center min-w-[200px] animate-in fade-in duration-300">
        <p class="font-black text-[11px] uppercase tracking-[0.1em] text-indigo-600 mb-1 leading-none">${rider.name}</p>
        <div class="flex items-center justify-center gap-1.5 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <span class="w-2 h-2 rounded-full ${isOff ? 'bg-rose-500' : (rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-amber-500')} ${isOff ? '' : 'animate-pulse'}"></span>
          <span class="text-[10px] font-black ${isOff ? 'text-rose-500' : 'text-slate-500'} uppercase tracking-tighter">
            ${isOff ? 'LOCATION TURNED OFF' : rider.riderStatus}
          </span>
        </div>
        <div class="${isOff ? 'bg-rose-500/10 border-rose-200' : 'bg-indigo-600 border-indigo-400'} p-3 rounded-xl border shadow-xl mb-2">
           <p class="text-[10px] font-black ${isOff ? 'text-rose-600' : 'text-white'} uppercase leading-tight italic">
            📍 ${isOff ? 'SIGNAL TERMINATED' : (rider.vehicle || 'Tracing Route...')}
           </p>
        </div>
        <div class="flex flex-col gap-0.5 opacity-60">
          <p class="text-[7px] text-slate-400 font-mono tracking-tighter uppercase">${isOff ? 'Last Known Lat/Lng' : 'Live Telemetry'}</p>
          <p class="text-[7px] text-slate-400 font-mono tracking-tighter">${rider.location?.lat.toFixed(6)}, ${rider.location?.lng.toFixed(6)}</p>
        </div>
      </div>
    `;
  };

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
        
        if (!rider.location) return;

        const isOff = rider.locationStatus === 'Disabled';
        const position: [number, number] = [rider.location.lat, rider.location.lng];

        if (markersMapRef.current.has(rider.id)) {
          const marker = markersMapRef.current.get(rider.id);
          marker.setLatLng(position);
          
          // Update icon color based on status
          const statusColor = isOff ? '#f43f5e' : (rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#10b981');
          const newIcon = L.divIcon({
            html: `<div class="rider-marker-v4 ${isOff ? 'signal-off' : ''}">
                    <div class="marker-shadow"></div>
                    <div class="marker-pulse" style="background: ${statusColor}"></div>
                    <div class="marker-pointer" style="border-top-color: ${statusColor}"></div>
                    <div class="marker-body" style="background: ${statusColor}">
                      ${rider.profilePicture ? `<img src="${rider.profilePicture}" class="marker-img" />` : `<span class="marker-initial">${rider.name.charAt(0)}</span>`}
                    </div>
                   </div>`,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 44],
            popupAnchor: [0, -48]
          });
          marker.setIcon(newIcon);
          
          if (marker.isPopupOpen()) {
             marker.getPopup().setContent(generatePopupContent(rider));
          }
        } else {
          const statusColor = isOff ? '#f43f5e' : (rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#10b981');
          const riderIcon = L.divIcon({
            html: `<div class="rider-marker-v4 ${isOff ? 'signal-off' : ''}">
                    <div class="marker-shadow"></div>
                    <div class="marker-pulse" style="background: ${statusColor}"></div>
                    <div class="marker-pointer" style="border-top-color: ${statusColor}"></div>
                    <div class="marker-body" style="background: ${statusColor}">
                      ${rider.profilePicture ? `<img src="${rider.profilePicture}" class="marker-img" />` : `<span class="marker-initial">${rider.name.charAt(0)}</span>`}
                    </div>
                   </div>`,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 44],
            popupAnchor: [0, -48]
          });

          const marker = L.marker(position, { icon: riderIcon }).addTo(map);
          marker.bindPopup(generatePopupContent(rider), { 
            closeButton: false, 
            offset: [0, -5], 
            className: 'custom-fleet-popup' 
          });
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative h-[500px] md:h-[650px]">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        
        <div className="absolute top-6 left-6 z-[400] flex flex-col gap-3">
          <button onClick={locateMe} disabled={isLocating} className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 hover:scale-110 active:scale-95 transition-all text-indigo-600">
            {isLocating ? <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          </button>
          <button onClick={toggleMapMode} className={`p-4 backdrop-blur-md rounded-2xl shadow-xl border transition-all flex flex-col items-center gap-1 ${mapMode === 'satellite' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-white/20'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">{mapMode}</span>
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:w-72 z-[400]">
           <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Connectivity</p>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">
                  {activeRiders.filter(r => r.locationStatus === 'Active').length} Active
                </span>
              </div>
              <div className="flex flex-col gap-2">
                 {activeRiders.some(r => r.locationStatus === 'Disabled') && (
                    <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg flex items-center justify-between">
                       <p className="text-[9px] font-black text-rose-600 uppercase">Alert: Signal Dropped</p>
                       <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    </div>
                 )}
                 <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 italic">
                    {activeRiders.find(r => r.locationStatus === 'Active' && r.vehicle)?.vehicle || 'Monitoring Fleet Nodes...'}
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {activeRiders.map(rider => (
            <button key={rider.id} onClick={() => rider.location && centerMap(rider.location, 18)} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all shrink-0 hover:shadow-lg group relative ${rider.locationStatus === 'Disabled' ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 opacity-70' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-indigo-500'}`}>
              <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shadow-sm transition-colors ${rider.locationStatus === 'Disabled' ? 'border-rose-400 grayscale' : 'border-white dark:border-slate-800 group-hover:border-indigo-500'}`}>
                {rider.profilePicture ? <img src={rider.profilePicture} className="w-full h-full object-cover" /> : <div className="bg-indigo-600 text-white w-full h-full flex items-center justify-center font-bold text-xs">{rider.name.charAt(0)}</div>}
              </div>
              <div className="text-left z-10 max-w-[220px]">
                <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white truncate tracking-tight">{rider.name}</p>
                <div className="flex flex-col mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 italic truncate px-2 py-0.5 rounded-md ${rider.locationStatus === 'Disabled' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'}`}>
                    {rider.locationStatus === 'Disabled' ? 'OFFLINE / SIGNAL LOST' : (rider.vehicle || 'On Route')}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${rider.locationStatus === 'Disabled' ? 'bg-rose-500' : (rider.riderStatus === 'Available' ? 'bg-emerald-500' : 'bg-amber-500')}`}></span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{rider.locationStatus === 'Disabled' ? 'DISCONNECTED' : rider.riderStatus}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .rider-marker-v4 { display: flex; align-items: center; justify-content: center; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .signal-off .marker-body { filter: grayscale(1) brightness(0.7); border-color: #f43f5e; }
        .signal-off .marker-pulse { background: #f43f5e !important; animation: none; opacity: 0.1; }
        .marker-body { width: 44px; height: 44px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3.5px solid white; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 5; }
        .marker-pointer { position: absolute; bottom: -8px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid white; z-index: 4; }
        .marker-img, .marker-initial { width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg); }
        .marker-initial { display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 16px; }
        .marker-pulse { position: absolute; width: 50px; height: 50px; border-radius: 50%; opacity: 0.3; animation: marker-pulse-v4 2.5s infinite ease-out; z-index: 1; }
        .marker-shadow { position: absolute; width: 24px; height: 10px; background: rgba(0,0,0,0.4); border-radius: 50%; bottom: -10px; filter: blur(4px); z-index: 0; }
        @keyframes marker-pulse-v4 { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
        .custom-fleet-popup .leaflet-popup-content-wrapper { border-radius: 24px; background: rgba(255,255,255,0.98); box-shadow: 0 20px 50px rgba(0,0,0,0.3); padding: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.2); }
        .dark .custom-fleet-popup .leaflet-popup-content-wrapper { background: #0f172a; color: white; border: 1px solid rgba(255,255,255,0.1); }
        .custom-fleet-popup .leaflet-popup-content { margin: 0; }
        .leaflet-marker-icon { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), left 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
};

export default MapView;
