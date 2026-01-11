
import React, { useState, useContext } from 'react';
import { Delivery, DeliveryStatus, PaymentStatus, Role } from '../types';
import { AppContext } from '../App';
import Modal from './Modal';
import { CustomerInfo } from '../types';
import { UserCircleIcon } from './icons';
import { updateData, pushData } from '../firebase';

interface DeliveriesTableProps {
  title: string;
  deliveries: Delivery[];
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

const DeliveriesTable: React.FC<DeliveriesTableProps> = ({ title, deliveries }) => {
    const { currentUser, allUsers, systemSettings } = useContext(AppContext);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const handleStatusChange = async (id: string, newStatus: DeliveryStatus) => {
        try {
            await updateData('deliveries', id, { status: newStatus });
        } catch (error) {
            console.error("Update failed", error);
            alert("Status update failed. Check connection.");
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
                            <th className="px-6 py-4">Value & Settlement</th>
                            {currentUser?.role === Role.Vendor && <th className="px-6 py-4">Commission</th>}
                            <th className="px-6 py-4">Progress</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {deliveries.length === 0 ? (
                            <tr>
                                <td colSpan={currentUser?.role === Role.Vendor ? 7 : 6} className="px-6 py-12 text-center text-slate-400 italic">No logistics records found in this category.</td>
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
                                            <div className="flex flex-col">
                                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                                {d.rider?.name || 'Waiting for Rider'}
                                              </span>
                                              {d.rider?.phone && (
                                                <a 
                                                    href={`tel:${d.rider.phone}`}
                                                    className="inline-flex items-center gap-1.5 text-[9px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5 hover:underline uppercase tracking-widest"
                                                >
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                                    Call {d.rider.phone}
                                                </a>
                                              )}
                                            </div>
                                        </div>
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
                                {currentUser?.role === Role.Vendor && (
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">₦{calculateCommission(d.price).toLocaleString()}</span>
                                            <span className="text-[8px] uppercase font-black text-slate-400 tracking-tighter">Yield Balance</span>
                                        </div>
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
                                            <button 
                                                onClick={() => handleCancelOrder(d.id)}
                                                className="px-3 py-1.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                            >
                                                Cancel
                                            </button>
                                        )}

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

                                        {[Role.SuperAdmin, Role.Admin, Role.Vendor].includes(currentUser?.role as Role) && !d.rider && d.status !== DeliveryStatus.Failed && (
                                            <select 
                                                onChange={(e) => handleAssignRider(d.id, e.target.value)}
                                                className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Assign Rider</option>
                                                {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        )}
                                        
                                        {currentUser?.role === Role.Rider && d.rider?.id === currentUser.id && (
                                            <select 
                                                value={d.status} 
                                                onChange={(e) => handleStatusChange(d.id, e.target.value as DeliveryStatus)}
                                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value={DeliveryStatus.Pending}>Pending</option>
                                                <option value={DeliveryStatus.Assigned}>Assigned</option>
                                                <option value={DeliveryStatus.PickedUp}>Picked Up</option>
                                                <option value={DeliveryStatus.InProgress}>In Progress</option>
                                                <option value={DeliveryStatus.InTransit}>In Transit</option>
                                                <option value={DeliveryStatus.Completed}>Completed</option>
                                                <option value={DeliveryStatus.Delivered}>Delivered</option>
                                                <option value={DeliveryStatus.Failed}>Failed</option>
                                            </select>
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
