
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Delivery, DeliveryStatus, PaymentStatus, Role, VehicleMode } from '../types';
import { pushData } from '../firebase';

const CreateDelivery: React.FC = () => {
    const { currentUser, systemSettings } = useContext(AppContext);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [estimatedPrice, setEstimatedPrice] = useState<number>(1500);
    const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [transportMode, setTransportMode] = useState<VehicleMode>('Bike');

    useEffect(() => {
        if (origin.trim() && destination.trim()) {
            const seed = (origin.trim().length + destination.trim().length) % 15;
            const estimatedKm = 5 + seed;
            
            // Calculate price
            const price = Math.max(1500, estimatedKm * systemSettings.pricePerKm);
            setEstimatedPrice(price);

            // Calculate estimated delivery time (minutes)
            const modeMultiplier = transportMode === 'Bike' ? 2.5 : transportMode === 'Truck' ? 4 : 6;
            setEstimatedMinutes(Math.round(estimatedKm * modeMultiplier));
        } else {
            setEstimatedPrice(1500);
            setEstimatedMinutes(0);
        }
    }, [origin, destination, transportMode, systemSettings.pricePerKm]);

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
            estimatedMinutes,
            transportMode,
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
            alert(`Order logged. Please transfer ₦${estimatedPrice.toLocaleString()} to ${systemSettings.paymentAccountNumber} for verification.`);
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logistics Intelligence</span>
                    <div className="h-px flex-grow bg-slate-100 dark:bg-slate-800"></div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Transport Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['Bike', 'Truck', 'Public Transport'] as VehicleMode[]).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setTransportMode(mode)}
                                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                    transportMode === mode 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
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
                    <textarea name="packageNotes" id="packageNotes" rows={3} className="form-input-v2" placeholder="What are we delivering?"></textarea>
                </div>

                <div className="md:col-span-2 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-900/40">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Official Settlement Details</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bank</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{systemSettings.paymentBank}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account #</p>
                      <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">{systemSettings.paymentAccountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Name</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{systemSettings.paymentAccountName}</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-8">
                        <div className="text-center sm:text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Travel Time</p>
                            <p className="text-lg font-black text-slate-600 dark:text-slate-400">~{estimatedMinutes} MINS</p>
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
