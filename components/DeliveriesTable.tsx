
import React, { useState, useContext } from 'react';
import { Delivery, DeliveryStatus, PaymentStatus, Role } from '../types';
import { AppContext } from '../App';
import Modal from './Modal';
import { CustomerInfo } from '../types';
import { UserCircleIcon, MapIcon } from './icons';
import { updateData, pushData } from '../firebase';

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
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
    const [newTime, setNewTime] = useState<string>('');

    const isSuperAdmin = currentUser?.role === Role.SuperAdmin;

    const handleStatusChange = async (id: string, newStatus: DeliveryStatus) => {
        try {
            await updateData('deliveries', id, { status: newStatus });
        } catch (error) {
            console.error("Update failed", error);
            alert("Status update failed. Check connection.");
        }
    };

    const handleOverrideTime = async (id: string) => {
        const mins = parseInt(newTime);
        if (isNaN(mins) || mins < 1) return;
        try {
            await updateData('deliveries', id, { 
                estimatedMinutes: mins,
                timeModifiedByAdmin: true 
            });
            setEditingTimeId(null);
            setNewTime('');
        } catch (error) {
            alert("Failed to override time.");
        }
    };

    const handleCancelOrder = async (id: string) => {
        if (window.confirm("Are you sure you want to cancel this pending delivery?")) {
            try {
                await updateData('deliveries', id, { status: DeliveryStatus.Failed });
            } catch (error) {
                alert("Cancellation failed.");
            }
        }
    };

    const handleAssignRider = async (deliveryId: string, riderId: string) => {
        const rider = allUsers.find(u => u.id === riderId);
        if (!rider) return;

        try {
            await updateData('deliveries', deliveryId, { 
                rider: { 
                  id: rider.id, 
                  name: rider.name, 
                  phone: rider.phone,
                  profilePicture: rider.profilePicture || ''
                },
                status: DeliveryStatus.Assigned
            });

            await pushData('notifications', {
                userId: riderId,
                title: 'New Dispatch Assigned',
                body: `You have been assigned a new delivery to ${deliveries.find(d => d.id === deliveryId)?.dropoffAddress}.`,
                type: 'assignment',
                createdAt: new Date()
            });
        } catch (error) {
            alert("Rider assignment sync failed.");
        }
    };

    const handleVerifyPayment = async (id: string) => {
        setVerifyingId(id);
        try {
            await updateData('deliveries', id, { paymentStatus: PaymentStatus.Paid });
        } catch (error) {
            alert("Verification failed.");
        } finally {
            setVerifyingId(null);
        }
    };

    const calculateCommission = (price: number) => {
        const rate = currentUser?.commissionRate ?? systemSettings.standardCommissionRate ?? 0.1;
        const amount = price * rate;
        return Math.min(amount, 2500);
    };

    const riders = allUsers.filter(u => u.role === Role.Rider && u.active !== false);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors mb-8">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-white tracking-tight font-outfit uppercase text-sm">{title}</h3>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-wider">{deliveries.length} Records</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Entities</th>
                            <th className="px-6 py-4">Route Info</th>
                            <th className="px-6 py-4">Est. Time</th>
                            <th className="px-6 py-4">Value</th>
                            {currentUser?.role === Role.Vendor && <th className="px-6 py-4">Commission</th>}
                            <th className="px-6 py-4">Progress</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deliveries.length === 0 ? (
                            <tr>
                                <td colSpan={currentUser?.role === Role.Vendor ? 8 : 7} className="px-6 py-12 text-center text-slate-400 italic">No logistics records found.</td>
                            </tr>
                        ) : deliveries.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400">#{d.id.slice(-5)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <button onClick={() => setSelectedCustomer(d.customer)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-left">
                                            {d.customer.name}
                                        </button>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
                                                {d.rider?.profilePicture ? (
                                                  <img src={d.rider.profilePicture} className="w-full h-full object-cover" alt="Rider" />
                                                ) : (
                                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <UserCircleIcon className="w-4 h-4" />
                                                  </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                                {d.rider?.name || 'Waiting for Rider'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col max-w-[180px]">
                                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{d.dropoffAddress}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate italic">from {d.pickupAddress}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {editingTimeId === d.id ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={newTime} 
                                                    onChange={(e) => setNewTime(e.target.value)} 
                                                    className="w-16 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold outline-none" 
                                                    placeholder="Mins"
                                                />
                                                <button onClick={() => handleOverrideTime(d.id)} className="text-emerald-500 font-black text-[10px] uppercase">Set</button>
                                                <button onClick={() => setEditingTimeId(null)} className="text-rose-500 font-black text-[10px] uppercase">X</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-700 dark:text-slate-300">{d.estimatedMinutes || '--'} MINS</span>
                                                {isSuperAdmin && (
                                                    <button onClick={() => {setEditingTimeId(d.id); setNewTime(String(d.estimatedMinutes || ''))}} className="text-[8px] font-black uppercase text-indigo-500 hover:underline">Edit</button>
                                                )}
                                            </div>
                                        )}
                                        {d.timeModifiedByAdmin && (
                                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1 py-0.5 rounded w-fit">Modified</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="font-bold text-slate-900 dark:text-white">₦{d.price.toLocaleString()}</span>
                                        <span className={`text-[9px] font-black uppercase ${d.paymentStatus === PaymentStatus.Paid ? 'text-emerald-500' : 'text-rose-500'} tracking-widest`}>
                                            {d.paymentStatus === PaymentStatus.Paid ? 'Settled' : 'Unpaid'}
                                        </span>
                                    </div>
                                </td>
                                {currentUser?.role === Role.Vendor && (
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">₦{calculateCommission(d.price).toLocaleString()}</span>
                                    </td>
                                )}
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyles[d.status]}`}>
                                        {d.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {d.status === DeliveryStatus.Pending && [Role.SuperAdmin, Role.Admin].includes(currentUser?.role as Role) && (
                                            <button onClick={() => handleCancelOrder(d.id)} className="px-3 py-1.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                                        )}
                                        {d.paymentStatus === PaymentStatus.Unpaid && [Role.SuperAdmin, Role.Admin].includes(currentUser?.role as Role) && (
                                            <button onClick={() => handleVerifyPayment(d.id)} disabled={verifyingId === d.id} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">{verifyingId === d.id ? '...' : 'Verify'}</button>
                                        )}
                                        {[Role.SuperAdmin, Role.Admin, Role.Vendor].includes(currentUser?.role as Role) && !d.rider && d.status !== DeliveryStatus.Failed && (
                                            <select onChange={(e) => handleAssignRider(d.id, e.target.value)} className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none" defaultValue="">
                                                <option value="" disabled>Assign</option>
                                                {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        )}
                                        {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && (
                                            <div className="flex items-center gap-2">
                                                {(d.status === DeliveryStatus.PickedUp || d.status === DeliveryStatus.InTransit) && onLocate && (
                                                  <button onClick={() => onLocate(d)} className="p-1.5 bg-indigo-600 text-white rounded-lg"><MapIcon className="w-4 h-4" /></button>
                                                )}
                                                <select value={d.status} onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs outline-none">
                                                    <option value={DeliveryStatus.Pending}>Pending</option>
                                                    <option value={DeliveryStatus.Assigned}>Assigned</option>
                                                    <option value={DeliveryStatus.PickedUp}>Picked Up</option>
                                                    <option value={DeliveryStatus.InProgress}>In Progress</option>
                                                    <option value={DeliveryStatus.InTransit}>In Transit</option>
                                                    <option value={DeliveryStatus.Completed}>Completed</option>
                                                    <option value={DeliveryStatus.Delivered}>Delivered</option>
                                                    <option value={DeliveryStatus.Failed}>Failed</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeliveriesTable;
