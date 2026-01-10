
import React, { useState, useContext } from 'react';
import { Delivery, DeliveryStatus, PaymentStatus, Role } from '../types';
import { AppContext } from '../App';
import Modal from './Modal';
import { CustomerInfo } from '../types';
import { UserCircleIcon } from './icons';

interface DeliveriesTableProps {
  title: string;
  deliveries: Delivery[];
}

const statusStyles: { [key in DeliveryStatus]: string } = {
  [DeliveryStatus.Pending]: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  [DeliveryStatus.Assigned]: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  [DeliveryStatus.PickedUp]: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  [DeliveryStatus.InTransit]: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  [DeliveryStatus.Delivered]: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  [DeliveryStatus.Failed]: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
};

const DeliveriesTable: React.FC<DeliveriesTableProps> = ({ title, deliveries }) => {
    const { currentUser, setDeliveries, allUsers } = useContext(AppContext);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const handleStatusChange = (id: string, newStatus: DeliveryStatus) => {
        setDeliveries(prev => prev.map(d => {
            if (d.id === id) {
                // When marking as delivered, ensure a vendor is associated if missing
                // This ensures the commission logic has someone to credit
                const updated = { ...d, status: newStatus };
                if (newStatus === DeliveryStatus.Delivered && !updated.vendorId) {
                    const firstVendor = allUsers.find(u => u.role === Role.Vendor);
                    updated.vendorId = firstVendor?.id;
                }
                return updated;
            }
            return d;
        }));
    };

    const handleVerifyPayment = (id: string) => {
        setVerifyingId(id);
        // Simulate network/bank verification delay
        setTimeout(() => {
            setDeliveries(prev => prev.map(d => 
                d.id === id ? { ...d, paymentStatus: PaymentStatus.Paid } : d
            ));
            setVerifyingId(null);
        }, 1500);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors mb-8">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight font-outfit uppercase text-sm">{title}</h3>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-wider">{deliveries.length} Records</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Entities</th>
                            <th className="px-6 py-4">Route Info</th>
                            <th className="px-6 py-4">Value & Settlement</th>
                            <th className="px-6 py-4">Progress</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deliveries.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No logistics records found in this category.</td>
                            </tr>
                        ) : deliveries.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-400">#{d.id.slice(-5)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <button onClick={() => setSelectedCustomer(d.customer)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-left">
                                            {d.customer.name}
                                        </button>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-tighter">Rider: {d.rider?.name || 'Unassigned'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col max-w-[180px]">
                                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{d.dropoffAddress}</span>
                                        <div className="flex items-center gap-1 mt-1">
                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate italic">from {d.pickupAddress}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="font-bold text-slate-900 dark:text-white">₦{d.price.toLocaleString()}</span>
                                        {d.paymentStatus === PaymentStatus.Paid ? (
                                            <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit tracking-widest">Settled</span>
                                        ) : (
                                            <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded w-fit tracking-widest animate-pulse">Pending</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusStyles[d.status]}`}>
                                        {d.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {d.paymentStatus === PaymentStatus.Unpaid && [Role.SuperAdmin, Role.Admin].includes(currentUser?.role as Role) && (
                                            <button 
                                                onClick={() => handleVerifyPayment(d.id)}
                                                disabled={verifyingId === d.id}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                    verifyingId === d.id 
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
                                                }`}
                                            >
                                                {verifyingId === d.id ? 'Verifying...' : 'Verify Transfer'}
                                            </button>
                                        )}
                                        
                                        {currentUser?.role === Role.Rider ? (
                                            <select 
                                                value={d.status} 
                                                onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)}
                                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        ) : (
                                            <button className="text-slate-300 dark:text-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedCustomer && (
                <Modal onClose={() => setSelectedCustomer(null)}>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl"><UserCircleIcon className="w-8 h-8" /></div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-outfit uppercase">Profile Registry</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Encrypted Client Link</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 text-sm">
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Authenticated Name</p>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{selectedCustomer.name}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Signal Protocol (Phone)</p>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{selectedCustomer.phone}</p>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DeliveriesTable;
