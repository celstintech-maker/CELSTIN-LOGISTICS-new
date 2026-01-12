
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { Role } from '../types';

const LocationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useContext(AppContext);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  useEffect(() => {
    // Only enforce for Riders or Customers (Admins can view dashboard but need location for fleet map specifically)
    if (!currentUser || (currentUser.role !== Role.Rider && currentUser.role !== Role.Customer)) {
      setHasLocation(true);
      return;
    }

    const checkLocation = () => {
      if (!navigator.geolocation) {
        setHasLocation(false);
        return;
      }

      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          setHasLocation(true);
        } else if (result.state === 'prompt') {
          // Trigger a silent request to check if they will allow it
          navigator.geolocation.getCurrentPosition(
            () => setHasLocation(true),
            () => setHasLocation(false)
          );
        } else {
          setHasLocation(false);
        }

        result.onchange = () => {
          setHasLocation(result.state === 'granted');
        };
      });
    };

    checkLocation();
    const interval = setInterval(checkLocation, 5000); // Re-check occasionally
    return () => clearInterval(interval);
  }, [currentUser]);

  if (hasLocation === false) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight font-outfit">Location Required</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              CLESTIN LOGISTICS requires real-time GPS telemetry to verify fleet operations and calculate delivery routes in Asaba.
            </p>
          </div>
          <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">How to enable</p>
            <ul className="text-left text-xs text-slate-500 space-y-3">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-white font-bold">1</span>
                <span>Click the **Lock Icon** in your browser address bar.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-white font-bold">2</span>
                <span>Toggle **Location** to "On" or "Allow".</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-white font-bold">3</span>
                <span>Refresh this page to initialize the fleet node.</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20"
          >
            I've Enabled GPS - Reload
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LocationGuard;
