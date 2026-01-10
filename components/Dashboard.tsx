
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Role } from '../types';
import { CogIcon, TruckIcon, UserCircleIcon, MapIcon, ChartBarIcon } from './icons';
import DeliveriesTable from './DeliveriesTable';
import CreateDelivery from './CreateDelivery';
import ManageStaff from './ManageStaff';
import Settings from './Settings';
import MapView from './MapView';
import VendorFinancials from './VendorFinancials';

const Dashboard: React.FC = () => {
  const { currentUser, setCurrentUser, deliveries, allUsers, setAllUsers, broadcastToCloud, syncFromCloud } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    // Simulate cloud latency
    await new Promise(r => setTimeout(r, 1500));
    await syncFromCloud();
    setIsSyncing(false);
    alert("Fleet Registry Synchronized with Cloud. All device registrations updated.");
  };

  const settleVendor = (vendorId: string) => {
    const vendor = allUsers.find(u => u.id === vendorId);
    if (!vendor) return;
    
    const balance = vendor.commissionBalance || 0;
    if (balance <= 0) {
      alert("This merchant has no pending accruals for settlement.");
      return;
    }

    if (window.confirm(`Initiate vault transfer of ₦${balance.toLocaleString()} to ${vendor.name}?`)) {
      const updatedUsers = allUsers.map(u => {
        if (u.id === vendorId) {
          return {
            ...u,
            totalWithdrawn: (u.totalWithdrawn || 0) + balance,
            commissionBalance: 0
          };
        }
        return u;
      });

      setAllUsers(updatedUsers);

      if (currentUser?.id === vendorId) {
        setCurrentUser({
          ...currentUser,
          totalWithdrawn: (currentUser.totalWithdrawn || 0) + balance,
          commissionBalance: 0
        });
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl"><TruckIcon /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Deliveries</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{deliveries.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><ChartBarIcon /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Tasks</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{deliveries.filter(d => d.status !== 'Delivered').length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><UserCircleIcon /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Completed</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{deliveries.filter(d => d.status === 'Delivered').length}</p>
                    </div>
                </div>
            </div>

            {currentUser?.role === Role.SuperAdmin && (
               <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-white font-bold font-outfit uppercase text-sm tracking-wider">Cloud Sync Terminal</h3>
                    <p className="text-slate-400 text-xs mt-1">Pull data from users who registered on other devices into this terminal.</p>
                  </div>
                  <button 
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2"
                  >
                    <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isSyncing ? 'Accessing Neural Link...' : 'Sync All Devices'}
                  </button>
               </div>
            )}

            {[Role.SuperAdmin, Role.Admin, Role.Rider, Role.Vendor].includes(currentUser!.role) && <CreateDelivery />}
            <DeliveriesTable title="Live Queue" deliveries={deliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed')} />
            <DeliveriesTable title="Archive" deliveries={deliveries.filter(d => d.status === 'Delivered' || d.status === 'Failed')} />
          </div>
        );
      case 'map':
        return <MapView />;
      case 'manageStaff':
        return <ManageStaff />;
      case 'financials':
        return <VendorFinancials settleVendor={settleVendor} />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'deliveries', label: 'Operations', icon: <TruckIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Vendor, Role.Rider, Role.Customer] },
    { id: 'map', label: 'Live Fleet', icon: <MapIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Rider] },
    { id: 'manageStaff', label: 'Workforce', icon: <UserCircleIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin] },
    { id: 'financials', label: 'Financials', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, roles: [Role.SuperAdmin] },
    { id: 'settings', label: 'Core Config', icon: <CogIcon className="w-5 h-5" />, roles: [Role.SuperAdmin] },
  ];

  const availableTabs = tabs.filter(tab => tab.roles.includes(currentUser!.role));

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24 transition-colors">
           <div className="mb-6 hidden lg:block">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4">Navigation</h3>
           </div>
           <nav className="space-y-1.5">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-grow min-w-0">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Main Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Managing logistics for <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser?.name}</span> as <span className="text-blue-600 dark:text-blue-400 font-bold">{currentUser?.role}</span></p>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
