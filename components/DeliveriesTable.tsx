
import React, { useState, useContext } from 'react';
import { Delivery, DeliveryStatus, PaymentStatus, Role } from '../types';
import { AppContext } from '../App';
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
    const { currentUser, allUsers } = useContext(AppContext);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const handleStatusChange = async (id: string, newStatus: DeliveryStatus) => {
        try {
            await updateData('deliveries', id, { status: newStatus });
        } catch (error) {
            alert("Update failed.");
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
        } catch (error) {
            alert("Assignment failed.");
        }
    };

    const riders = allUsers.filter(u => u.role === Role.Rider && u.active !== false);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px]">{title}</h3>
                <span className="text-[10px] font-bold text-slate-400">{deliveries.length}</span>
            </div>

            {/* Mobile View: Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {deliveries.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs italic">No entries.</div>
                ) : deliveries.map(d => (
                    <div key={d.id} className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-mono text-slate-400">#{d.id.slice(-5)}</p>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{d.customer.name}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${statusStyles[d.status]}`}>
                                {d.status}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Route</p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">{d.dropoffAddress}</p>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-400">Value</p>
                                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">₦{d.price.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-400">ETA</p>
                                <p className="text-xs font-black text-slate-600 dark:text-slate-300">{d.estimatedMinutes || '--'} MINS</p>
                            </div>
                            {onLocate && (d.status === DeliveryStatus.PickedUp || d.status === DeliveryStatus.InTransit) && (
                                <button onClick={() => onLocate(d)} className="p-2 bg-indigo-600 text-white rounded-lg"><MapIcon className="w-4 h-4" /></button>
                            )}
                        </div>
                        
                        {/* Mobile Actions Overlay */}
                        <div className="flex gap-2">
                             {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && (
                                <select 
                                    value={d.status} 
                                    onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)} 
                                    className="flex-grow bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase rounded-lg px-2 py-2"
                                >
                                    <option value={DeliveryStatus.Pending}>Pending</option>
                                    <option value={DeliveryStatus.PickedUp}>Picked Up</option>
                                    <option value={DeliveryStatus.InTransit}>In Transit</option>
                                    <option value={DeliveryStatus.Delivered}>Delivered</option>
                                </select>
                             )}
                             {d.paymentStatus === PaymentStatus.Unpaid && [Role.SuperAdmin, Role.Admin].includes(currentUser?.role as Role) && (
                                <button onClick={() => handleVerifyPayment(d.id)} className="flex-grow bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg py-2">Verify Pay</button>
                             )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Entities</th>
                            <th className="px-6 py-4">Route Info</th>
                            <th className="px-6 py-4">Est. Time</th>
                            <th className="px-6 py-4">Value</th>
                            <th className="px-6 py-4">Progress</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deliveries.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No records.</td></tr>
                        ) : deliveries.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400">#{d.id.slice(-5)}</td>
                                <td className="px-6 py-4">
                                    <span className="font-bold text-slate-900 dark:text-white block">{d.customer.name}</span>
                                    <span className="text-[10px] text-slate-400 italic">{d.rider?.name || 'Unassigned'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block truncate max-w-[150px]">{d.dropoffAddress}</span>
                                </td>
                                <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300">{d.estimatedMinutes || '--'} MINS</td>
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900 dark:text-white">₦{d.price.toLocaleString()}</p>
                                    <p className={`text-[8px] font-black uppercase ${d.paymentStatus === PaymentStatus.Paid ? 'text-emerald-500' : 'text-rose-500'}`}>{d.paymentStatus}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${statusStyles[d.status]}`}>
                                        {d.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {d.paymentStatus === PaymentStatus.Unpaid && [Role.SuperAdmin, Role.Admin].includes(currentUser?.role as Role) && (
                                            <button onClick={() => handleVerifyPayment(d.id)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase">Verify</button>
                                        )}
                                        {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && (
                                            <select value={d.status} onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px]">
                                                {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        )}
                                        {[Role.SuperAdmin, Role.Admin].includes(currentUser?.role as Role) && !d.rider && (
                                            <select onChange={(e) => handleAssignRider(d.id, e.target.value)} className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none" defaultValue="">
                                                <option value="" disabled>Assign</option>
                                                {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
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
