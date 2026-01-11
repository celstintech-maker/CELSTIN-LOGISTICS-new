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
import UserProfile from './UserProfile';

const Dashboard: React.FC = () => {
  const { currentUser, deliveries, allUsers, setAllUsers, syncFromCloud } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [isSyncing, setIsSyncing] = useState(false);

  const userDeliveries = deliveries.filter(d => {
    if (currentUser?.role === Role.SuperAdmin || currentUser?.role === Role.Admin) return true;
    if (currentUser?.role === Role.Rider) return d.rider?.id === currentUser.id;
    if (currentUser?.role === Role.Vendor) return d.vendorId === currentUser.id;
    if (currentUser?.role === Role.Customer) return d.customer.phone === currentUser.phone;
    return false;
  });

  const hasActivity = userDeliveries.length > 0;

  const settleVendor = (vendorId: string) => {
    const vendor = allUsers.find(u => u.id === vendorId);
    if (!vendor) return;
    
    const balance = vendor.commissionBalance || 0;
    if (balance <= 0) return;

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
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Your Deliveries</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{userDeliveries.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl"><ChartBarIcon /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Pending Tasks</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{userDeliveries.filter(d => d.status !== 'Delivered').length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-colors">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl"><UserCircleIcon /></div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Success Rate</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {userDeliveries.length > 0 ? Math.round((userDeliveries.filter(d => d.status === 'Delivered').length / userDeliveries.length) * 100) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {[Role.SuperAdmin, Role.Admin, Role.Rider, Role.Vendor].includes(currentUser!.role) && <CreateDelivery />}

            {!hasActivity ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 transition-all">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
                  <TruckIcon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-outfit uppercase">System Clean & Ready</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2 text-sm">
                  Welcome to your terminal, <span className="font-bold text-indigo-500">{currentUser?.name}</span>. Your dispatch history is currently empty.
                </p>
              </div>
            ) : (
              <>
                <DeliveriesTable title="Live Queue" deliveries={userDeliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed')} />
                <DeliveriesTable title="Archive" deliveries={userDeliveries.filter(d => d.status === 'Delivered' || d.status === 'Failed')} />
              </>
            )}
          </div>
        );
      case 'map':
        return <MapView />;
      case 'manageStaff':
        return <ManageStaff />;
      case 'financials':
        return <VendorFinancials settleVendor={settleVendor} />;
      case 'profile':
        return <UserProfile />;
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
    { id: 'profile', label: 'Identity', icon: <UserCircleIcon className="w-5 h-5" />, roles: [Role.SuperAdmin, Role.Admin, Role.Vendor, Role.Rider, Role.Customer] },
    { id: 'settings', label: 'Core Config', icon: <CogIcon className="w-5 h-5" />, roles: [Role.SuperAdmin] },
  ];

  const availableTabs = tabs.filter(tab => tab.roles.includes(currentUser!.role));

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24 transition-colors">
           <nav className="space-y-1.5">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 translate-x-1'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-outfit uppercase">Logistics Command</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Welcome back, <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser?.name}</span> • <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-[10px]">{currentUser?.role}</span></p>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;