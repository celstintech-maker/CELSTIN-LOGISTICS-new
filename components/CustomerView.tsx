
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Delivery, DeliveryStatus, PaymentStatus } from '../types';
import Modal from './Modal';
import { pushData } from '../firebase';

const CustomerView: React.FC = () => {
    const { systemSettings } = useContext(AppContext);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [lastDeliveryId, setLastDeliveryId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        const newDelivery: Partial<Delivery> = {
            customer: {
                id: `cust-${Date.now()}`,
                name: formData.get('customerName') as string,
                phone: formData.get('customerPhone') as string,
            },
            pickupAddress: formData.get('pickupAddress') as string,
            dropoffAddress: formData.get('dropoffAddress') as string,
            packageNotes: formData.get('packageNotes') as string,
            status: DeliveryStatus.Pending,
            paymentStatus: PaymentStatus.Unpaid,
            price: 1500 + Math.floor(Math.random() * 10) * 150,
        };

        try {
            const firebaseId = await pushData('deliveries', newDelivery);
            setLastDeliveryId(firebaseId || 'pending');
            setShowPaymentModal(true);
            e.currentTarget.reset();
        } catch (error) {
            alert("Connection error. Terminal sync failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/40 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md transition-colors">
             <div className="text-center mb-10">
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white font-outfit tracking-tight">Rapid Logistics in Asaba</h2>
                <div className="h-1.5 w-24 bg-indigo-500 mx-auto mt-4 rounded-full shadow-lg shadow-indigo-500/20"></div>
                <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Premium coverage starting at <span className="text-indigo-600 dark:text-indigo-400 font-black">₦1,500</span> base. 
                    Monitor your assets in real-time across the Delta region.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="customerName" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Client Identity</label>
                        <input type="text" name="customerName" id="customerName" required className="customer-input" placeholder="Full Legal Name" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Contact Protocol</label>
                        <input type="tel" name="customerPhone" id="customerPhone" required className="customer-input" placeholder="080 0000 0000" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="pickupAddress" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Origin Terminal</label>
                        <input type="text" name="pickupAddress" id="pickupAddress" required className="customer-input" placeholder="Pickup location in Asaba" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="dropoffAddress" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Destination Node</label>
                        <input type="text" name="dropoffAddress" id="dropoffAddress" required className="customer-input" placeholder="Final dropoff location" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="packageNotes" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Payload Manifest</label>
                    <textarea name="packageNotes" id="packageNotes" rows={2} className="customer-input" placeholder="Describe payload or special handling requirements..."></textarea>
                </div>

                <div className="text-center pt-4">
                     <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-2xl shadow-xl shadow-indigo-900/40 hover:bg-indigo-500 hover:scale-[1.01] transition-all duration-300 uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-70' : ''}`}
                    >
                        {isSubmitting && (
                             <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        )}
                        {isSubmitting ? 'Transmitting...' : 'Initialize Dispatch Protocol'}
                    </button>
                </div>
            </form>

            {showPaymentModal && (
                <Modal onClose={() => setShowPaymentModal(false)}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-outfit uppercase">Manifest Encrypted</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">System initialized. Transmit settlement to the corporate vault for instant activation.</p>
                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Vault Holder</p>
                                <p className="text-slate-900 dark:text-slate-100 font-bold tracking-tight">{systemSettings.paymentAccountName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Vault Index (Account Number)</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-indigo-600 dark:text-indigo-400 font-mono text-xl font-black">{systemSettings.paymentAccountNumber}</p>
                                    <button onClick={() => navigator.clipboard.writeText(systemSettings.paymentAccountNumber)} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Gateway Node</p>
                                <p className="text-slate-900 dark:text-slate-100 font-bold">{systemSettings.paymentBank}</p>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col items-center gap-2">
                             <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Awaiting Verification Signal...</span>
                             </div>
                             <p className="text-[11px] text-slate-400 italic">Order #{lastDeliveryId?.slice(-5)} status will update in real-time upon detection.</p>
                        </div>
                    </div>
                </Modal>
            )}
            
            <style>{`
                .customer-input {
                    width: 100%;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 1rem;
                    padding: 0.875rem 1.25rem;
                    color: #1e293b;
                    outline: none;
                    transition: all 0.2s;
                    font-weight: 500;
                }
                .dark .customer-input {
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid #1e293b;
                    color: white;
                }
                .customer-input:focus {
                    border-color: #6366f1;
                    background: white;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }
                .dark .customer-input:focus {
                    background: rgba(30, 41, 59, 0.8);
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
                }
                .customer-input::placeholder {
                    color: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default CustomerView;
