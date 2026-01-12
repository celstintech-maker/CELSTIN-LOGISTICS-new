
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { User, Role, RiderStatus } from '../types';

const ManageStaff: React.FC = () => {
    const { allUsers, currentUser, handleApproveUser, handleArchiveUser, handleRestoreUser, handleUpdateUser } = useContext(AppContext);
    const [actionMessage, setActionMessage] = useState({ text: '', type: 'info' });
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [deleteSearch, setDeleteSearch] = useState('');

    const isSuperAdmin = currentUser?.role === Role.SuperAdmin;
    const isAdmin = currentUser?.role === Role.Admin || isSuperAdmin;

    // Filter logic: Mutually exclusive groups
    const pendingUsers = allUsers.filter(u => u.active === false && u.isDeleted !== true);
    const activeUsers = allUsers.filter(u => u.active === true && u.isDeleted !== true);
    const deletedUsers = allUsers.filter(u => u.isDeleted === true);
    
    const filteredDeleted = deletedUsers.filter(u => 
        u.email?.toLowerCase().includes(deleteSearch.toLowerCase()) || 
        u.name.toLowerCase().includes(deleteSearch.toLowerCase()) ||
        u.phone.includes(deleteSearch)
    );

    const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
        setActionMessage({ text, type });
        setTimeout(() => setActionMessage({ text: '', type: 'info' }), 4000);
    };

    const wrapAction = async (userId: string, action: () => Promise<void>, successMsg: string) => {
        setIsUpdating(userId);
        try {
            await action();
            showToast(successMsg, 'success');
        } catch (error) {
            showToast('Registry sync failed.', 'error');
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
            {/* Action Feedback Toast */}
            {actionMessage.text && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm border backdrop-blur-md animate-in slide-in-from-top-4 ${
                    actionMessage.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : 
                    actionMessage.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 
                    'bg-slate-900 text-white border-slate-700'
                }`}>
                    {actionMessage.text}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-outfit">Workforce Registry</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Personnel Access Control</p>
                </div>
                {isSuperAdmin && (
                    <button 
                        onClick={() => setShowDeleted(!showDeleted)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            showDeleted 
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        {showDeleted ? 'Back to Live Fleet' : `Archive Bin (${deletedUsers.length})`}
                    </button>
                )}
            </div>

            {!showDeleted && (
                <>
                    {/* Pending Approvals Section */}
                    {isAdmin && pendingUsers.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-8 rounded-3xl animate-in slide-in-from-top-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">Enrollment Verification</h2>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-500/70 font-bold uppercase tracking-widest">New accounts awaiting system clearance</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingUsers.map(u => (
                                    <div key={u.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-amber-300 dark:border-amber-900/40 shadow-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 -mr-8 -mt-8 rounded-full"></div>
                                        <p className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{u.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{u.role}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-[10px] text-slate-400 font-mono">{u.phone}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-3 italic truncate border-t border-slate-50 dark:border-slate-800 pt-3">{u.email}</p>
                                        <div className="flex gap-2 mt-6">
                                            <button 
                                                onClick={() => wrapAction(u.id, () => handleApproveUser(u.id), 'Account verified successfully.')} 
                                                disabled={isUpdating === u.id} 
                                                className="flex-1 bg-emerald-600 text-white text-[10px] font-black py-3 rounded-xl hover:bg-emerald-500 transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center"
                                            >
                                                {isUpdating === u.id ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Approve Access'}
                                            </button>
                                            <button 
                                                onClick={() => wrapAction(u.id, () => handleArchiveUser(u.id), 'Registration rejected.')} 
                                                disabled={isUpdating === u.id} 
                                                className="px-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-[10px] font-black py-3 rounded-xl hover:bg-rose-100 transition-all uppercase tracking-widest border border-rose-200 dark:border-rose-900/40"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Registry Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex justify-between items-center">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Personnel Node</h3>
                            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 text-[9px] font-bold px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                                {activeUsers.length} Verified Accounts
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-8 py-5">Personnel</th>
                                        <th className="px-8 py-5">Authority</th>
                                        <th className="px-8 py-5">Fleet Assets</th>
                                        <th className="px-8 py-5 text-right">Control</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {activeUsers.length === 0 ? (
                                        <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">No verified personnel found in the active registry.</td></tr>
                                    ) : activeUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
                                                        {user.profilePicture ? <img src={user.profilePicture} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase">{user.name.charAt(0)}</div>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white leading-tight">{user.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email || user.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                {isSuperAdmin && user.id !== currentUser?.id ? (
                                                    <select 
                                                        value={user.role}
                                                        onChange={(e) => wrapAction(user.id, () => handleUpdateUser(user.id, { role: e.target.value as Role }), 'Authority level modified.')}
                                                        className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                                                    >
                                                        {Object.values(Role).map(role => (
                                                            <option key={role} value={role}>{role}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                                        {user.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5">
                                                {user.role === Role.Rider ? (
                                                    <div className="flex flex-col gap-2 max-w-[200px]">
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Vehicle ID" 
                                                                defaultValue={user.vehicle}
                                                                onBlur={(e) => wrapAction(user.id, () => handleUpdateUser(user.id, { vehicle: e.target.value }), 'Asset ID synced.')}
                                                                className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-[10px] border border-slate-200 dark:border-slate-700 flex-1 outline-none focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <select 
                                                                defaultValue={user.riderStatus || 'Offline'}
                                                                onChange={(e) => wrapAction(user.id, () => handleUpdateUser(user.id, { riderStatus: e.target.value as RiderStatus }), 'Availability status shifted.')}
                                                                className={`p-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-none outline-none cursor-pointer flex-grow ${getRiderStatusColor(user.riderStatus)}`}
                                                            >
                                                                <option value="Available">Available</option>
                                                                <option value="On Delivery">On Delivery</option>
                                                                <option value="Offline">Offline</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-700 italic text-[10px] font-medium">Non-Fleet Operations</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {isSuperAdmin && user.id !== currentUser?.id && (
                                                    <button 
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to archive ${user.name}? They will lose all portal access immediately.`)) {
                                                                wrapAction(user.id, () => handleArchiveUser(user.id), 'Account moved to archive bin.');
                                                            }
                                                        }} 
                                                        disabled={isUpdating === user.id}
                                                        className="text-rose-500 p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all group"
                                                        title="Archive User"
                                                    >
                                                        <svg className="w-5 h-5 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Archive View */}
            {isSuperAdmin && showDeleted && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-8 rounded-3xl animate-in slide-in-from-top-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-rose-900 dark:text-rose-400 uppercase tracking-tight flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
                                Deactivated Accounts
                            </h2>
                            <p className="text-[10px] text-rose-600 dark:text-rose-500/70 font-bold uppercase tracking-widest mt-1">Registry of suspended or terminated access</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <input 
                                type="text" 
                                placeholder="Filter archive..." 
                                value={deleteSearch}
                                onChange={(e) => setDeleteSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white shadow-sm"
                            />
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </div>
                    </div>
                    
                    {filteredDeleted.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-rose-200 dark:border-rose-900/30 rounded-3xl">
                            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/5 text-rose-300 dark:text-rose-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </div>
                            <p className="text-sm text-rose-400 italic font-medium uppercase tracking-widest">Archive empty</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDeleted.map(u => (
                                <div key={u.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-sm relative group overflow-hidden hover:border-rose-400 transition-colors">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg className="w-16 h-16 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{u.name}</p>
                                                <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest mt-1">{u.role}</p>
                                            </div>
                                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 text-[8px] font-black uppercase rounded">Inactive</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-3 font-mono truncate bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">{u.email || u.phone}</p>
                                        <button 
                                            onClick={() => wrapAction(u.id, () => handleRestoreUser(u.id), 'Account successfully restored to active service.')} 
                                            disabled={isUpdating === u.id}
                                            className="w-full mt-6 bg-indigo-600 text-white text-[10px] font-black py-4 rounded-xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isUpdating === u.id ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Restore Account'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ManageStaff;
