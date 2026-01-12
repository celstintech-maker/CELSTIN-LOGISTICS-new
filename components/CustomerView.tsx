
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Delivery, DeliveryStatus, PaymentStatus } from '../types';
import Modal from './Modal';
import LocationGuard from './LocationGuard';
import { pushData, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const CustomerView: React.FC = () => {
    const { systemSettings } = useContext(AppContext);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [lastDeliveryId, setLastDeliveryId] = useState<string | null>(null);
    const [liveDelivery, setLiveDelivery] = useState<Delivery | null>(null);
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

    // Track the live status of the last placed delivery
    useEffect(() => {
        if (!lastDeliveryId) return;
        const unsub = onSnapshot(doc(db, "deliveries", lastDeliveryId), (snap) => {
            if (snap.exists()) {
                setLiveDelivery({ id: snap.id, ...snap.data() } as Delivery);
            }
        });
        return () => unsub();
    }, [lastDeliveryId]);

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
            setLastDeliveryId(firebaseId);
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
        <LocationGuard>
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
                      <div className="text-center max-w-sm mx-auto">
                          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-outfit uppercase">Order Logged!</h3>
                          
                          {liveDelivery?.rider ? (
                            <div className="mt-4 p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 animate-in zoom-in-95 duration-500">
                               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Live Rider Assigned</p>
                               <div className="flex items-center gap-4 text-left">
                                  <div className="w-14 h-14 rounded-full bg-white border-2 border-indigo-500 overflow-hidden shadow-lg">
                                    {liveDelivery.rider.profilePicture ? (
                                      <img src={liveDelivery.rider.profilePicture} className="w-full h-full object-cover" alt="Rider" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                     <p className="font-bold text-slate-900 dark:text-white leading-tight">{liveDelivery.rider.name}</p>
                                     <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Verified Professional</p>
                                     <a href={`tel:${liveDelivery.rider.phone}`} className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-black text-xs mt-1 hover:underline">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                        Call {liveDelivery.rider.phone}
                                     </a>
                                  </div>
                               </div>
                            </div>
                          ) : (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 justify-center">
                              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Searching for nearby riders...</p>
                            </div>
                          )}

                          <p className="text-slate-500 dark:text-slate-400 my-6 text-sm leading-relaxed px-4">Transfer ₦{pricePreview.toLocaleString()} to activate your delivery command.</p>
                          
                          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4 shadow-inner">
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vault Title</p>
                                  <p className="text-slate-900 dark:text-slate-100 font-bold">{systemSettings.paymentAccountName}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vault Index (Account #)</p>
                                  <p className="text-indigo-600 dark:text-indigo-400 font-mono text-xl font-black">{systemSettings.paymentAccountNumber}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Settlement Bank</p>
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
                      font-weight: 600;
                  }
                  .dark .customer-input { background: rgba(15, 23, 42, 0.5); border: 1px solid #1e293b; color: white; }
                  .customer-input:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
              `}</style>
          </div>
        </LocationGuard>
    );
};

export default CustomerView;
