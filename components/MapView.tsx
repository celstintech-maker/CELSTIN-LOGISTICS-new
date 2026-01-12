
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

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Asaba, Nigeria")}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (e) {
      return null;
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

  useEffect(() => {
    if (!mapRef.current) return;

    const buildRoute = async () => {
      if (!targetOrder) {
        if (routingControlRef.current) {
          mapRef.current.removeControl(routingControlRef.current);
          routingControlRef.current = null;
          setRouteStats(null);
        }
        return;
      }

      const pickupCoords = await geocodeAddress(targetOrder.pickupAddress);
      const dropoffCoords = await geocodeAddress(targetOrder.dropoffAddress);
      
      if (!pickupCoords || !dropoffCoords) return;

      const waypoints = [
        L.latLng(pickupCoords.lat, pickupCoords.lng),
        L.latLng(dropoffCoords.lat, dropoffCoords.lng)
      ];

      // If rider is assigned, make them the starting point of the logistics chain
      if (targetOrder.rider?.id) {
        const assignedRider = activeRiders.find(r => r.id === targetOrder.rider?.id);
        if (assignedRider?.location) {
          waypoints.unshift(L.latLng(assignedRider.location.lat, assignedRider.location.lng));
        }
      }

      if (routingControlRef.current) {
        mapRef.current.removeControl(routingControlRef.current);
      }

      routingControlRef.current = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        showAlternatives: false,
        createMarker: (i: number, wp: any) => {
          const isFirst = i === 0;
          const isLast = i === waypoints.length - 1;
          const iconHtml = isFirst 
            ? `<div class="bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>`
            : isLast 
              ? `<div class="bg-rose-600 text-white p-2 rounded-full shadow-lg border-2 border-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg></div>`
              : `<div class="bg-amber-500 text-white p-2 rounded-full shadow-lg border-2 border-white"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>`;
          
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              className: '',
              html: iconHtml,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          });
        },
        lineOptions: {
          styles: [{ color: '#4f46e5', weight: 6, opacity: 0.8 }]
        }
      }).addTo(mapRef.current);

      routingControlRef.current.on('routesfound', (e: any) => {
        const route = e.routes[0];
        setRouteStats({
          distance: (route.summary.totalDistance / 1000).toFixed(1) + ' km',
          time: Math.round(route.summary.totalTime / 60) + ' mins'
        });
        
        // Auto-fit bounds to show the whole journey
        const bounds = L.latLngBounds(waypoints);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      });
    };

    buildRoute();
  }, [targetOrder, activeRiders]);

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
        const isMoving = prev && (Math.abs(prev.lat - rider.location.lat) > 0.00001 || Math.abs(prev.lng - rider.location.lng) > 0.00001);
        const heading = isMoving ? calculateHeading(prev!, rider.location) : (prev?.heading || 0);
        
        prevCoordsRef.current.set(rider.id, {lat: rider.location.lat, lng: rider.location.lng, heading});

        const statusColor = isOff ? '#f43f5e' : (rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#10b981');
        
        const riderIcon = L.divIcon({
          html: `<div class="radar-marker-pro ${isOff ? 'signal-off' : ''} ${isMoving ? 'is-moving' : 'is-static'}" style="z-index: ${isMoving ? 1000 : 500}">
                  <div class="radar-beam-container">
                    <div class="radar-beam" style="background: conic-gradient(from 0deg, ${statusColor}00 0%, ${statusColor}44 50%, ${statusColor}88 100%);"></div>
                  </div>
                  <div class="sonar-ring" style="border-color: ${statusColor}"></div>
                  <div class="marker-container" style="transform: rotate(${heading + 45}deg)">
                    <div class="marker-shadow"></div>
                    <div class="marker-pointer" style="border-top-color: ${statusColor}"></div>
                    <div class="marker-body" style="background: ${statusColor}">
                      <div class="marker-content-wrapper" style="transform: rotate(${- (heading + 45)}deg)">
                        ${rider.profilePicture ? `<img src="${rider.profilePicture}" class="marker-img" />` : `<span class="marker-initial">${rider.name.charAt(0)}</span>`}
                      </div>
                    </div>
                  </div>
                  ${isMoving ? `<div class="heading-arrow" style="transform: translate(-50%, -50%) rotate(${heading}deg); border-bottom-color: ${statusColor}"></div>` : ''}
                 </div>`,
          className: 'leaflet-animated-icon',
          iconSize: [80, 80],
          iconAnchor: [40, 40],
        });

        if (markersMapRef.current.has(rider.id)) {
          const marker = markersMapRef.current.get(rider.id);
          marker.setLatLng(position);
          marker.setIcon(riderIcon);
          marker.off('click').on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            setSelectedRider(rider);
            centerMap(rider.location!, 17);
          });
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
          prevCoordsRef.current.delete(id);
        }
      });
      
      setActiveRiders(ridersList);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4 animate-in fade-in duration-700">
      
      {/* Admin Fleet Sidebar */}
      {isAdmin && (
        <div className="w-full md:w-80 h-48 md:h-[700px] flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Live Fleet Registry</h3>
             <div className="flex items-center justify-between">
                <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Active Nodes</span>
                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{activeRiders.length}</span>
             </div>
          </div>
          
          <div className="flex flex-col gap-2">
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
                  ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20' 
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-800'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-white/20">
                    {rider.profilePicture ? (
                      <img src={rider.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-indigo-500 uppercase">{rider.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    rider.locationStatus === 'Disabled' ? 'bg-rose-500' : (rider.riderStatus === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')
                  }`}></div>
                </div>
                <div className="overflow-hidden">
                  <p className={`font-black text-[11px] uppercase truncate ${selectedRider?.id === rider.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{rider.name}</p>
                  <p className={`text-[9px] font-bold truncate italic ${selectedRider?.id === rider.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {rider.vehicle || 'Signal pending...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Map Terminal */}
      <div className="flex-grow bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative h-[550px] md:h-[700px]">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        
        {/* Route Stats HUD */}
        {routeStats && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-top-4 duration-500">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Logistics Span</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{routeStats.distance}</span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">ETA Stream</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{routeStats.time}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Rider Overlay */}
        {selectedRider && (
          <div className="absolute top-6 left-6 right-6 md:right-auto md:w-80 z-[500] animate-in slide-in-from-left-4 duration-500">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl overflow-hidden">
               <div className="relative h-20 bg-indigo-600 flex items-center justify-center">
                  <button onClick={() => setSelectedRider(null)} className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all">
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
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedRider.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${selectedRider.locationStatus === 'Disabled' ? 'bg-rose-500' : (selectedRider.riderStatus === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')}`}></span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{selectedRider.riderStatus}</span>
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Broadcast Position</p>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 italic">{selectedRider.vehicle || 'Active Address Unknown'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <a href={`tel:${selectedRider.phone}`} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      Voice Link
                    </a>
                    <button onClick={() => centerMap(selectedRider.location!, 18)} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                      Focus Pin
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute top-6 right-6 z-[400] flex flex-col gap-3">
          <button onClick={locateMe} disabled={isLocating} className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 hover:scale-110 active:scale-95 transition-all text-indigo-600">
            {isLocating ? <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          </button>
          <button onClick={toggleMapMode} className={`p-4 backdrop-blur-md rounded-2xl shadow-xl border transition-all flex flex-col items-center gap-1 ${mapMode === 'satellite' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-white/20'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">{mapMode}</span>
          </button>
        </div>
      </div>

      <style>{`
        .radar-marker-pro { position: relative; display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; pointer-events: auto !important; }
        .radar-beam-container { position: absolute; width: 100%; height: 100%; animation: radar-rotate 4s linear infinite; z-index: 1; pointer-events: none; }
        .radar-beam { position: absolute; width: 50%; height: 50%; top: 0; left: 50%; transform-origin: bottom left; border-radius: 100% 0 0 0; }
        .sonar-ring { position: absolute; width: 20px; height: 20px; border: 2px solid; border-radius: 50%; opacity: 0.6; animation: sonar-ping 2s ease-out infinite; z-index: 0; pointer-events: none; }
        .marker-container { position: relative; z-index: 10; width: 44px; height: 44px; transition: transform 0.3s ease; }
        .marker-body { width: 44px; height: 44px; border-radius: 50% 50% 50% 0; border: 3px solid white; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
        .marker-content-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .marker-img { width: 100%; height: 100%; object-fit: cover; }
        .marker-initial { color: white; font-weight: 900; font-size: 16px; }
        .marker-pointer { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid; }
        .marker-shadow { position: absolute; width: 20px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; bottom: -12px; left: 50%; transform: translateX(-50%); filter: blur(3px); }
        .heading-arrow { position: absolute; top: 50%; left: 50%; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 25px solid; transform-origin: center; opacity: 0.6; z-index: 5; margin-top: -35px; }
        .signal-off .radar-beam-container, .signal-off .sonar-ring { display: none; }
        .signal-off .marker-body { filter: grayscale(1) brightness(0.7); }
        @keyframes radar-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes sonar-ping { 0% { width: 20px; height: 20px; opacity: 1; } 100% { width: 100px; height: 100px; opacity: 0; } }
        .leaflet-animated-icon { transition: transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.5s cubic-bezier(0.25, 0.1, 0.25, 1), left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1); }
      `}</style>
    </div>
  );
};

export default MapView;
