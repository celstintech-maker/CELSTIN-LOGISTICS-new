
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { NIGERIAN_BANKS } from '../constants';
import { SystemSettings } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-500">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 tracking-tight font-outfit uppercase">{title}</h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{label}</label>
        {children}
    </div>
);

const Settings: React.FC = () => {
    const { systemSettings, setSystemSettings } = useContext(AppContext);
    const [settings, setSettings] = useState<SystemSettings>(systemSettings);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setSettings(systemSettings);
    }, [systemSettings]);

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
          // Fallback for minimumBasePrice if not already in the object
          const payload = { 
            ...settings, 
            minimumBasePrice: settings.minimumBasePrice || 1500 
          };
          await setDoc(doc(db, "settings", "global"), payload);
          setSystemSettings(payload);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
          console.error(e);
          setSaveStatus('idle');
          alert("Error updating cloud settings terminal.");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const val = type === 'number' ? parseFloat(value) : value;
        setSettings(prev => ({ ...prev, [name]: val }));
    };

    const handleThemeToggle = (theme: 'light' | 'dark') => {
        setSettings(prev => ({ ...prev, theme }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-500">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-outfit uppercase">System Core</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure branding, pricing, and payments.</p>
                </div>
                <button
                    onClick={handleSave}
                    className={`font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg ${
                        saveStatus === 'saved' 
                        ? 'bg-emerald-600 text-white scale-105' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
                    }`}
                    disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                >
                    {saveStatus === 'saving' && 'Syncing...'}
                    {saveStatus === 'idle' && 'Push Updates'}
                    {saveStatus === 'saved' && '✓ Systems Synchronized'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <SettingsCard title="Logistics Pricing">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField label="Standard Price per KM (₦)">
                                <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₦</span>
                                <input 
                                    type="number" 
                                    name="pricePerKm" 
                                    value={settings.pricePerKm} 
                                    onChange={handleInputChange} 
                                    className="form-input pl-10" 
                                    placeholder="150"
                                />
                                </div>
                            </FormField>
                            <FormField label="Minimum Base Delivery Price (₦)">
                                <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₦</span>
                                <input 
                                    type="number" 
                                    name="minimumBasePrice" 
                                    value={settings.minimumBasePrice || 1500} 
                                    onChange={handleInputChange} 
                                    className="form-input pl-10" 
                                    placeholder="1500"
                                />
                                </div>
                            </FormField>
                            <FormField label="Hero Display Start Price (₦)">
                                <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₦</span>
                                <input 
                                    type="number" 
                                    name="baseStartingPrice" 
                                    value={settings.baseStartingPrice} 
                                    onChange={handleInputChange} 
                                    className="form-input pl-10" 
                                    placeholder="3000"
                                />
                                </div>
                            </FormField>
                         </div>
                    </SettingsCard>

                    <SettingsCard title="Identity & Branding">
                        <FormField label="Official Brand Name">
                            <input type="text" name="businessName" value={settings.businessName} onChange={handleInputChange} className="form-input" />
                        </FormField>
                        <FormField label="Landing Page Hero Headline">
                            <input type="text" name="heroTitle" value={settings.heroTitle} onChange={handleInputChange} className="form-input" placeholder="e.g. Rapid Logistics in Asaba" />
                        </FormField>
                        <FormField label="Landing Page Subtext">
                            <textarea name="heroSubtext" value={settings.heroSubtext} onChange={handleInputChange} rows={2} className="form-input" placeholder="Promotional subtext copy..." />
                        </FormField>
                        <FormField label="Headquarters Address">
                            <textarea name="businessAddress" value={settings.businessAddress} onChange={handleInputChange} rows={2} className="form-input" />
                        </FormField>
                        <FormField label="Corporate Logo">
                            <div className="flex flex-col gap-4">
                                {settings.logoUrl ? (
                                    <div className="relative group w-32 h-32">
                                        <img src={settings.logoUrl} className="w-full h-full rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 bg-white shadow-sm" alt="Logo preview" />
                                        <button onClick={() => setSettings(s => ({...s, logoUrl: ''}))} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 transition-all text-slate-400"
                                    >
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Master Logo</span>
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </div>
                        </FormField>
                    </SettingsCard>
                </div>
                
                <div className="space-y-8">
                    <SettingsCard title="Financial Configuration">
                        <FormField label="Primary Settlement Bank">
                            <select name="paymentBank" value={settings.paymentBank} onChange={handleInputChange} className="form-input">
                                {NIGERIAN_BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                            </select>
                        </FormField>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Vault Identifier">
                                <input type="text" name="paymentAccountNumber" value={settings.paymentAccountNumber} onChange={handleInputChange} className="form-input" />
                            </FormField>
                            <FormField label="Account Legal Title">
                                <input type="text" name="paymentAccountName" value={settings.paymentAccountName} onChange={handleInputChange} className="form-input" />
                            </FormField>
                        </div>
                    </SettingsCard>
                    <SettingsCard title="Interface & Theme">
                         <FormField label="System Mode">
                            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 border border-slate-200 dark:border-slate-800">
                                <button 
                                    onClick={() => handleThemeToggle('light')}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${settings.theme === 'light' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Clean Slate
                                </button>
                                <button 
                                    onClick={() => handleThemeToggle('dark')}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${settings.theme === 'dark' ? 'bg-slate-900 text-white shadow-sm border border-slate-800' : 'text-slate-500 hover:text-slate-400'}`}
                                >
                                    Midnight Onyx
                                </button>
                            </div>
                         </FormField>
                    </SettingsCard>
                </div>
            </div>
             <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    padding: 0.875rem 1.25rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #1e293b;
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 1rem;
                    transition: all 0.3s ease;
                }
                .dark .form-input {
                    background-color: #020617;
                    border-color: #1e293b;
                    color: #f1f5f9;
                }
                .form-input:focus { outline: 0; border-color: #6366f1; box-shadow: 0 0 0 4px rgb(99 102 241 / 0.1); }
             `}</style>
        </div>
    );
};

export default Settings;
