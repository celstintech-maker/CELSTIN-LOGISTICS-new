
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

// Fixed missing minimumBasePrice property in DEFAULT_SETTINGS
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
  baseStartingPrice: 3000,
  minimumBasePrice: 1500
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

  // Improved Auth Observer for Speed and Stability
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const profileUnsub = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = { id: docSnap.id, ...docSnap.data() } as User;
            if (profile.active && !profile.isDeleted) {
              setCurrentUser(profile);
            } else {
              // Only trigger sign out if the profile actually exists but is inactive
              // If it doesn't exist yet, it's likely a registration in progress
              setCurrentUser(null);
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

  // Settings & Data Sync
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings;
        setSystemSettings(data);
        localStorage.setItem('clestin_settings', JSON.stringify(data));
      }
    });
    const unsubUsers = syncCollection('users', (data) => setAllUsers(data as User[]), (err) => { setIsCloudConnected(false); setCloudError(err.message); });
    const unsubDeliveries = syncCollection('deliveries', (data) => setDeliveries(data as Delivery[]), (err) => { setIsCloudConnected(false); setCloudError(err.message); });
    return () => { unsubSettings(); unsubUsers(); unsubDeliveries(); };
  }, []);

  // Theme
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
