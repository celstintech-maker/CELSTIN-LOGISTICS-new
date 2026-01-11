
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
    
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [pricePreview, setPricePreview] = useState<number>(1500);

    useEffect(() => {
        if (origin.trim() && destination.trim()) {
            const seed = (origin.trim().length + destination.trim().length) % 15;
            const estimatedKm = 5 + seed;
            const price = Math.max(1500, estimatedKm * systemSettings.pricePerKm);
            setPricePreview(price);
        } else {
            setPricePreview(1500);
        }
    }, [origin, destination, systemSettings.pricePerKm]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        setIsSubmitting(true);
        const formData = new FormData(form);
        
        const newDelivery: any = {
            customer: {
                id: `cust-${Date.now()}`,
                name: (formData.get('customerName') as string).trim(),
                phone: (formData.get('customerPhone') as string).trim(),
            },
            pickupAddress: origin.trim(),
            dropoffAddress: destination.trim(),
            packageNotes: (formData.get('packageNotes') as string || 'General Package').trim(),
            status: DeliveryStatus.Pending,
            paymentStatus: PaymentStatus.Unpaid,
            price: pricePreview,
            createdAt: new Date(),
            vendorId: 'guest-dispatch'
        };

        try {
            const firebaseId = await pushData('deliveries', newDelivery);
            setLastDeliveryId(firebaseId || 'pending');
            setShowPaymentModal(true);
            form.reset();
            setOrigin('');
            setDestination('');
        } catch (error) {
            console.error(error);
            alert("Connection error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/40 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md transition-colors">
             <div className="text-center mb-10">
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white font-outfit tracking-tight">{systemSettings.heroTitle}</h2>
                <div className="h-1.5 w-24 bg-indigo-500 mx-auto mt-4 rounded-full shadow-lg shadow-indigo-500/20"></div>
                <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    {systemSettings.heroSubtext}
                </p>
                <p className="mt-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    Reliable Dispatch starting at ₦{(systemSettings.baseStartingPrice || 3000).toLocaleString()}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="customerName" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Client Name</label>
                        <input type="text" name="customerName" id="customerName" required className="customer-input" placeholder="Enter your full name" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Contact Number</label>
                        <input type="tel" name="customerPhone" id="customerPhone" required className="customer-input" placeholder="Phone number (e.g. 080...)" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="pickupAddress" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Pickup Address</label>
                        <input 
                            type="text" 
                            name="pickupAddress" 
                            id="pickupAddress" 
                            required 
                            value={origin}
                            onChange={(e) => setOrigin(e.target.value)}
                            className="customer-input" 
                            placeholder="Where should we pick up?" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="dropoffAddress" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Delivery Address</label>
                        <input 
                            type="text" 
                            name="dropoffAddress" 
                            id="dropoffAddress" 
                            required 
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="customer-input" 
                            placeholder="Where is it going?" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="packageNotes" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Item Description</label>
                    <textarea name="packageNotes" id="packageNotes" rows={2} className="customer-input" placeholder="What are you sending?"></textarea>
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
                        {isSubmitting ? 'Processing...' : `Confirm Delivery - ₦${pricePreview.toLocaleString()}`}
                    </button>
                </div>
            </form>

            {showPaymentModal && (
                <Modal onClose={() => setShowPaymentModal(false)}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-outfit uppercase">Order Received!</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">Please pay ₦{pricePreview.toLocaleString()} to start your delivery.</p>
                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Account Name</p>
                                <p className="text-slate-900 dark:text-slate-100 font-bold">{systemSettings.paymentAccountName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Account Number</p>
                                <p className="text-indigo-600 dark:text-indigo-400 font-mono text-xl font-black">{systemSettings.paymentAccountNumber}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Bank Name</p>
                                <p className="text-slate-900 dark:text-slate-100 font-bold">{systemSettings.paymentBank}</p>
                            </div>
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
                .dark .customer-input { background: rgba(15, 23, 42, 0.5); border: 1px solid #1e293b; color: white; }
                .customer-input:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
            `}</style>
        </div>
    );
};

export default CustomerView;
