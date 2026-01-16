
import React, { useContext } from 'react';
import { AppContext } from '../App';

const Footer: React.FC = () => {
    const { systemSettings } = useContext(AppContext);
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950/50 py-10 mt-auto">
      <div className="container mx-auto px-6 flex flex-col items-center">
        <div className="flex gap-4 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-wide text-center">{systemSettings.footerText}</p>
        <div className="mt-4 flex gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <a href={systemSettings.privacyLink || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Privacy</a>
            <a href={systemSettings.logisticsTermsLink || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Logistics Terms</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Node Security</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
