
import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Delivery, VendorPerformance, SystemSettings } from './types';
import { MOCK_VENDORS_PERFORMANCE } from './constants';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerView from './components/CustomerView';
import ChatWidget from './components/ChatWidget';
import { db, auth, syncCollection, onAuthStateChanged, signOut, updateData, setProfileData } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isAdmin: boolean;
}

export interface RecoveryRequest {
  id: string;
  name: string;
  phone: string;
  timestamp: Date;
}

const DEFAULT_SETTINGS: SystemSettings = {
  businessName: 'CLESTIN LOGISTICS',
  businessAddress: '123 Logistics Way, Asaba, Delta State',
  heroTitle: 'Rapid Logistics in Asaba',
  heroSubtext: 'Premium coverage across the Delta region. Monitor your assets in real-time.',
  logoUrl: '',
  primaryColor: 'indigo',
  paymentAccountName: 'Celstine Logistics',
  paymentAccountNumber: '9022786275',
  paymentBank: 'Moniepoint MFB',
  footerText: '© 2024 CLESTIN LOGISTICS. Premium Delivery Intelligence.',
  theme: 'dark',
  standardCommissionRate: 0.1,
  pricePerKm: 150,
  baseStartingPrice: 3000
};

export const AppContext = React.createContext<{
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  vendorPerformance: VendorPerformance[];
  setVendorPerformance: React.Dispatch<React.SetStateAction<VendorPerformance[]>>;
  systemSettings: SystemSettings;
  setSystemSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  recoveryRequests: RecoveryRequest[];
  setRecoveryRequests: React.Dispatch<React.SetStateAction<RecoveryRequest[]>>;
  broadcastToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  isCloudConnected: boolean;
  cloudError: string | null;
  handleApproveUser: (userId: string) => Promise<void>;
  handleArchiveUser: (userId: string) => Promise<void>;
  handleRestoreUser: (userId: string) => Promise<void>;
  handleUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
}>({
  currentUser: null,
  setCurrentUser: () => {},
  logout: () => {},
  deliveries: [],
  setDeliveries: () => {},
  allUsers: [],
  setAllUsers: () => {},
  vendorPerformance: [],
  setVendorPerformance: () => {},
  systemSettings: DEFAULT_SETTINGS,
  setSystemSettings: () => {},
  chatHistory: [],
  setChatHistory: () => {},
  recoveryRequests: [],
  setRecoveryRequests: () => {},
  broadcastToCloud: async () => {},
  syncFromCloud: async () => {},
  isCloudConnected: true,
  cloudError: null,
  handleApproveUser: async () => {},
  handleArchiveUser: async () => {},
  handleRestoreUser: async () => {},
  handleUpdateUser: async () => {},
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>(MOCK_VENDORS_PERFORMANCE);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<{title: string, body: string} | null>(null);
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('clestin_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const handleApproveUser = async (userId: string) => {
    await updateData('users', userId, { active: true, isDeleted: false, riderStatus: 'Offline' });
  };

  const handleArchiveUser = async (userId: string) => {
    await updateData('users', userId, { isDeleted: true, active: false });
  };

  const handleRestoreUser = async (userId: string) => {
    await updateData('users', userId, { isDeleted: false, active: true });
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    if (updates.bankDetails || updates.profilePicture) {
      await setProfileData(userId, updates);
    } else {
      await updateData('users', userId, updates);
    }
  };

  // Hardened Auth Observer
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Track the profile for the logged in user
        const profileUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = { id: docSnap.id, ...docSnap.data() } as User;
            
            // CRITICAL: Only log in if active AND not deleted
            if (profile.active && !profile.isDeleted) {
              setCurrentUser(profile);
            } else {
              // If we are unapproved or deleted, we stay at null 
              // and let the Login component handle its own success screen logic
              setCurrentUser(null);
              // Explicitly sign out if not approved, unless they are currently registering
              // (which is handled by Login.tsx anyway)
              if (profile.active === false || profile.isDeleted) {
                signOut(auth);
              }
            }
          }
        });
        return () => profileUnsub();
      } else {
        setCurrentUser(null);
      }
    });
    return () => authUnsubscribe();
  }, []);

  // Settings Sync
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings;
        setSystemSettings(data);
        localStorage.setItem('clestin_settings', JSON.stringify(data));
      }
    });
    return () => unsub();
  }, []);

  // Data Sync
  useEffect(() => {
    const unsubscribeUsers = syncCollection('users', (data) => setAllUsers(data as User[]), (err) => { setIsCloudConnected(false); setCloudError(err.message); });
    const unsubscribeDeliveries = syncCollection('deliveries', (data) => setDeliveries(data as Delivery[]), (err) => { setIsCloudConnected(false); setCloudError(err.message); });
    return () => { unsubscribeUsers(); unsubscribeDeliveries(); };
  }, []);

  // Theme Applier
  useEffect(() => {
    const root = window.document.documentElement;
    if (systemSettings.theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#020617';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
    }
  }, [systemSettings.theme]);

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const contextValue = useMemo(() => ({
    currentUser,
    setCurrentUser,
    logout,
    deliveries,
    setDeliveries,
    allUsers,
    setAllUsers,
    vendorPerformance,
    setVendorPerformance,
    systemSettings,
    setSystemSettings,
    chatHistory,
    setChatHistory,
    recoveryRequests,
    setRecoveryRequests,
    broadcastToCloud: async () => {},
    syncFromCloud: async () => {},
    isCloudConnected,
    cloudError,
    handleApproveUser,
    handleArchiveUser,
    handleRestoreUser,
    handleUpdateUser
  }), [currentUser, deliveries, allUsers, vendorPerformance, systemSettings, chatHistory, recoveryRequests, isCloudConnected, cloudError]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900/40">
        <Header />
        
        {activeNotification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-10 duration-500">
            <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-2xl border border-indigo-400 flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg></div>
              <div className="flex-grow">
                <h4 className="font-black uppercase tracking-widest text-[11px] mb-1">{activeNotification.title}</h4>
                <p className="text-sm font-medium leading-tight">{activeNotification.body}</p>
              </div>
              <button onClick={() => setActiveNotification(null)} className="p-1 hover:bg-white/10 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
          </div>
        )}

        <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
          {!currentUser ? (
            <div className="space-y-20 max-w-5xl mx-auto">
              <CustomerView />
              <div className="pt-20 border-t border-slate-200 dark:border-slate-800">
                <Login />
              </div>
            </div>
          ) : (
            <Dashboard />
          )}
        </main>
        <Footer />
        <ChatWidget />
      </div>
    </AppContext.Provider>
  );
};

export default App;
