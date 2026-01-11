
import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Delivery, VendorPerformance, SystemSettings } from './types';
import { MOCK_VENDORS_PERFORMANCE } from './constants';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerView from './components/CustomerView';
import ChatWidget from './components/ChatWidget';
import { db, auth, syncCollection, onAuthStateChanged, signOut, updateData } from './firebase';
import { doc, onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';

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

  // Rider Geolocation & Compliance Monitoring
  useEffect(() => {
    if (currentUser?.role !== Role.Rider) return;

    let watchId: number;
    
    const updateLocationStatus = (status: 'Active' | 'Disabled') => {
      updateData('users', currentUser.id, { locationStatus: status }).catch(() => {});
    };

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateData('users', currentUser.id, {
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            locationStatus: 'Active'
          }).catch(console.error);
        },
        (error) => {
          console.warn("Geolocation Error:", error);
          if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
            updateLocationStatus('Disabled');
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    } else {
      updateLocationStatus('Disabled');
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [currentUser?.id, currentUser?.role]);

  // Main Auth and Profile Synchronization logic
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        profileUnsubscribe = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = { id: docSnap.id, ...docSnap.data() } as User;
            // Only allow active, non-deleted users to stay logged in
            if (profile.active !== false && !profile.isDeleted) {
              setCurrentUser(profile);
            } else {
              setCurrentUser(null);
              // Explicitly sign out if they were deactivated while logged in
              signOut(auth);
            }
          } else {
            setCurrentUser(null);
            signOut(auth);
          }
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as SystemSettings;
        setSystemSettings(data);
        localStorage.setItem('clestin_settings', JSON.stringify(data));
      }
    });
    return () => unsub();
  }, []);

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

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.id),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const now = Date.now();
          const docTime = data.createdAt?.toMillis() || 0;
          if (now - docTime < 10000) {
            setActiveNotification({ title: data.title, body: data.body });
            setTimeout(() => setActiveNotification(null), 8000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (systemSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
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
    cloudError
  }), [currentUser, deliveries, allUsers, vendorPerformance, systemSettings, chatHistory, recoveryRequests, isCloudConnected, cloudError]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex flex-col min-h-screen transition-all duration-700 ease-in-out bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100">
        <Header />
        
        {activeNotification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-10 duration-500">
            <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-2xl border border-indigo-400 flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              </div>
              <div className="flex-grow">
                <h4 className="font-black uppercase tracking-widest text-[11px] mb-1">{activeNotification.title}</h4>
                <p className="text-sm font-medium leading-tight">{activeNotification.body}</p>
              </div>
              <button onClick={() => setActiveNotification(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}

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
              <div className="flex justify-center items-center py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-200/20 dark:bg-slate-900/20 -mx-4 md:-mx-8">
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
