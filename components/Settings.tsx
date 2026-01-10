
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { NIGERIAN_BANKS } from '../constants';
import { SystemSettings } from '../types';

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

    // Sync local state when global state changes (e.g., from Header toggle)
    useEffect(() => {
        setSettings(systemSettings);
    }, [systemSettings]);

    const handleSave = () => {
        setSaveStatus('saving');
        setSystemSettings(settings);
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 800);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleThemeToggle = (theme: 'light' | 'dark') => {
        const updated = { ...settings, theme };
        setSettings(updated);
        // Instant feedback
        setSystemSettings(updated);
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

    const clearLogo = () => {
        setSettings(prev => ({ ...prev, logoUrl: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-500">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-outfit uppercase">System Core</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure branding, payments, and global aesthetics.</p>
                </div>
                <button
                    onClick={handleSave}
                    className={`font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg ${
                        saveStatus === 'saved' 
                        ? 'bg-emerald-600 text-white scale-105' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/20'
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
                    <SettingsCard title="Identity & Branding">
                        <FormField label="Official Brand Name">
                            <input type="text" name="businessName" value={settings.businessName} onChange={handleInputChange} className="form-input" />
                        </FormField>
                        <FormField label="Headquarters Address">
                            <textarea name="businessAddress" value={settings.businessAddress} onChange={handleInputChange} rows={3} className="form-input" />
                        </FormField>
                        <FormField label="Corporate Logo">
                            <div className="flex flex-col gap-4">
                                {settings.logoUrl ? (
                                    <div className="relative group w-32 h-32">
                                        <img src={settings.logoUrl} className="w-full h-full rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 bg-white shadow-sm" alt="Logo preview" />
                                        <button 
                                            onClick={clearLogo}
                                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 text-center uppercase tracking-widest">Active Asset</p>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all text-slate-400 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400"
                                    >
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Master Logo</span>
                                    </button>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleLogoUpload} 
                                />
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-left hover:underline"
                                >
                                    {settings.logoUrl ? 'Update Brand Identity' : 'Search Local Registry'}
                                </button>
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
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                                    Clean Slate
                                </button>
                                <button 
                                    onClick={() => handleThemeToggle('dark')}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${settings.theme === 'dark' ? 'bg-slate-900 text-white shadow-sm border border-slate-800' : 'text-slate-500 hover:text-slate-400'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                                    Midnight Onyx
                                </button>
                            </div>
                         </FormField>
                         <FormField label="Application Accent Color">
                             <div className="flex gap-4 pt-2">
                                {['blue', 'green', 'indigo', 'red'].map(color => (
                                    <button 
                                        key={color} 
                                        onClick={() => setSettings(s => ({...s, primaryColor: color}))}
                                        className={`w-10 h-10 rounded-full border-4 transition-all shadow-md ${settings.primaryColor === color ? 'border-slate-800 dark:border-white scale-110 ring-4 ring-indigo-500/10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: color === 'blue' ? '#2563eb' : color === 'green' ? '#10b981' : color === 'indigo' ? '#4f46e5' : '#ef4444' }}
                                    />
                                ))}
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
                .form-input:focus {
                    background-color: #fff;
                    border-color: #3b82f6;
                    outline: 0;
                    box-shadow: 0 0 0 4px rgb(59 130 246 / 0.1);
                }
                .dark .form-input:focus {
                    background-color: #0f172a;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgb(99 102 241 / 0.1);
                }
             `}</style>
        </div>
    );
};

export default Settings;
