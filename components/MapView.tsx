
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
  const routingControlRef = useRef<any | null>(null);
  const layersRef = useRef<{ [key: string]: any }>({});
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const prevCoordsRef = useRef<Map<string, {lat: number, lng: number, heading: number}>>(new Map());
  
  const [activeRiders, setActiveRiders] = useState<User[]>([]);
  const [selectedRider, setSelectedRider] = useState<User | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapMode, setMapMode] = useState<'logistics' | 'satellite'>('logistics');
  const [routeStats, setRouteStats] = useState<{distance: string, time: string} | null>(null);

  const isAdmin = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;

  const calculateHeading = (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    const dy = end.lat - start.lat;
    const dx = Math.cos(Math.PI / 180 * start.lat) * (end.lng - start.lng);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

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
      
      map.on('click', () => setSelectedRider(null));
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [systemSettings.theme]);

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
        
        const prev = prevCoordsRef.current.get(rider.id);
        const isMoving = prev && (Math.abs(prev.lat - rider.location.lat) > 0.0001 || Math.abs(prev.lng - rider.location.lng) > 0.0001);
        const heading = isMoving ? calculateHeading(prev!, rider.location) : (prev?.heading || 0);
        
        prevCoordsRef.current.set(rider.id, {lat: rider.location.lat, lng: rider.location.lng, heading});

        const statusColor = isOff ? '#f43f5e' : (rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#10b981');
        
        const riderIcon = L.divIcon({
          html: `<div class="radar-marker-pro ${isOff ? 'signal-off' : ''} ${isMoving ? 'is-moving' : 'is-static'}">
                  <div class="sonar-ring" style="border-color: ${statusColor}"></div>
                  <div class="marker-container">
                    <div class="marker-body" style="border-color: ${statusColor}">
                        ${rider.profilePicture ? `<img src="${rider.profilePicture}" class="marker-img" />` : `<div class="marker-initial">${rider.name.charAt(0)}</div>`}
                    </div>
                    <div class="marker-pointer" style="border-top-color: ${statusColor}"></div>
                  </div>
                  ${isMoving ? `<div class="heading-arrow" style="transform: translate(-50%, -50%) rotate(${heading}deg); border-bottom-color: ${statusColor}"></div>` : ''}
                 </div>`,
          className: 'leaflet-animated-icon',
          iconSize: [60, 60],
          iconAnchor: [30, 30],
        });

        if (markersMapRef.current.has(rider.id)) {
          const marker = markersMapRef.current.get(rider.id);
          marker.setLatLng(position);
          marker.setIcon(riderIcon);
        } else {
          const marker = L.marker(position, { icon: riderIcon }).addTo(map);
          marker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            setSelectedRider(rider);
            centerMap(rider.location!, 17);
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
    <div className="h-full w-full flex flex-col md:flex-row gap-4 animate-in fade-in duration-700">
      
      {isAdmin && (
        <div className="w-full md:w-80 h-[250px] md:h-[700px] flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Live Fleet Status</h3>
             <div className="flex items-center justify-between">
                <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Active Nodes</span>
                <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">{activeRiders.length} LIVE</span>
             </div>
          </div>
          
          <div className="flex flex-col gap-2 px-1">
            {activeRiders.map(rider => (
              <button 
                key={rider.id}
                onClick={() => {
                  if (rider.location) {
                    centerMap(rider.location, 17);
                    setSelectedRider(rider);
                  }
                }}
                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all text-left ${
                  selectedRider?.id === rider.id 
                  ? 'bg-indigo-600 border-indigo-500 shadow-lg' 
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-white/20">
                    {rider.profilePicture ? (
                      <img src={rider.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-indigo-500 uppercase text-lg">{rider.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    rider.locationStatus === 'Disabled' ? 'bg-rose-500' : (rider.riderStatus === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')
                  }`}></div>
                </div>
                <div className="overflow-hidden flex-grow">
                  <p className={`font-black text-[11px] uppercase truncate ${selectedRider?.id === rider.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{rider.name}</p>
                  <p className={`text-[9px] font-bold italic leading-tight mt-1 ${selectedRider?.id === rider.id ? 'text-indigo-100' : 'text-indigo-500'}`}>
                    📍 {rider.vehicle || 'Resolving Street Position...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-grow bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative h-[500px] md:h-[700px]">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        
        {selectedRider && (
          <div className="absolute top-6 left-6 right-6 md:right-auto md:w-80 z-[500] animate-in slide-in-from-left-4 duration-500">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl overflow-hidden">
               <div className="relative h-24 bg-indigo-600 flex items-center justify-center">
                  <button onClick={() => setSelectedRider(null)} className="absolute top-3 right-3 p-1.5 bg-black/20 text-white rounded-full transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <div className="absolute -bottom-8 left-6">
                     <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 overflow-hidden shadow-xl bg-slate-200">
                        {selectedRider.profilePicture ? (
                          <img src={selectedRider.profilePicture} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-black text-xl">{selectedRider.name.charAt(0)}</div>
                        )}
                     </div>
                  </div>
               </div>
               <div className="pt-10 pb-6 px-6">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight font-outfit">{selectedRider.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedRider.locationStatus === 'Disabled' ? 'bg-rose-500' : (selectedRider.riderStatus === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')}`}></span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedRider.riderStatus}</span>
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Telemetry Location</p>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 italic leading-snug">📍 {selectedRider.vehicle || 'Unknown Position'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <a href={`tel:${selectedRider.phone}`} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95">
                      Direct Call
                    </a>
                    <button onClick={() => centerMap(selectedRider.location!, 18)} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200">
                      Target Focus
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="absolute top-6 right-6 z-[400] flex flex-col gap-3">
          <button onClick={locateMe} disabled={isLocating} className="p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 text-indigo-600">
            {isLocating ? <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          </button>
          <button onClick={toggleMapMode} className={`p-4 backdrop-blur-md rounded-2xl shadow-xl border transition-all flex flex-col items-center gap-1 ${mapMode === 'satellite' ? 'bg-indigo-600 text-white' : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 border-white/20'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">{mapMode}</span>
          </button>
        </div>
      </div>

      <style>{`
        .radar-marker-pro { position: relative; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; pointer-events: auto !important; }
        .sonar-ring { position: absolute; width: 20px; height: 20px; border: 3px solid; border-radius: 50%; opacity: 0.6; animation: sonar-ping 2.5s ease-out infinite; pointer-events: none; }
        .marker-container { position: relative; z-index: 10; width: 44px; height: 44px; }
        .marker-body { width: 44px; height: 44px; border-radius: 50% 50% 50% 0; border: 3px solid; overflow: hidden; display: flex; align-items: center; justify-content: center; transform: rotate(-45deg); background: white; shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .marker-img { width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg); }
        .marker-initial { transform: rotate(45deg); font-weight: 900; color: #4f46e5; }
        .marker-pointer { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid; }
        .heading-arrow { position: absolute; top: 50%; left: 50%; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 24px solid; transform-origin: center; opacity: 0.6; z-index: 5; margin-top: -38px; }
        .signal-off .sonar-ring { display: none; }
        .signal-off .marker-body { filter: grayscale(1); opacity: 0.7; }
        @keyframes sonar-ping { 0% { width: 20px; height: 20px; opacity: 1; } 100% { width: 100px; height: 100px; opacity: 0; } }
        .leaflet-animated-icon { transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1), left 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
    </div>
  );
};

export default MapView;
