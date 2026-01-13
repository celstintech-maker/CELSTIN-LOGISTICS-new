
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { Role } from '../types';

const LocationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useContext(AppContext);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const performHandshake = () => {
    if (!navigator.geolocation) {
      setHasLocation(false);
      return;
    }

    setIsVerifying(true);
    // Force a high-accuracy request to trigger the system-level location prompt if off
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHasLocation(true);
        setIsVerifying(false);
      },
      (err) => {
        setHasLocation(false);
        setIsVerifying(false);
        console.error("GPS Handshake Failed:", err);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  useEffect(() => {
    // Only enforce for Riders (Critical) or Customers (For Routing)
    if (!currentUser || (currentUser.role !== Role.Rider && currentUser.role !== Role.Customer)) {
      setHasLocation(true);
      return;
    }

    // Initial check
    performHandshake();

    // Re-verify periodically to ensure they don't turn it off mid-shift
    const interval = setInterval(() => {
      if (currentUser.role === Role.Rider) {
        navigator.geolocation.getCurrentPosition(
          () => setHasLocation(true),
          () => setHasLocation(false),
          { enableHighAccuracy: true }
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  if (hasLocation === false) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative">
            <div className="w-24 h-24 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 relative z-10">
              <svg className={`w-12 h-12 ${isVerifying ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full animate-ping opacity-20"></div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight font-outfit leading-tight">
              {currentUser?.role === Role.Rider ? 'Telematics Required' : 'Location Required'}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {currentUser?.role === Role.Rider 
                ? 'Rider node detected. You must enable high-accuracy device location (GPS) to begin your shift and receive orders.'
                : 'Enable GPS to see real-time delivery estimates and nearby riders in Asaba.'}
            </p>
          </div>

          <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-left">System Lockdown Active</p>
            </div>
            <ul className="text-left text-xs text-slate-500 space-y-3">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">1</span>
                <span>Open your device <strong>Settings</strong> and find <strong>Location</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">2</span>
                <span>Switch Location to <strong>ON</strong> (High Accuracy Mode).</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]">3</span>
                <span>Click the button below to synchronize your fleet node.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={performHandshake}
              disabled={isVerifying}
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Synchronizing Hardware...
                </>
              ) : 'Verify GPS & Start Duty'}
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="text-[10px] font-black text-slate-500 uppercase tracking-widest py-2 hover:text-white transition-colors"
            >
              Hardware already on? Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LocationGuard;
