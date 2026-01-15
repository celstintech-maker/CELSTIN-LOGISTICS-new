
import React, { useEffect, useRef, useContext, useState } from 'react';
import { AppContext } from '../App';
import { Role, User, Delivery } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

declare const L: any;

interface MapViewProps {
  targetOrder?: Delivery | null;
}

interface PathPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

const MapView: React.FC<MapViewProps> = ({ targetOrder }) => {
  const { systemSettings, currentUser } = useContext(AppContext);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any | null>(null); 
  const layersRef = useRef<{ [key: string]: any }>({});
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const prevCoordsRef = useRef<Map<string, {lat: number, lng: number, heading: number}>>(new Map());
  
  const riderPathsRef = useRef<Map<string, PathPoint[]>>(new Map());
  const activePolylineRef = useRef<any>(null);

  const [activeRiders, setActiveRiders] = useState<User[]>([]);
  const [selectedRider, setSelectedRider] = useState<User | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapMode, setMapMode] = useState<'logistics' | 'satellite'>('logistics');

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLinks, setAiLinks] = useState<{ title: string; uri: string }[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const isAdmin = currentUser?.role === Role.Admin || currentUser?.role === Role.SuperAdmin;
  const isRider = currentUser?.role === Role.Rider;
  const canUseAi = isAdmin || isRider;

  const handleAiNavigation = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiThinking(true);
    setAiResponse(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentLoc = currentUser?.location || { lat: 6.1957, lng: 6.7296 };
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Current GPS: ${currentLoc.lat}, ${currentLoc.lng} (Asaba). Task: ${aiPrompt}. 
                  Provide concise routing advice for a delivery personnel. 
                  Highlight shortcuts via Nnebisi, Okpanam Road, or DLA.`,
        config: {
          systemInstruction: "You are the CLESTIN AI Dispatcher. You specialize in Asaba logistics. Use Google Maps grounding to provide real-world location links and short, actionable driving/riding directions.",
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: currentLoc.lat,
                longitude: currentLoc.lng
              }
            }
          }
        },
      });

      setAiResponse(response.text || "Analyzed your route.");
      const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((chunk: any) => chunk.maps)
        ?.map((chunk: any) => ({
          title: chunk.maps.title,
          uri: chunk.maps.uri
        })) || [];
      setAiLinks(links);
      setAiPrompt('');
    } catch (error) {
      console.error("AI Navigator Error:", error);
      setAiResponse("AI Node Offline. Please check your satellite link.");
    } finally {
      setIsAiThinking(false);
    }
  };

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
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (activePolylineRef.current) {
      activePolylineRef.current.remove();
      activePolylineRef.current = null;
    }

    if (selectedRider) {
      const path = riderPathsRef.current.get(selectedRider.id) || [];
      if (path.length > 1) {
        const latLngs = path.map(p => [p.lat, p.lng]);
        activePolylineRef.current = L.polyline(latLngs, {
          color: '#4f46e5',
          weight: 6,
          opacity: 0.6,
          lineJoin: 'round',
          dashArray: '10, 10',
          className: 'logistics-path-animation'
        }).addTo(mapRef.current);
      }
    }
  }, [selectedRider, activeRiders]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const isDark = systemSettings.theme === 'dark';
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        preferCanvas: true,
      }).setView([6.1957, 6.7296], 13);

      // CartoDB styles that mirror Google Maps palette more closely than standard OSM
      const logisticsUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      layersRef.current.logistics = L.tileLayer(logisticsUrl, {
        maxZoom: 20,
        attribution: '&copy; CartoDB &copy; Google'
      });

      layersRef.current.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Esri'
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

    const unsubscribe = onSnapshot(ridersQuery, { includeMetadataChanges: true }, (snapshot) => {
      const map = mapRef.current;
      if (!map) return;
      
      const activeIds = new Set<string>();
      const ridersList: User[] = [];
      const now = Date.now();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const rider = { id: doc.id, ...data } as User;
        ridersList.push(rider);
        
        const lat = typeof rider.location?.lat === 'number' ? rider.location.lat : parseFloat(rider.location?.lat as any);
        const lng = typeof rider.location?.lng === 'number' ? rider.location.lng : parseFloat(rider.location?.lng as any);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        activeIds.add(rider.id);
        const position: [number, number] = [lat, lng];
        
        let currentPath = riderPathsRef.current.get(rider.id) || [];
        const lastPoint = currentPath[currentPath.length - 1];
        
        if (!lastPoint || Math.abs(lastPoint.lat - lat) > 0.00005 || Math.abs(lastPoint.lng - lng) > 0.00005) {
            currentPath.push({ lat, lng, timestamp: now });
        }
        
        currentPath = currentPath.filter(p => now - p.timestamp < 1800000); // 30 mins history
        riderPathsRef.current.set(rider.id, currentPath);

        const prev = prevCoordsRef.current.get(rider.id);
        const isMoving = prev && (Math.abs(prev.lat - lat) > 0.00001 || Math.abs(prev.lng - lng) > 0.00001);
        const heading = isMoving ? calculateHeading(prev!, {lat, lng}) : (prev?.heading || 0);
        
        prevCoordsRef.current.set(rider.id, {lat, lng, heading});

        const isOff = rider.locationStatus === 'Disabled' || rider.riderStatus === 'Offline';
        const statusColor = isOff ? '#64748b' : (rider.riderStatus === 'On Delivery' ? '#f59e0b' : '#3b82f6');
        
        const riderIcon = L.divIcon({
          html: `<div class="rider-beacon ${isOff ? 'is-off' : ''} ${isMoving ? 'is-moving' : ''}">
                  <div class="beacon-pulse" style="background-color: ${statusColor}"></div>
                  <div class="beacon-core" style="border-color: #fff; background-color: ${statusColor}; border-width: 2px">
                      ${rider.profilePicture 
                        ? `<img src="${rider.profilePicture}" class="beacon-img" />` 
                        : `<div class="beacon-initial" style="color: #fff">${rider.name.charAt(0)}</div>`
                      }
                  </div>
                  <div class="beacon-pointer" style="border-top-color: #fff"></div>
                  ${isMoving ? `<div class="beacon-direction" style="transform: translate(-50%, -50%) rotate(${heading}deg); border-bottom-color: ${statusColor}"></div>` : ''}
                 </div>`,
          className: 'custom-rider-icon',
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });

        if (markersMapRef.current.has(rider.id)) {
          const marker = markersMapRef.current.get(rider.id);
          marker.setLatLng(position);
          marker.setIcon(riderIcon);
        } else {
          const marker = L.marker(position, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
          marker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            setSelectedRider(rider);
            centerMap({lat, lng}, 17);
          });
          markersMapRef.current.set(rider.id, marker);
        }
      });

      markersMapRef.current.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.remove();
          markersMapRef.current.delete(id);
          riderPathsRef.current.delete(id);
        }
      });
      
      setActiveRiders(ridersList);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-full w-full flex flex-col md:flex-row gap-4 animate-in fade-in duration-700">
      
      {isAdmin && (
        <div className="w-full md:w-80 h-[250px] md:h-[700px] flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 text-center">Dispatch Console</h3>
             <div className="flex items-center justify-between">
                <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Live Fleet</span>
                <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
                  {activeRiders.filter(r => r.riderStatus !== 'Offline').length} ONLINE
                </span>
             </div>
          </div>
          
          <div className="flex flex-col gap-2 px-1">
            {activeRiders.sort((a,b) => (a.riderStatus === 'Available' ? -1 : 1)).map(rider => (
              <button 
                key={rider.id}
                onClick={() => {
                  if (rider.location) {
                    centerMap({lat: rider.location.lat, lng: rider.location.lng}, 17);
                    setSelectedRider(rider);
                  }
                }}
                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all text-left group ${
                  selectedRider?.id === rider.id 
                  ? 'bg-blue-600 border-blue-500 shadow-xl scale-[1.02]' 
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 ${selectedRider?.id === rider.id ? 'border-white' : 'border-slate-200 dark:border-slate-700'}`}>
                    {rider.profilePicture ? (
                      <img src={rider.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-blue-500 uppercase text-lg">{rider.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    rider.riderStatus === 'Offline' ? 'bg-slate-400' : (rider.riderStatus === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')
                  }`}></div>
                </div>
                <div className="overflow-hidden flex-grow">
                  <p className={`font-black text-[11px] uppercase truncate ${selectedRider?.id === rider.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{rider.name}</p>
                  <p className={`text-[9px] font-bold leading-tight mt-1 ${selectedRider?.id === rider.id ? 'text-blue-100' : 'text-blue-500'}`}>
                    {rider.vehicle && rider.vehicle !== 'Offline' ? `📍 ${rider.vehicle}` : 'Acquiring GPS...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-grow bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative h-[500px] md:h-[700px]">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        
        {canUseAi && (
          <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-96 z-[500] animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logistics AI Assistant</span>
                  </div>
                  {aiResponse && (
                    <button onClick={() => setAiResponse(null)} className="text-[10px] font-black text-blue-500 uppercase hover:text-blue-600 transition-colors">Reset</button>
                  )}
                </div>

                {aiResponse ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                        {aiResponse}
                      </p>
                    </div>
                    {aiLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {aiLinks.map((link, i) => (
                          <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black text-blue-600 dark:text-blue-400 hover:scale-105 transition-all shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            {link.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 10V7m0 10L9 7"/></svg>
                    </div>
                    <input 
                      type="text" 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiNavigation()}
                      placeholder="e.g. Find Nnebisi road shortcut?"
                      className="w-full bg-slate-100 dark:bg-slate-900 border-2 border-transparent focus:border-blue-500 rounded-2xl pl-11 pr-24 py-4 text-xs font-bold outline-none transition-all text-slate-900 dark:text-white shadow-inner"
                    />
                    <button 
                      onClick={handleAiNavigation}
                      disabled={isAiThinking || !aiPrompt.trim()}
                      className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-20 transition-all flex items-center gap-2"
                    >
                      {isAiThinking ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Plan'}
                    </button>
                  </div>
                )}
             </div>
          </div>
        )}

        {selectedRider && (
          <div className="absolute top-6 left-6 right-6 md:right-auto md:w-80 z-[500] animate-in slide-in-from-left-4 duration-500">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800 shadow-2xl overflow-hidden">
               <div className="relative h-20 bg-blue-600 flex items-center justify-center">
                  <button onClick={() => setSelectedRider(null)} className="absolute top-3 right-3 p-1.5 bg-black/20 text-white rounded-full transition-all hover:bg-black/40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <div className="absolute -bottom-6 left-6">
                     <div className="w-14 h-14 rounded-2xl border-4 border-white dark:border-slate-900 overflow-hidden shadow-xl bg-slate-200">
                        {selectedRider.profilePicture ? (
                          <img src={selectedRider.profilePicture} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-black text-xl">{selectedRider.name.charAt(0)}</div>
                        )}
                     </div>
                  </div>
               </div>
               <div className="pt-8 pb-6 px-6">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedRider.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedRider.riderStatus === 'Offline' ? 'bg-slate-400' : (selectedRider.riderStatus === 'Available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')}`}></span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedRider.riderStatus}</span>
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Position</p>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-snug">📍 {selectedRider.vehicle || 'Stationary'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <a href={`tel:${selectedRider.phone}`} className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                      Call Rider
                    </a>
                    <button onClick={() => selectedRider.location && centerMap({lat: selectedRider.location.lat, lng: selectedRider.location.lng}, 18)} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
                      Recenter
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="absolute top-6 right-6 z-[400] flex flex-col gap-3">
          <button onClick={locateMe} disabled={isLocating} className="p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 text-blue-600 hover:scale-105 active:scale-95 transition-all">
            {isLocating ? <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          </button>
          <button onClick={toggleMapMode} className={`p-4 backdrop-blur-md rounded-2xl shadow-xl border transition-all flex flex-col items-center gap-1 ${mapMode === 'satellite' ? 'bg-blue-600 text-white' : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 border-white/20'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">{mapMode === 'logistics' ? 'MAP' : 'SAT'}</span>
          </button>
        </div>
      </div>

      <style>{`
        .rider-beacon { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .beacon-pulse { position: absolute; width: 24px; height: 24px; border-radius: 50%; opacity: 0.5; animation: beacon-ping 2s infinite; }
        .beacon-core { position: relative; z-index: 10; width: 34px; height: 34px; background: white; border: 3px solid; border-radius: 50% 50% 50% 2px; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 6px 12px -2px rgba(0,0,0,0.3); transition: background-color 0.5s; }
        .beacon-img { width: 100%; height: 100%; object-fit: cover; transform: rotate(45deg); }
        .beacon-initial { transform: rotate(45deg); font-weight: 900; font-size: 16px; }
        .beacon-pointer { position: absolute; bottom: 0px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid; z-index: 5; }
        .beacon-direction { position: absolute; top: 50%; left: 50%; width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-bottom: 24px solid; transform-origin: center; opacity: 0.35; z-index: 2; margin-top: -36px; }
        .is-off .beacon-pulse { display: none; }
        .is-off .beacon-core { filter: grayscale(1); opacity: 0.8; }
        @keyframes beacon-ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3.8); opacity: 0; } }
        
        .logistics-path-animation {
            stroke-dashoffset: 40;
            animation: dash 12s linear infinite;
            filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));
        }
        @keyframes dash {
            to {
                stroke-dashoffset: 0;
            }
        }
        .leaflet-marker-icon { transition: transform 0.5s linear, top 0.5s linear, left 0.5s linear !important; }
      `}</style>
    </div>
  );
};

export default MapView;
