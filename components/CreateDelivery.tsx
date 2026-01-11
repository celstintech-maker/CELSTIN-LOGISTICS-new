
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Delivery, DeliveryStatus, PaymentStatus, Role } from '../types';
import { pushData } from '../firebase';

const CreateDelivery: React.FC = () => {
    const { currentUser, systemSettings } = useContext(AppContext);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [estimatedPrice, setEstimatedPrice] = useState<number>(1500);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');

    useEffect(() => {
        if (origin.trim() && destination.trim()) {
            const seed = (origin.trim().length + destination.trim().length) % 15;
            const estimatedKm = 5 + seed;
            const price = Math.max(1500, estimatedKm * systemSettings.pricePerKm);
            setEstimatedPrice(price);
        } else {
            setEstimatedPrice(1500);
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
                name: (formData.get('customerName') as string || 'Guest').trim(),
                phone: (formData.get('customerPhone') as string || '080').trim(),
            },
            pickupAddress: origin.trim(),
            dropoffAddress: destination.trim(),
            packageNotes: (formData.get('packageNotes') as string || 'General Delivery').trim(),
            status: DeliveryStatus.Pending,
            paymentStatus: PaymentStatus.Unpaid,
            price: Number(estimatedPrice),
            vendorId: currentUser?.role === Role.Vendor ? currentUser.id : 'staff-direct',
            creatorRole: currentUser?.role || 'System',
            creatorName: currentUser?.name || 'Terminal',
            createdAt: new Date()
        };

        try {
            await pushData('deliveries', newDelivery);
            form.reset();
            setOrigin('');
            setDestination('');
            setIsExpanded(false);
            alert(`Order broadcast successful. Total: ₦${estimatedPrice.toLocaleString()}`);
        } catch (error: any) {
            console.error("Broadcast Error Details:", error);
            alert(`Error broadcasting order: ${error.message || 'Connection failed.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isExpanded) {
        return (
             <div className="flex justify-center mb-6">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="bg-indigo-600 text-white font-bold py-3.5 px-10 rounded-2xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all duration-300 transform hover:-translate-y-1 uppercase tracking-widest text-xs"
                >
                    Create New Delivery
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 mb-8 animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-outfit uppercase tracking-tight">New Delivery Order</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Fill details below</p>
                </div>
                <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex items-center gap-3">
                    <div className="h-px flex-grow bg-slate-100 dark:bg-slate-800"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Details</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-slate-800"></div>
                </div>
                <div>
                    <label htmlFor="customerName" className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Client Name</label>
                    <input type="text" name="customerName" id="customerName" required className="form-input-v2" placeholder="Who is ordering?" />
                </div>
                 <div>
                    <label htmlFor="customerPhone" className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contact Number</label>
                    <input type="tel" name="customerPhone" id="customerPhone" required className="form-input-v2" placeholder="Phone number" />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 mt-4">
                    <div className="h-px flex-grow bg-slate-100 dark:bg-slate-800"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Address Details</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-slate-800"></div>
                </div>
                <div>
                    <label htmlFor="pickupAddress" className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pickup Address</label>
                    <input 
                        type="text" 
                        name="pickupAddress" 
                        id="pickupAddress" 
                        required 
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="form-input-v2" 
                        placeholder="Where should we pick up?" 
                    />
                </div>
                <div>
                    <label htmlFor="dropoffAddress" className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Delivery Address</label>
                    <input 
                        type="text" 
                        name="dropoffAddress" 
                        id="dropoffAddress" 
                        required 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="form-input-v2" 
                        placeholder="Where is it going?"
                    />
                </div>
                 <div className="md:col-span-2">
                    <label htmlFor="packageNotes" className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Item Description</label>
                    <textarea name="packageNotes" id="packageNotes" rows={3} className="form-input-v2" placeholder="What are we delivering? (e.g. Food, clothes, documents)"></textarea>
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-8">
                        <div className="text-center sm:text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price per KM</p>
                            <p className="text-lg font-black text-slate-600 dark:text-slate-400">₦{systemSettings.pricePerKm}</p>
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Estimated Total</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₦{estimatedPrice.toLocaleString()}</p>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full sm:w-auto bg-emerald-600 text-white font-black py-4 px-12 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'Creating...' : `Create Order - ₦${estimatedPrice.toLocaleString()}`}
                    </button>
                </div>
            </form>
            <style>{`
                .form-input-v2 {
                    width: 100%;
                    padding: 0.875rem 1.25rem;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 1rem;
                    color: #1e293b;
                    font-size: 0.875rem;
                    font-weight: 600;
                    outline: none;
                    transition: all 0.2s;
                }
                .dark .form-input-v2 { background: #020617; border-color: #1e293b; color: white; }
                .form-input-v2:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
            `}</style>
        </div>
    );
};

export default CreateDelivery;
