
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { NIGERIAN_BANKS } from '../constants';
import { SystemSettings } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SOUND_LIBRARY } from '../services/audioService';

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
          const payload = { 
            ...settings, 
            minimumBasePrice: settings.minimumBasePrice || 1500,
            systemSounds: settings.systemSounds || {
                login: SOUND_LIBRARY.MODERN.CHIME,
                newOrder: SOUND_LIBRARY.MODERN.ALERT,
                statusChange: SOUND_LIBRARY.MODERN.POP,
                paymentConfirmed: SOUND_LIBRARY.MODERN.SUCCESS
            }
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

    const handleSoundChange = (event: keyof typeof settings.systemSounds, value: string) => {
        setSettings(prev => ({
            ...prev,
            systemSounds: { ...prev.systemSounds, [event]: value }
        }));
    };

    const previewSound = (url: string) => {
        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.play().catch(() => {});
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

    const soundCategories = [
        { key: 'login' as const, label: 'System Online (Login)' },
        { key: 'newOrder' as const, label: 'New Order Alert' },
        { key: 'statusChange' as const, label: 'Status Update Pop' },
        { key: 'paymentConfirmed' as const, label: 'Payment Verified Success' },
    ];

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-500">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-outfit uppercase">System Core</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure branding, pricing, and governance.</p>
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
                    <SettingsCard title="Audio Intelligence">
                        <div className="space-y-6">
                            {soundCategories.map(cat => (
                                <FormField key={cat.key} label={cat.label}>
                                    <div className="flex gap-2">
                                        <select 
                                            value={settings.systemSounds[cat.key]} 
                                            onChange={(e) => handleSoundChange(cat.key, e.target.value)}
                                            className="form-input flex-grow"
                                        >
                                            <optgroup label="Modern Suite">
                                                {Object.entries(SOUND_LIBRARY.MODERN).map(([name, url]) => (
                                                    <option key={url} value={url}>Modern - {name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Classic Suite">
                                                {Object.entries(SOUND_LIBRARY.CLASSIC).map(([name, url]) => (
                                                    <option key={url} value={url}>Classic - {name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Retro Suite">
                                                {Object.entries(SOUND_LIBRARY.RETRO).map(([name, url]) => (
                                                    <option key={url} value={url}>Retro - {name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <button 
                                            onClick={() => previewSound(settings.systemSounds[cat.key])}
                                            className="p-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors"
                                            title="Preview Sound"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                                        </button>
                                    </div>
                                </FormField>
                            ))}
                        </div>
                    </SettingsCard>

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
                                />
                                </div>
                            </FormField>
                         </div>
                    </SettingsCard>

                    <SettingsCard title="Identity & Governance">
                        <FormField label="Official Brand Name">
                            <input type="text" name="businessName" value={settings.businessName} onChange={handleInputChange} className="form-input" />
                        </FormField>
                        <FormField label="Footer Copyright Text">
                            <input type="text" name="footerText" value={settings.footerText} onChange={handleInputChange} className="form-input" />
                        </FormField>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Privacy Policy URL">
                                <input type="text" name="privacyLink" value={settings.privacyLink || '#'} onChange={handleInputChange} className="form-input" />
                            </FormField>
                            <FormField label="Logistics Terms URL">
                                <input type="text" name="logisticsTermsLink" value={settings.logisticsTermsLink || '#'} onChange={handleInputChange} className="form-input" />
                            </FormField>
                        </div>
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

                    <SettingsCard title="Operational Node Terminal">
                        <FormField label="Logistics Status Tagline">
                            <input type="text" name="logisticsStatusText" value={settings.logisticsStatusText || 'Logistics Intelligence'} onChange={handleInputChange} className="form-input" />
                        </FormField>
                        <FormField label="Node Sensitivity (0.0 - 1.0)">
                             <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    name="nodeSensitivity" 
                                    value={settings.nodeSensitivity || 0.8} 
                                    onChange={handleInputChange} 
                                    className="flex-grow h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                                />
                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-mono font-bold text-xs">
                                    {settings.nodeSensitivity || 0.8}
                                </span>
                             </div>
                             <p className="text-[9px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Higher values increase GPS tracking precision vs battery life.</p>
                        </FormField>
                    </SettingsCard>

                    <SettingsCard title="Interface & Landing">
                        <FormField label="Landing Page Hero Headline">
                            <input type="text" name="heroTitle" value={settings.heroTitle} onChange={handleInputChange} className="form-input" />
                        </FormField>
                        <FormField label="Landing Page Subtext">
                            <textarea name="heroSubtext" value={settings.heroSubtext} onChange={handleInputChange} className="form-input" rows={3}></textarea>
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
