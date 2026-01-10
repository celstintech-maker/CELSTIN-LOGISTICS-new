
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Role } from '../types';

interface VendorFinancialsProps {
    settleVendor: (vendorId: string) => void;
}

const VendorFinancials: React.FC<VendorFinancialsProps> = ({ settleVendor }) => {
    const { allUsers } = useContext(AppContext);
    // Directly filter allUsers from context to ensure real-time updates when settleVendor is called
    const vendors = allUsers.filter(u => u.role === Role.Vendor);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-outfit uppercase">Vendor Treasury Terminal</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Review and settle weekly commission balances</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Merchant</th>
                                <th className="px-6 py-4">Settlement Info</th>
                                <th className="px-6 py-4">Pending Accrual</th>
                                <th className="px-6 py-4">Lifetime Paid</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {vendors.map(vendor => (
                                <tr key={vendor.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{vendor.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{vendor.bankDetails?.bankName || 'No Bank Linked'}</span>
                                            <span className="text-[10px] font-mono text-slate-400">{vendor.bankDetails?.accountNumber || 'Pending Setup'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-black ${(vendor.commissionBalance || 0) > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                            ₦{(vendor.commissionBalance || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-500 font-bold">
                                        ₦{(vendor.totalWithdrawn || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => settleVendor(vendor.id)}
                                            disabled={!vendor.commissionBalance || vendor.commissionBalance <= 0}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                                                (vendor.commissionBalance || 0) > 0
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                                            }`}
                                        >
                                            Settle Now
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default VendorFinancials;
