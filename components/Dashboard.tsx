
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
  const { currentUser, setCurrentUser, deliveries, allUsers, setAllUsers } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('deliveries');

  const settleVendor = (vendorId: string) => {
    const vendor = allUsers.find(u => u.id === vendorId);
    if (!vendor) return;
    
    const balance = vendor.commissionBalance || 0;
    if (balance <= 0) {
      alert("This merchant has no pending accruals for settlement.");
      return;
    }

    if (window.confirm(`Initiate vault transfer of ₦${balance.toLocaleString()} to ${vendor.name}?`)) {
      // Create the updated user list to ensure a fresh reference for state change detection
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

      // Update Global Registry
      setAllUsers(updatedUsers);

      // If the currently logged-in user is the one being settled, sync their session
      if (currentUser?.id === vendorId) {
        setCurrentUser({
          ...currentUser,
          totalWithdrawn: (currentUser.totalWithdrawn || 0) + balance,
          commissionBalance: 0
        });
      }

      console.log(`Settlement processed: ₦${balance.toLocaleString()} for ${vendorId}`);
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

            {currentUser?.role === Role.Vendor && (
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white shadow-2xl shadow-indigo-500/20">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold font-outfit uppercase tracking-wider">Treasury Overview</h3>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">Verified Merchant</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Available Settlement</p>
                            <p className="text-4xl font-black">₦{(currentUser.commissionBalance || 0).toLocaleString()}</p>
                        </div>
                        <div className="border-l border-white/10 pl-8">
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Lifetime Payouts</p>
                            <p className="text-4xl font-black">₦{(currentUser.totalWithdrawn || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="mt-8 flex items-center gap-3 text-xs font-bold text-indigo-100 bg-black/10 p-4 rounded-xl border border-white/5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Next weekly payout cycle: <span className="underline">Monday, 09:00 AM</span>
                    </div>
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
