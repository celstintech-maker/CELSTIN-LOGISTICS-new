
import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Delivery, VendorPerformance, SystemSettings } from './types';
import { MOCK_USERS, MOCK_DELIVERIES, MOCK_VENDORS_PERFORMANCE } from './constants';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerView from './components/CustomerView';
import ChatWidget from './components/ChatWidget';
import { db, auth, syncCollection, onAuthStateChanged, getUserProfile, signOut } from './firebase';
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
  logoUrl: '',
  primaryColor: 'indigo',
  paymentAccountName: 'Celstine Logistics',
  paymentAccountNumber: '9022786275',
  paymentBank: 'Moniepoint MFB',
  footerText: '© 2024 CLESTIN LOGISTICS. Premium Delivery Intelligence.',
  theme: 'dark',
  standardCommissionRate: 0.1,
  pricePerKm: 150 // New default
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
  cloudError: null
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>(MOCK_VENDORS_PERFORMANCE);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('clestin_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // FIREBASE AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          // Double check approval status on login
          if (profile.active !== false) {
             setCurrentUser(profile as User);
          } else {
             await signOut(auth);
             setCurrentUser(null);
          }
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // REAL-TIME SETTINGS SYNC
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) {
        setSystemSettings(doc.data() as SystemSettings);
      }
    });
    return () => unsub();
  }, []);

  // REAL-TIME FIREBASE SYNC
  useEffect(() => {
    const handleSyncError = (err: any) => {
        setIsCloudConnected(false);
        setCloudError(err.message || "Cloud sync unavailable.");
    };

    const unsubscribeUsers = syncCollection('users', 
      (data) => {
        setAllUsers(data as User[]);
        setIsCloudConnected(true);
        setCloudError(null);
      },
      handleSyncError
    );

    const unsubscribeDeliveries = syncCollection('deliveries', 
      (data) => {
        setDeliveries(data as Delivery[]);
        setIsCloudConnected(true);
        setCloudError(null);
      },
      handleSyncError
    );

    return () => {
      unsubscribeUsers();
      unsubscribeDeliveries();
    };
  }, []);

  const broadcastToCloud = async () => {};
  const syncFromCloud = async () => {};

  useEffect(() => {
    localStorage.setItem('clestin_settings', JSON.stringify(systemSettings));
    if (systemSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [systemSettings]);

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
    broadcastToCloud,
    syncFromCloud,
    isCloudConnected,
    cloudError
  }), [currentUser, deliveries, allUsers, vendorPerformance, systemSettings, chatHistory, recoveryRequests, isCloudConnected, cloudError]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex flex-col min-h-screen transition-colors duration-700 ease-in-out bg-slate-50 dark:bg-[#020617]">
        <Header />
        {!isCloudConnected && cloudError && (
            <div className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center sticky top-20 z-50 shadow-2xl px-4 flex items-center justify-center gap-2 border-b border-rose-500">
                <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                {cloudError}
            </div>
        )}
        <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
          {!currentUser ? (
            <div className="flex flex-col gap-16">
              <CustomerView />
              <div className="flex justify-center items-center py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-100/20 dark:bg-slate-900/20 -mx-4 md:-mx-8">
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
