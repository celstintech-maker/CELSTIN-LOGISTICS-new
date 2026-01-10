
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { TruckIcon, LogoutIcon, UserCircleIcon } from './icons';

const Header: React.FC = () => {
  const { currentUser, logout, systemSettings, setSystemSettings } = useContext(AppContext);

  const colors: { [key: string]: string } = {
      blue: 'bg-blue-600',
      green: 'bg-emerald-600',
      indigo: 'bg-indigo-600',
      red: 'bg-rose-600',
  }

  const toggleTheme = () => {
    setSystemSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-slate-200 dark:border-slate-800/60 transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center space-x-4">
           {systemSettings.logoUrl ? (
             <img src={systemSettings.logoUrl} className="w-10 h-10 rounded-xl object-cover shadow-lg border border-slate-200 dark:border-slate-700 bg-white" alt="Logo" />
           ) : (
             <div className={`p-2.5 rounded-2xl shadow-lg ${colors[systemSettings.primaryColor] || 'bg-indigo-600'} text-white`}>
                <TruckIcon className="w-6 h-6" />
             </div>
           )}
           <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-1 uppercase font-outfit">{systemSettings.businessName}</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Logistics Network</p>
           </div>
        </div>
        
        <div className="flex items-center space-x-3 md:space-x-6">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all"
            title="Toggle Appearance"
          >
            {systemSettings.theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            )}
          </button>

          {currentUser && (
            <div className="flex items-center space-x-3 md:space-x-6">
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-none">{currentUser.name}</span>
                <span className={`text-[11px] font-bold uppercase tracking-tighter mt-1 ${systemSettings.primaryColor === 'indigo' ? 'text-indigo-500' : 'text-emerald-500'}`}>{currentUser.role}</span>
              </div>
              <div className="relative group">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors">
                    <UserCircleIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                aria-label="Logout"
              >
                <LogoutIcon className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
