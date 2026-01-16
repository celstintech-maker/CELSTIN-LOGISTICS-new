
import React, { useState, useContext } from 'react';
import { Delivery, DeliveryStatus, PaymentStatus, Role } from '../types';
import { AppContext } from '../App';
import { UserCircleIcon, MapIcon } from './icons';
import { updateData, db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { audioService } from '../services/audioService';

interface DeliveriesTableProps {
  title: string;
  deliveries: Delivery[];
  onLocate?: (delivery: Delivery) => void;
}

const statusStyles: { [key in DeliveryStatus]: string } = {
  [DeliveryStatus.Pending]: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  [DeliveryStatus.Assigned]: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  [DeliveryStatus.PickedUp]: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  [DeliveryStatus.InProgress]: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
  [DeliveryStatus.InTransit]: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  [DeliveryStatus.Completed]: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  [DeliveryStatus.Delivered]: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  [DeliveryStatus.Failed]: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
};

const DeliveriesTable: React.FC<DeliveriesTableProps> = ({ title, deliveries, onLocate }) => {
    const { currentUser, allUsers, systemSettings } = useContext(AppContext);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [copyingId, setCopyingId] = useState<string | null>(null);
    const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

    const isAdmin = currentUser?.role === Role.SuperAdmin || currentUser?.role === Role.Admin;
    const isSuperAdmin = currentUser?.role === Role.SuperAdmin;

    const handleStatusChange = async (id: string, newStatus: DeliveryStatus) => {
        try {
            const updates: any = { status: newStatus };
            await updateData('deliveries', id, updates);
            if (systemSettings?.systemSounds?.statusChange) {
              audioService.play(systemSettings.systemSounds.statusChange);
            }
        } catch (error) {
            alert("Status update failed.");
        }
    };

    const handleRiderVerifyPayment = async (id: string) => {
        try {
            await updateData('deliveries', id, { riderPaymentVerified: true });
            if (systemSettings?.systemSounds?.statusChange) {
              audioService.play(systemSettings.systemSounds.statusChange);
            }
            alert("Verification request sent to Super Admin. Please wait for final confirmation.");
            setExpandedPaymentId(null);
        } catch (error) {
            alert("Action failed.");
        }
    };

    const handleAdminConfirmPayment = async (id: string) => {
        if (!isAdmin) {
          alert("Unauthorized: Only Admins can confirm payments.");
          return;
        }
        setVerifyingId(id);
        try {
            await updateData('deliveries', id, { 
              paymentStatus: PaymentStatus.Paid,
              riderPaymentVerified: true 
            });
            if (systemSettings?.systemSounds?.paymentConfirmed) {
              audioService.play(systemSettings.systemSounds.paymentConfirmed);
            }
        } catch (error) {
            alert("Verification failed.");
        } finally {
            setVerifyingId(null);
        }
    };

    const handleCopyAccount = (id: string) => {
        navigator.clipboard.writeText(systemSettings.paymentAccountNumber);
        setCopyingId(id);
        setTimeout(() => setCopyingId(null), 2000);
    };

    const handleDeleteOrder = async (id: string) => {
        if (!isSuperAdmin) return;
        if (!window.confirm("Permanently delete this delivery record?")) return;
        setIsDeleting(id);
        try {
            await deleteDoc(doc(db, "deliveries", id));
        } catch (error) {
            alert("Delete failed.");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleAssignRider = async (deliveryId: string, riderId: string) => {
        const rider = allUsers.find(u => u.id === riderId);
        if (!rider) return;
        try {
            await updateData('deliveries', deliveryId, { 
                rider: { id: rider.id, name: rider.name, phone: rider.phone, profilePicture: rider.profilePicture || '' },
                status: DeliveryStatus.Assigned
            });
        } catch (error) {
            alert("Assignment failed.");
        }
    };

    const AccountDetailsWidget = ({ delivery }: { delivery: Delivery }) => (
        <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Official Settlement Vault</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Bank</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{systemSettings.paymentBank}</p>
                </div>
                <div className="flex items-center justify-between group">
                    <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Account #</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">{systemSettings.paymentAccountNumber}</p>
                    </div>
                    <button 
                        onClick={() => handleCopyAccount(delivery.id)}
                        className={`p-2 rounded-lg transition-all ${copyingId === delivery.id ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-500'}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                        </svg>
                    </button>
                </div>
                <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{systemSettings.paymentAccountName}</p>
                </div>
            </div>
            {currentUser?.role === Role.Rider && !delivery.riderPaymentVerified && (
              <button 
                onClick={() => handleRiderVerifyPayment(delivery.id)}
                className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                I have transferred the funds
              </button>
            )}
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px]">{title}</h3>
                <span className="text-[10px] font-bold text-slate-400">{deliveries.length}</span>
            </div>

            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {deliveries.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs italic">No entries.</div>
                ) : deliveries.map(d => {
                    const commission = d.price * (systemSettings.standardCommissionRate || 0.1);
                    return (
                        <div key={d.id} className="p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-mono text-slate-400">#{d.id.slice(-5)}</p>
                                    {isSuperAdmin && (
                                      <button onClick={() => handleDeleteOrder(d.id)} className="p-1 text-rose-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    )}
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${statusStyles[d.status]}`}>
                                    {d.status}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Client: {d.customer.name}</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">{d.dropoffAddress}</p>
                            </div>
                            
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex-grow">
                                    <p className="text-[8px] font-black uppercase text-slate-400">Value</p>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">₦{d.price.toLocaleString()}</p>
                                    {isAdmin && (
                                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Comm: ₦{commission.toLocaleString()}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase text-slate-400">Payment</p>
                                    <p className={`text-[10px] font-black uppercase ${d.paymentStatus === PaymentStatus.Paid ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
                                      {d.paymentStatus}
                                    </p>
                                </div>
                            </div>

                            {(expandedPaymentId === d.id || (isAdmin && d.riderPaymentVerified && d.paymentStatus === PaymentStatus.Unpaid)) && d.status === DeliveryStatus.Delivered && (
                                <AccountDetailsWidget delivery={d} />
                            )}
                            
                            <div className="flex flex-col gap-2">
                                 {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && d.status !== DeliveryStatus.Delivered && (
                                    <select 
                                        value={d.status} 
                                        onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)} 
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase rounded-lg px-2 py-2 shadow-sm outline-none"
                                    >
                                        {Object.values(DeliveryStatus).filter(s => s !== DeliveryStatus.Delivered).map(s => <option key={s} value={s}>{s}</option>)}
                                        <option value={DeliveryStatus.Delivered}>Mark as Delivered</option>
                                    </select>
                                 )}

                                 {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && d.status === DeliveryStatus.Delivered && d.paymentStatus === PaymentStatus.Unpaid && !expandedPaymentId && (
                                   <button 
                                     onClick={() => setExpandedPaymentId(d.id)}
                                     className="w-full bg-emerald-600 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                   >
                                     Initiate Cash Settlement
                                   </button>
                                 )}

                                 {isAdmin && d.paymentStatus === PaymentStatus.Unpaid && d.status === DeliveryStatus.Delivered && (
                                    <button 
                                      onClick={() => handleAdminConfirmPayment(d.id)}
                                      disabled={verifyingId === d.id}
                                      className={`w-full text-[10px] font-black uppercase rounded-lg py-2 transition-all ${
                                        d.riderPaymentVerified 
                                        ? 'bg-emerald-600 text-white shadow-emerald-500/30' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {verifyingId === d.id ? 'Confirming...' : (d.riderPaymentVerified ? 'Confirm Received Funds' : 'Awaiting Rider Transfer')}
                                    </button>
                                 )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Entities</th>
                            <th className="px-6 py-4">Route Info</th>
                            <th className="px-6 py-4">Value</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deliveries.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No records.</td></tr>
                        ) : deliveries.map((d) => {
                            const commission = d.price * (systemSettings.standardCommissionRate || 0.1);
                            return (
                                <React.Fragment key={d.id}>
                                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                          <div className="flex flex-col gap-1">
                                            <span className="font-mono text-[10px] text-slate-400">#{d.id.slice(-5)}</span>
                                            {isSuperAdmin && (
                                              <button onClick={() => handleDeleteOrder(d.id)} className="w-fit p-1 text-rose-500 hover:bg-rose-50 rounded">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-900 dark:text-white block">{d.customer.name}</span>
                                            <span className="text-[10px] text-slate-400 italic">{d.rider?.name || 'Unassigned'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block truncate max-w-[150px]">{d.dropoffAddress}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-slate-900 dark:text-white">₦{d.price.toLocaleString()}</p>
                                                {isAdmin && (
                                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter mt-0.5">Comm: ₦{commission.toLocaleString()}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <p className={`text-[8px] font-black uppercase ${d.paymentStatus === PaymentStatus.Paid ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
                                                {d.paymentStatus}
                                              </p>
                                              {d.riderPaymentVerified && d.paymentStatus === PaymentStatus.Unpaid && (
                                                <span className="text-[7px] bg-amber-500 text-white px-1 rounded uppercase">Pending Admin</span>
                                              )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${statusStyles[d.status]}`}>
                                                {d.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && d.status !== DeliveryStatus.Delivered && (
                                                    <select value={d.status} onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold outline-none">
                                                        {Object.values(DeliveryStatus).filter(s => s !== DeliveryStatus.Delivered).map(s => <option key={s} value={s}>{s}</option>)}
                                                        <option value={DeliveryStatus.Delivered}>Mark as Delivered</option>
                                                    </select>
                                                )}
                                                
                                                {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && d.status === DeliveryStatus.Delivered && d.paymentStatus === PaymentStatus.Unpaid && (
                                                  <button 
                                                    onClick={() => setExpandedPaymentId(expandedPaymentId === d.id ? null : d.id)}
                                                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${
                                                      expandedPaymentId === d.id ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                    }`}
                                                  >
                                                    {expandedPaymentId === d.id ? 'Close Panel' : 'Initiate Settlement'}
                                                  </button>
                                                )}

                                                {isAdmin && d.paymentStatus === PaymentStatus.Unpaid && d.status === DeliveryStatus.Delivered && (
                                                    <button 
                                                      onClick={() => handleAdminConfirmPayment(d.id)}
                                                      disabled={verifyingId === d.id}
                                                      className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${
                                                        d.riderPaymentVerified 
                                                        ? 'bg-emerald-600 text-white shadow-emerald-500/20 scale-105 ring-2 ring-emerald-500/20' 
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                      }`}
                                                    >
                                                      {verifyingId === d.id ? 'Confirming...' : (d.riderPaymentVerified ? 'Final Confirm' : 'Wait for Rider')}
                                                    </button>
                                                )}

                                                {isAdmin && !d.rider && (
                                                    <select onChange={(e) => handleAssignRider(d.id, e.target.value)} className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none" defaultValue="">
                                                        <option value="" disabled>Assign</option>
                                                        {allUsers.filter(u => u.role === Role.Rider && u.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {(expandedPaymentId === d.id || (isAdmin && d.riderPaymentVerified && d.paymentStatus === PaymentStatus.Unpaid)) && d.status === DeliveryStatus.Delivered && (
                                        <tr>
                                            <td colSpan={6} className="px-6 pb-4 pt-0">
                                                <div className="max-w-md ml-auto">
                                                    <AccountDetailsWidget delivery={d} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeliveriesTable;
