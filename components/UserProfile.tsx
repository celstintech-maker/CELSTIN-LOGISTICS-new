
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { setProfileData, updateData } from '../firebase';
import { NIGERIAN_BANKS } from '../constants';
import { Role } from '../types';

const UserProfile: React.FC = () => {
  const { currentUser, setCurrentUser, systemSettings } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    profilePicture: '',
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        bankName: currentUser.bankDetails?.bankName || '',
        accountNumber: currentUser.bankDetails?.accountNumber || '',
        accountName: currentUser.bankDetails?.accountName || '',
        profilePicture: currentUser.profilePicture || '',
      });
    }
  }, [currentUser]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const updatedProfile = {
        name: formData.name,
        phone: formData.phone,
        profilePicture: formData.profilePicture,
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        }
      };
      
      // Save directly to Firestore 'users' collection
      await setProfileData(currentUser.id, updatedProfile);
      
      // Local state update
      setCurrentUser(prev => prev ? { ...prev, ...updatedProfile } : null);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Error saving profile updates.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1MB limit for performance
      if (file.size > 1.2 * 1024 * 1024) { 
        alert("File too large. Please select an image under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePicture: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-outfit uppercase tracking-tight">Personal Terminal Profile</h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mt-1">Manage your identity and settlement channels</p>
          </div>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isSaving ? 'Syncing...' : isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Identity & Photo Section */}
          <div className="space-y-6 md:col-span-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security Visual</h3>
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-40 h-40 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl flex items-center justify-center">
                  {formData.profilePicture ? (
                    <img src={formData.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                  >
                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span className="text-[10px] font-black uppercase">Change Photo</span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} disabled={!isEditing} />
              </div>
              {currentUser?.role === Role.Rider && (
                <div className="mt-4 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                   <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Mandatory Fleet ID Photo</p>
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="md:col-span-2 space-y-8">
            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Authenticated Name</label>
                    <input 
                    type="text" 
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="profile-input"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Comms Link (Phone)</label>
                    <input 
                    type="tel" 
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="profile-input"
                    />
                </div>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Settlement Vault (Payout)</h3>
                <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Settlement Bank</label>
                    <select 
                    disabled={!isEditing}
                    value={formData.bankName}
                    onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                    className="profile-input appearance-none"
                    >
                    <option value="">Select Bank</option>
                    {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Vault Index (Account #)</label>
                    <input 
                        type="text" 
                        disabled={!isEditing}
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                        className="profile-input font-mono"
                    />
                    </div>
                    <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Vault Title (Account Name)</label>
                    <input 
                        type="text" 
                        disabled={!isEditing}
                        value={formData.accountName}
                        onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                        className="profile-input"
                    />
                    </div>
                </div>
                </div>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">Official Payment Reference</h3>
           <p className="text-xs text-slate-500 mb-4">Transfer all payments to the company vault below for manual verification.</p>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Bank</p>
                <p className="font-bold text-slate-900 dark:text-white">{systemSettings.paymentBank}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Vault Index</p>
                <p className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-lg">{systemSettings.paymentAccountNumber}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Vault Title</p>
                <p className="font-bold text-slate-900 dark:text-white uppercase">{systemSettings.paymentAccountName}</p>
              </div>
           </div>
        </div>
      </div>
      <style>{`
        .profile-input {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          color: #1e293b;
          font-size: 0.875rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
        .dark .profile-input { background: #020617; border-color: #1e293b; color: white; }
        .profile-input:focus:not(:disabled) { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .profile-input:disabled { opacity: 0.6; cursor: not-allowed; border-style: dashed; }
      `}</style>
    </div>
  );
};

export default UserProfile;
