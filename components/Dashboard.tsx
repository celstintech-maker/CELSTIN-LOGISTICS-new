
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Role, Delivery, RiderStatus } from '../types';
import { CogIcon, TruckIcon, UserCircleIcon, MapIcon, ChartBarIcon } from './icons';
import DeliveriesTable from './DeliveriesTable';
import CreateDelivery from './CreateDelivery';
import ManageStaff from './ManageStaff';
import Settings from './Settings';
import MapView from './MapView';
import VendorFinancials from './VendorFinancials';
import UserProfile from './UserProfile';
import { updateData } from '../firebase';

const Dashboard: React.FC = () => {
  const { currentUser, deliveries, allUsers, setAllUsers } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [selectedOrderForNav, setSelectedOrderForNav] = useState<Delivery | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const userDeliveries = deliveries.filter(d => {
    if (currentUser?.role === Role.SuperAdmin || currentUser?.role === Role.Admin) return true;
    if (currentUser?.role === Role.Rider) return d.rider?.id === currentUser.id;
    if (currentUser?.role === Role.Vendor) return d.vendorId === currentUser.id;
    if (currentUser?.role === Role.Customer) return d.customer.phone === currentUser.phone;
    return false;
  });

  const handleLocateOrder = (delivery: Delivery) => {
    setSelectedOrderForNav(delivery);
    setActiveTab('map');
  };

  const handleToggleAvailability = async () => {
    if (!currentUser) return;
    const newStatus: RiderStatus = currentUser.riderStatus === 'Available' ? 'Offline' : 'Available';
    try {
        await updateData('users', currentUser.id, { riderStatus: newStatus });
    } catch (e) {
        alert("Sync failed.");
    }
  };

  const tabs = [
    { id: 'deliveries', label: 'Home', icon: <TruckIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Vendor, Role.Rider, Role.Customer] },
    { id: 'map', label: 'Fleet', icon: <MapIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Rider] },
    { id: 'manageStaff', label: 'Staff', icon: <UserCircleIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin] },
    { id: 'profile', label: 'Profile', icon: <UserCircleIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Vendor, Role.Rider, Role.Customer] },
    { id: 'settings', label: 'Config', icon: <CogIcon className="w-5 h-5" />, roles: [Role.SuperAdmin] },
  ];

  const availableTabs = tabs.filter(tab => tab.roles.includes(currentUser!.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             {/* Simple Stats Grid */}
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 transition-colors">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl"><TruckIcon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{userDeliveries.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 transition-colors">
                    <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><ChartBarIcon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-widest">Live</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{userDeliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed').length}</p>
                    </div>
                </div>
                <div className="hidden lg:flex bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 items-center gap-4">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><UserCircleIcon className="w-5 h-5" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Success</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {userDeliveries.length > 0 ? Math.round((userDeliveries.filter(d => d.status === 'Delivered').length / userDeliveries.length) * 100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {[Role.SuperAdmin, Role.Admin, Role.Rider, Role.Vendor].includes(currentUser!.role) && <CreateDelivery />}

            <div className="space-y-4">
                <DeliveriesTable 
                  title="Active Fleet Queue" 
                  deliveries={userDeliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed')} 
                  onLocate={handleLocateOrder}
                />
                <DeliveriesTable 
                  title="Order Archive" 
                  deliveries={userDeliveries.filter(d => d.status === 'Delivered' || d.status === 'Failed')} 
                />
            </div>
          </div>
        );
      case 'map': return <MapView targetOrder={selectedOrderForNav} />;
      case 'manageStaff': return <ManageStaff />;
      case 'profile': return <UserProfile />;
      case 'settings': return <Settings />;
      case 'financials': return <VendorFinancials settleVendor={() => {}} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      {/* Top Banner - Contextual */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit uppercase">
            {availableTabs.find(t => t.id === activeTab)?.label}
          </h2>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">
            Logistics Command Center
          </p>
        </div>
        
        {currentUser?.role === Role.Rider && activeTab === 'deliveries' && (
          <button 
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                currentUser.riderStatus === 'Available' 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {currentUser.riderStatus === 'Available' ? 'Online' : 'Offline'}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-0">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 sticky top-24">
             <nav className="space-y-1">
              {availableTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'map') setSelectedOrderForNav(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 translate-x-1'
                      : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
              {currentUser?.role === Role.SuperAdmin && (
                <button
                  onClick={() => setActiveTab('financials')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${
                    activeTab === 'financials' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>Financials</span>
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-grow min-w-0">
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-2 z-[60] flex justify-around items-center">
        {availableTabs.slice(0, 5).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'map') setSelectedOrderForNav(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
              activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'
            }`}
          >
            {tab.icon}
            <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && <span className="w-1 h-1 rounded-full bg-current"></span>}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
