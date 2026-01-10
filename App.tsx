
import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Delivery, VendorPerformance, SystemSettings, DeliveryStatus } from './types';
import { MOCK_USERS, MOCK_DELIVERIES, MOCK_VENDORS_PERFORMANCE } from './constants';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerView from './components/CustomerView';
import ChatWidget from './components/ChatWidget';

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
  systemSettings: {
    businessName: 'CLESTIN LOGISTICS',
    businessAddress: '123 Logistics Way, Asaba, Delta State',
    logoUrl: '',
    primaryColor: 'indigo',
    paymentAccountName: 'Celstine Logistics',
    paymentAccountNumber: '9022786275',
    paymentBank: 'Moniepoint MFB',
    footerText: '© 2024 CLESTIN LOGISTICS. Premium Delivery Intelligence.',
    theme: 'dark',
    standardCommissionRate: 0.1
  },
  setSystemSettings: () => {},
  chatHistory: [],
  setChatHistory: () => {},
  recoveryRequests: [],
  setRecoveryRequests: () => {},
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS.map(u => ({
      ...u,
      commissionBalance: u.role === Role.Vendor ? Math.floor(Math.random() * 50000) : 0,
      totalWithdrawn: u.role === Role.Vendor ? Math.floor(Math.random() * 200000) : 0,
      commissionRate: 0.1
  })));
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>(MOCK_VENDORS_PERFORMANCE);
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('clestin_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
    return {
      businessName: 'CLESTIN LOGISTICS',
      businessAddress: '123 Logistics Way, Asaba, Delta State',
      logoUrl: '',
      primaryColor: 'indigo',
      paymentAccountName: 'Celstine Logistics',
      paymentAccountNumber: '9022786275',
      paymentBank: 'Moniepoint MFB',
      footerText: '© 2024 CLESTIN LOGISTICS. Premium Delivery Intelligence.',
      theme: 'dark',
      standardCommissionRate: 0.1
    };
  });

  useEffect(() => {
    localStorage.setItem('clestin_settings', JSON.stringify(systemSettings));
    if (systemSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [systemSettings]);

  const logout = () => setCurrentUser(null);

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
  }), [currentUser, deliveries, allUsers, vendorPerformance, systemSettings, chatHistory, recoveryRequests]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex flex-col min-h-screen transition-colors duration-700 ease-in-out bg-slate-50 dark:bg-[#020617]">
        <Header />
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
