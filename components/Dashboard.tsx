
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { Role, Delivery, RiderStatus, DeliveryStatus, PaymentStatus } from '../types';
import { CogIcon, TruckIcon, UserCircleIcon, MapIcon, ChartBarIcon } from './icons';
import DeliveriesTable from './DeliveriesTable';
import CreateDelivery from './CreateDelivery';
import ManageStaff from './ManageStaff';
import Settings from './Settings';
import MapView from './MapView';
import VendorFinancials from './VendorFinancials';
import UserProfile from './UserProfile';
import LocationGuard from './LocationGuard';
import { audioService } from '../services/audioService';

const Dashboard: React.FC = () => {
  const { currentUser, deliveries, handleUpdateUser, systemSettings } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [selectedOrderForNav, setSelectedOrderForNav] = useState<Delivery | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(audioService.isEnabled());
  const [isMuted, setIsMuted] = useState(audioService.isMuted());
  const prevDeliveriesCount = useRef(deliveries.length);

  // Auto-enable audio on login/dashboard mount
  useEffect(() => {
    if (!audioUnlocked) {
      audioService.enable();
      setAudioUnlocked(true);
      setIsMuted(false);
    }
  }, [audioUnlocked]);

  // Persistent Notification Logic
  const pendingActions = useMemo(() => {
    return deliveries.filter(d => {
      const isPendingStatus = d.status === DeliveryStatus.Pending;
      const isUnpaidDelivered = d.status === DeliveryStatus.Delivered && d.paymentStatus === PaymentStatus.Unpaid;
      
      if (currentUser?.role === Role.SuperAdmin || currentUser?.role === Role.Admin) {
        return isPendingStatus || isUnpaidDelivered;
      }
      if (currentUser?.role === Role.Rider) {
        return (isPendingStatus) || (d.rider?.id === currentUser.id && isUnpaidDelivered);
      }
      return false;
    });
  }, [deliveries, currentUser]);

  // Continuous Sound Interval for Pending Actions
  useEffect(() => {
    let interval: number | null = null;
    
    if (pendingActions.length > 0 && audioUnlocked && !isMuted) {
      // Play immediately
      audioService.play(systemSettings?.systemSounds?.newOrder);
      
      // Set interval to play every 30 seconds until cleared
      interval = window.setInterval(() => {
        audioService.play(systemSettings?.systemSounds?.newOrder);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pendingActions.length, audioUnlocked, isMuted, systemSettings?.systemSounds?.newOrder]);

  useEffect(() => {
    if (audioUnlocked && !isMuted && systemSettings?.systemSounds?.login) {
      audioService.play(systemSettings.systemSounds.login);
    }
  }, [audioUnlocked, isMuted, systemSettings?.systemSounds?.login]);

  useEffect(() => {
    if (deliveries.length > prevDeliveriesCount.current && audioUnlocked && !isMuted && systemSettings?.systemSounds?.newOrder) {
      audioService.play(systemSettings.systemSounds.newOrder);
    }
    prevDeliveriesCount.current = deliveries.length;
  }, [deliveries.length, systemSettings?.systemSounds?.newOrder, audioUnlocked, isMuted]);

  const toggleMute = () => {
    const newMuteState = !isMuted;
    audioService.setMuted(newMuteState);
    setIsMuted(newMuteState);
  };

  const userDeliveries = useMemo(() => deliveries.filter(d => {
    if (currentUser?.role === Role.SuperAdmin || currentUser?.role === Role.Admin) return true;
    if (currentUser?.role === Role.Rider) return d.rider?.id === currentUser.id;
    if (currentUser?.role === Role.Vendor) return d.vendorId === currentUser.id;
    if (currentUser?.role === Role.Customer) return d.customer.phone === currentUser.phone;
    return false;
  }), [deliveries, currentUser]);

  const handleLocateOrder = (delivery: Delivery) => {
    setSelectedOrderForNav(delivery);
    setActiveTab('map');
  };

  const getStreetAndLandmark = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      const addr = data.address;
      const landmark = addr.amenity || addr.building || addr.shop || addr.tourism || addr.historic || addr.office || addr.leisure || data.name;
      const road = addr.road || addr.suburb || addr.neighbourhood || 'Asaba Main Way';
      if (landmark && landmark !== road && !road.includes(landmark)) {
        return `${road} (${landmark})`;
      }
      return road;
    } catch (error) {
      return 'Active Signal...';
    }
  };

  const handleManualSync = async () => {
    if (!currentUser || isSyncing) return;
    setIsSyncing(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const exactAddress = await getStreetAndLandmark(latitude, longitude);
        await handleUpdateUser(currentUser.id, { 
          location: { lat: latitude, lng: longitude },
          vehicle: exactAddress, 
          locationStatus: 'Active'
        });
        setTimeout(() => setIsSyncing(false), 800);
      },
      (err) => {
        setIsSyncing(false);
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  useEffect(() => {
    let watchId: number | null = null;
    if (currentUser?.role === Role.Rider && currentUser.riderStatus === 'Available') {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const exactAddress = await getStreetAndLandmark(latitude, longitude);
            await handleUpdateUser(currentUser.id, { 
              location: { lat: latitude, lng: longitude },
              vehicle: exactAddress,
              locationStatus: 'Active'
            });
          },
          (err) => console.error("Persistent Watcher Error:", err),
          { 
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 10000 
          }
        );
      }
    }
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
  }, [currentUser?.role, currentUser?.riderStatus, currentUser?.id]);

  const handleClockToggle = async () => {
    if (!currentUser) return;
    const isClockingIn = currentUser.riderStatus !== 'Available';
    if (isClockingIn) {
      setIsSyncing(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          const exactAddress = await getStreetAndLandmark(coords.lat, coords.lng);
          await handleUpdateUser(currentUser.id, { 
            riderStatus: 'Available', 
            location: coords,
            locationStatus: 'Active',
            vehicle: exactAddress
          });
          setIsSyncing(false);
          if (audioUnlocked && !isMuted && systemSettings?.systemSounds?.statusChange) {
            audioService.play(systemSettings.systemSounds.statusChange);
          }
        },
        () => {
          setIsSyncing(false);
          alert("GPS signal required to begin shift.");
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      await handleUpdateUser(currentUser.id, { 
        riderStatus: 'Offline',
        locationStatus: 'Disabled',
        vehicle: 'Offline' 
      });
      if (audioUnlocked && !isMuted && systemSettings?.systemSounds?.statusChange) {
        audioService.play(systemSettings.systemSounds.statusChange);
      }
    }
  };

  const tabs = [
    { id: 'deliveries', label: 'Home', icon: <TruckIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Vendor, Role.Rider, Role.Customer] },
    { id: 'map', label: 'Fleet', icon: <MapIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Rider] },
    { id: 'manageStaff', label: 'Staff', icon: <UserCircleIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin] },
    { id: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Vendor, Role.Rider, Role.Customer] },
    { id: 'settings', label: 'Config', icon: <CogIcon className="w-5 h-5" />, roles: [Role.SuperAdmin] },
  ];

  const availableTabs = tabs.filter(tab => tab.roles.includes(currentUser!.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="flex justify-end">
                <button 
                  onClick={toggleMute}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                    isMuted ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  }`}
                >
                  {isMuted ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                      Muted
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                      Audio On
                    </>
                  )}
                </button>
             </div>
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 transition-colors">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl"><TruckIcon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{userDeliveries.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 transition-colors">
                    <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><ChartBarIcon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest">Live</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{userDeliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed').length}</p>
                    </div>
                </div>
                <div className="hidden lg:flex bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 items-center gap-4">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><UserCircleIcon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Success</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {userDeliveries.length > 0 ? Math.round((userDeliveries.filter(d => d.status === 'Delivered').length / userDeliveries.length) * 100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {[Role.SuperAdmin, Role.Admin, Role.Rider, Role.Vendor].includes(currentUser!.role) && <CreateDelivery />}

            <div className="space-y-4">
                <DeliveriesTable 
                  title="Active Fleet Queue" 
                  deliveries={userDeliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed')} 
                  onLocate={handleLocateOrder}
                />
                <DeliveriesTable 
                  title="Order Archive" 
                  deliveries={userDeliveries.filter(d => d.status === 'Delivered' || d.status === 'Failed')} 
                />
            </div>
          </div>
        );
      case 'map': return <MapView targetOrder={selectedOrderForNav} />;
      case 'manageStaff': return <ManageStaff />;
      case 'profile': return <UserProfile />;
      case 'settings': return <Settings />;
      case 'financials': return <VendorFinancials settleVendor={() => {}} />;
      default: return null;
    }
  };

  return (
    <LocationGuard>
      <div className="flex flex-col min-h-[calc(100vh-180px)]">
        {/* Continuous Notification Bar */}
        {pendingActions.length > 0 && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-r from-amber-600 to-rose-600 p-4 rounded-2xl shadow-xl shadow-rose-500/20 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <h4 className="text-white font-black text-[11px] uppercase tracking-widest">Immediate Attention Required</h4>
                  <p className="text-white/80 text-[10px] font-bold uppercase">{pendingActions.length} Pending Actions in Logistics Queue</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveTab('deliveries');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="w-full md:w-auto px-6 py-2.5 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all active:scale-95"
              >
                Resolve Now
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-1">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit uppercase">
              {availableTabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              Fleet Control Panel
            </p>
          </div>
          
          {currentUser?.role === Role.Rider && (
            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              <div className="flex flex-col md:flex-row items-end md:items-center gap-3 w-full">
                {currentUser.riderStatus === 'Available' && (
                  <div className="flex flex-col items-end animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        Telemetry Online
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase italic bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 shadow-sm max-w-[200px] truncate">
                        📍 {currentUser.vehicle && currentUser.vehicle !== 'Offline' ? currentUser.vehicle : 'Acquiring Street Address...'}
                      </p>
                      <button 
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isSyncing 
                          ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse' 
                          : 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-100 dark:border-slate-700 hover:scale-110 active:scale-95 shadow-sm'
                        }`}
                        title="Force Location Update"
                      >
                        <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                <button 
                  onClick={handleClockToggle}
                  disabled={isSyncing}
                  className={`w-full md:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-lg ${
                      currentUser.riderStatus === 'Available' 
                      ? 'bg-rose-600 text-white shadow-rose-500/20 hover:bg-rose-700' 
                      : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'
                  } ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isSyncing ? 'Syncing...' : (currentUser.riderStatus === 'Available' ? 'Go Offline' : 'Start Duty')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 pb-24 lg:pb-0">
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-24">
               <nav className="space-y-1">
                {availableTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'map') setSelectedOrderForNav(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex-grow min-w-0">
            {renderContent()}
          </div>
        </div>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-3 z-[60] flex justify-around items-center">
          {availableTabs.slice(0, 5).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'map') setSelectedOrderForNav(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center gap-1.5 p-2 transition-all ${
                activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-slate-400'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </LocationGuard>
  );
};

export default Dashboard;
