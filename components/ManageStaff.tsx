
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { User, Role, RiderStatus } from '../types';
import { updateData, db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';

const ManageStaff: React.FC = () => {
    const { allUsers, currentUser } = useContext(AppContext);
    const [actionMessage, setActionMessage] = useState({ text: '', type: 'info' });
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const isSuperAdmin = currentUser?.role === Role.SuperAdmin;
    const isAdmin = currentUser?.role === Role.Admin || isSuperAdmin;

    const pendingUsers = allUsers.filter(u => u.active === false);
    const activeUsers = allUsers.filter(u => u.active === true);

    const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
        setActionMessage({ text, type });
        setTimeout(() => setActionMessage({ text: '', type: 'info' }), 4000);
    };

    const handleApprove = async (userId: string) => {
        setIsUpdating(userId);
        try {
            await updateData('users', userId, { 
                active: true,
                riderStatus: 'Offline' 
            });
            showToast('Account verified successfully.', 'success');
        } catch (error) {
            showToast('Update failed.', 'error');
        } finally {
            setIsUpdating(null);
        }
    };

    const handleRejectPermanent = async (userId: string) => {
        if (window.confirm('PERMANENT DELETION: This will remove the user from the database entirely. They will need to re-register to access the platform again. Continue?')) {
            setIsUpdating(userId);
            try {
                await deleteDoc(doc(db, 'users', userId));
                showToast('User record permanently purged from database.', 'info');
            } catch (error) {
                showToast('Purge operation failed.', 'error');
            } finally {
                setIsUpdating(null);
            }
        }
    };

    const handleRiderUpdate = async (userId: string, updates: Partial<User>) => {
        setIsUpdating(userId);
        try {
            await updateData('users', userId, updates);
            showToast('Rider telemetry updated.', 'success');
        } catch (error) {
            showToast('Sync failed.', 'error');
        } finally {
            setIsUpdating(null);
        }
    };

    const getRiderStatusColor = (status?: RiderStatus) => {
        switch (status) {
            case 'Available': return 'bg-emerald-500 text-white';
            case 'On Delivery': return 'bg-amber-500 text-white';
            case 'Offline': return 'bg-slate-400 text-white';
            default: return 'bg-slate-200 text-slate-500';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {actionMessage.text && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-md ${
                    actionMessage.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : 
                    actionMessage.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 
                    'bg-slate-900 text-white border-slate-700'
                }`}>
                    {actionMessage.text}
                </div>
            )}

            {isSuperAdmin && pendingUsers.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-8 rounded-2xl">
                    <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                        Pending Approval Queue
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingUsers.map(u => (
                            <div key={u.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-amber-200 dark:border-amber-900/30 shadow-sm">
                                <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                                <p className="text-xs text-slate-500 uppercase font-black mt-1">{u.role}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">{u.email}</p>
                                <div className="flex gap-2 mt-5">
                                    <button onClick={() => handleApprove(u.id)} disabled={isUpdating === u.id} className="flex-1 bg-emerald-600 text-white text-[10px] font-black py-2.5 rounded-lg hover:bg-emerald-500 transition-colors">Verify</button>
                                    <button onClick={() => handleRejectPermanent(u.id)} disabled={isUpdating === u.id} className="flex-1 bg-white dark:bg-slate-800 text-rose-600 border border-rose-100 dark:border-rose-900/50 text-[10px] font-black py-2.5 rounded-lg hover:bg-rose-50 transition-colors">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-outfit">Master Workforce Registry</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Verified Fleet Personnel & Merchant Partners</p>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="text-slate-500 font-bold uppercase tracking-widest text-[10px] bg-slate-50/50 dark:bg-slate-950/50">
                        <tr>
                            <th className="px-6 py-4">Employee Identity</th>
                            <th className="px-6 py-4">Authorization</th>
                            <th className="px-6 py-4">Fleet Telemetry (Riders)</th>
                            <th className="px-6 py-4 text-right">Registry Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeUsers.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">No active verified personnel in the registry.</td></tr>
                        ) : activeUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{user.email || user.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/20">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === Role.Rider ? (
                                        <div className="flex flex-col gap-2 max-w-[220px]">
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Vehicle: e.g. Motorcycle" 
                                                    defaultValue={user.vehicle}
                                                    onBlur={(e) => handleRiderUpdate(user.id, { vehicle: e.target.value })}
                                                    className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-700 flex-1 outline-none focus:border-indigo-500 transition-colors"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="License details" 
                                                    defaultValue={user.licenseDetails}
                                                    onBlur={(e) => handleRiderUpdate(user.id, { licenseDetails: e.target.value })}
                                                    className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-700 flex-1 outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select 
                                                    defaultValue={user.riderStatus || 'Offline'}
                                                    onChange={(e) => handleRiderUpdate(user.id, { riderStatus: e.target.value as RiderStatus })}
                                                    className={`p-2 rounded-lg text-[10px] font-bold border-none outline-none cursor-pointer flex-grow ${getRiderStatusColor(user.riderStatus)}`}
                                                >
                                                    <option value="Available">Available</option>
                                                    <option value="On Delivery">On Delivery</option>
                                                    <option value="Offline">Offline</option>
                                                </select>
                                                {user.riderStatus === 'Available' && (
                                                    <span className="flex h-2 w-2 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 dark:text-slate-700 italic text-[10px]">Non-Fleet Personnel</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isSuperAdmin && user.id !== currentUser?.id && (
                                        <button 
                                            onClick={() => handleRejectPermanent(user.id)} 
                                            disabled={isUpdating === user.id}
                                            className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors group"
                                            title="Permanently Remove User"
                                        >
                                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageStaff;
