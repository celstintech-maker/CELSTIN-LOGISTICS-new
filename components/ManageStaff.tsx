
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { User, Role } from '../types';
import { updateData, db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';

const ManageStaff: React.FC = () => {
    const { allUsers, currentUser, recoveryRequests, setRecoveryRequests } = useContext(AppContext);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: '', type: 'info' });

    const isSuperAdmin = currentUser?.role === Role.SuperAdmin;
    const isAdmin = currentUser?.role === Role.Admin || isSuperAdmin;

    const pendingUsers = allUsers.filter(u => u.active === false);
    const activeUsers = allUsers.filter(u => u.active !== false);

    const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
        setActionMessage({ text, type });
        setTimeout(() => setActionMessage({ text: '', type: 'info' }), 3000);
    };

    const handleApprove = async (userId: string) => {
        try {
            await updateData('users', userId, { active: true });
            showToast('Account approved and activated globally.', 'success');
        } catch (error) {
            showToast('Cloud sync failed during approval.', 'error');
        }
    };

    const handleReject = async (userId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this application?')) {
            try {
                await deleteDoc(doc(db, 'users', userId));
                showToast('Application rejected and deleted from registry.', 'info');
            } catch (error) {
                showToast('Error deleting application.', 'error');
            }
        }
    };

    const clearRecovery = (recId: string) => {
        setRecoveryRequests(prev => prev.filter(r => r.id !== recId));
        showToast('Recovery alert cleared.', 'info');
    };

    const handleRemoveUser = async (userId: string) => {
        if (userId === currentUser?.id) {
            showToast('Self-termination protocol restricted.', 'error');
            return;
        }
        if (window.confirm('Are you sure you want to permanently remove this user from the registry?')) {
            try {
                await deleteDoc(doc(db, 'users', userId));
                showToast('User successfully removed from system.', 'info');
            } catch (error) {
                showToast('Error removing user.', 'error');
            }
        }
    };

    const handleRoleChange = async (userId: string, newRole: Role) => {
        try {
            await updateData('users', userId, { role: newRole });
            showToast(`Role updated to ${newRole}.`, 'success');
        } catch (error) {
            showToast('Failed to update role in cloud.', 'error');
        }
    };

    const handlePinUpdate = async (userId: string, newPin: string) => {
        if (newPin.length !== 4) return;
        try {
            await updateData('users', userId, { pin: newPin });
            showToast('Secure PIN updated.', 'success');
        } catch (error) {
            showToast('Failed to update PIN in cloud.', 'error');
        }
    };

    const handleCommissionRateUpdate = async (userId: string, rate: number) => {
        try {
            const cleanRate = Math.min(Math.max(rate / 100, 0), 0.5); // Cap at 50% max for sanity
            await updateData('users', userId, { commissionRate: cleanRate });
            showToast(`Commission rate for merchant updated.`, 'success');
        } catch (error) {
            showToast('Failed to sync commission rate.', 'error');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {actionMessage.text && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-top-4 duration-300 border backdrop-blur-md ${
                    actionMessage.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400' : 
                    actionMessage.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 
                    'bg-slate-900/90 text-white border-slate-700'
                }`}>
                    {actionMessage.text}
                </div>
            )}

            {isAdmin && recoveryRequests.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-8 rounded-2xl">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-rose-900 dark:text-rose-400 flex items-center gap-2 font-outfit uppercase">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                Security Alerts: PIN Recovery
                            </h2>
                            <p className="text-rose-700 dark:text-rose-500/80 text-sm">Action required: Verify user identity before communicating PIN.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recoveryRequests.map(r => (
                            <div key={r.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-900/30 shadow-sm">
                                <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{r.phone}</p>
                                <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">{new Date(r.timestamp).toLocaleTimeString()}</p>
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => {
                                            const user = allUsers.find(u => u.name === r.name && u.phone === r.phone);
                                            if (user) alert(`Registry match found. Current PIN for ${user.name} is: ${user.pin}`);
                                            else alert("No registry match found for this name/phone combo.");
                                        }} 
                                        className="flex-1 bg-rose-600 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-rose-700 uppercase tracking-wider"
                                    >
                                        Verify Registry
                                    </button>
                                    <button onClick={() => clearRecovery(r.id)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 uppercase tracking-wider">Clear</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isSuperAdmin && pendingUsers.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-8 rounded-2xl">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2 font-outfit uppercase">
                             <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                             Pending Enrollment Verification
                        </h2>
                        <p className="text-amber-700 dark:text-amber-500/80 text-sm">Review applications for Vendor and Rider roles.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingUsers.map(u => (
                            <div key={u.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 shadow-sm flex flex-col justify-between">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 text-[10px] font-bold rounded uppercase">
                                            {u.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => handleApprove(u.id)} className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-700 transition-colors">Approve</button>
                                    <button onClick={() => handleReject(u.id)} className="flex-1 bg-white dark:bg-slate-800 text-rose-600 border border-rose-100 dark:border-rose-900/30 text-xs font-bold py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-outfit uppercase">Workforce Registry</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage roles and security credentials</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Employee Identity</th>
                                <th className="px-6 py-4">Authorization Role</th>
                                <th className="px-6 py-4">Yield (Rate %)</th>
                                <th className="px-6 py-4">Secure PIN</th>
                                <th className="px-6 py-4">Status</th>
                                {isSuperAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {activeUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{user.name}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">{user.email || 'No email record'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isSuperAdmin ? (
                                            <select 
                                                value={user.role} 
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                                                className="bg-transparent font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                                            >
                                                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        ) : (
                                            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase text-[11px] tracking-tight">{user.role}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isSuperAdmin && user.role === Role.Vendor ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    defaultValue={Math.round((user.commissionRate || 0.1) * 100)}
                                                    onBlur={(e) => handleCommissionRateUpdate(user.id, parseFloat(e.target.value))}
                                                    className="w-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-bold text-indigo-500 rounded-lg py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                                <span className="text-[10px] font-bold text-slate-400">%</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-[10px] font-bold">{user.role === Role.Vendor ? `${Math.round((user.commissionRate || 0.1) * 100)}%` : 'N/A'}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isSuperAdmin ? (
                                            <input 
                                                type="text" 
                                                defaultValue={user.pin || ''} 
                                                maxLength={4}
                                                onBlur={(e) => handlePinUpdate(user.id, e.target.value.replace(/\D/g, ''))}
                                                className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-slate-700 dark:text-slate-300 rounded-lg py-1 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        ) : (
                                            <span className="font-mono text-slate-300 dark:text-slate-600">••••</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">Verified</span>
                                    </td>
                                    {isSuperAdmin && (
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleRemoveUser(user.id)}
                                                className={`p-2 rounded-lg transition-all duration-200 ${user.id === currentUser?.id ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}
                                                title={user.id === currentUser?.id ? "Cannot delete yourself" : "Terminate Access"}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageStaff;
