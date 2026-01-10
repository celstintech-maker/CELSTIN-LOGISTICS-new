
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Role, User } from '../types';
import { pushData } from '../firebase';

const Login: React.FC = () => {
  const { setCurrentUser, allUsers, setRecoveryRequests } = useContext(AppContext);
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.Customer);
  
  const [message, setMessage] = useState({ text: '', type: 'error' });

  const isEmailInput = useMemo(() => {
    return identifier.includes('@') || identifier.toLowerCase() === 'support@celstin.com';
  }, [identifier]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let user = allUsers.find(u => u.email?.toLowerCase() === identifier.toLowerCase() && u.role === Role.SuperAdmin);
    if (!user) {
        user = allUsers.find(u => u.name.toLowerCase() === identifier.toLowerCase() && u.role !== Role.SuperAdmin);
    }

    if (user) {
      if (user.pin !== pin) {
        setMessage({ text: 'Incorrect Security Credentials.', type: 'error' });
        return;
      }
      if (user.active === false) {
        setMessage({ text: 'Neural access pending approval.', type: 'error' });
        return;
      }
      setCurrentUser(user);
    } else {
      setMessage({ text: 'Identity not verified in registry.', type: 'error' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || isNaN(Number(pin))) {
        setMessage({ text: 'PIN protocol requires 4 digits.', type: 'error' });
        return;
    }
    const nameExists = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
      setMessage({ text: 'Name already indexed in fleet.', type: 'error' });
      return;
    }
    
    setIsLoading(true);
    const needsApproval = [Role.Vendor, Role.Rider].includes(role);
    const newUser: Partial<User> = {
      name,
      phone,
      email,
      pin,
      role,
      active: !needsApproval,
      commissionBalance: 0,
      totalWithdrawn: 0,
      commissionRate: 0.1
    };

    try {
      // PUSH TO FIREBASE
      await pushData('users', newUser);
      
      if (needsApproval) {
        setMessage({ text: 'Application sent for encryption review.', type: 'success' });
      } else {
        setMessage({ text: 'Access Granted. Authenticate to enter.', type: 'success' });
      }
      setView('login');
    } catch (error) {
      setMessage({ text: 'Sync Error: Check internet connection.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryRequests(prev => [...prev, {
        id: `rec-${Date.now()}`,
        name,
        phone,
        timestamp: new Date()
    }]);
    setMessage({ text: 'Recovery signal transmitted. Admin will contact you.', type: 'success' });
    setView('login');
  };

  return (
    <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md mx-auto transition-all relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white font-outfit uppercase tracking-tight">
          {view === 'login' ? 'Authentication' : view === 'register' ? 'Node Registration' : 'Access Recovery'}
        </h2>
        <p className="text-slate-500 mt-3 text-xs font-bold uppercase tracking-widest">
          {view === 'login' ? 'Enter credentials for terminal access' : view === 'register' ? 'Join the Logistics Collective' : 'Verify ID for PIN retrieval'}
        </p>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-xl text-xs font-bold ${message.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
          {message.text}
        </div>
      )}

      {view === 'login' && (
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Terminal ID / Email</label>
            <input type="text" required placeholder="Name or @celstin.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="form-input-dark" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{isEmailInput ? 'Access Token' : 'Secure PIN'}</label>
            <input type="password" maxLength={isEmailInput ? 20 : 4} required placeholder={isEmailInput ? "••••••••" : "••••"} value={pin} onChange={(e) => setPin(isEmailInput ? e.target.value : e.target.value.replace(/\D/g, ''))} className="form-input-dark" />
          </div>
          <button type="submit" className="btn-primary-dark">Verify Identity</button>
          <div className="flex justify-between text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-6">
            <button type="button" onClick={() => setView('register')} className="hover:text-indigo-300">Request Access</button>
            <button type="button" onClick={() => setView('forgot')} className="hover:text-indigo-300">Lost Key?</button>
          </div>
        </form>
      )}

      {view === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Identity Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input-dark" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Comms Link</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-dark" disabled={isLoading} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fleet Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="form-input-dark appearance-none" disabled={isLoading}>
                <option value={Role.Customer}>Customer</option>
                <option value={Role.Vendor}>Vendor</option>
                <option value={Role.Rider}>Rider</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Security PIN (4 Digits)</label>
            <input type="password" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="form-input-dark" disabled={isLoading} />
          </div>
          <button type="submit" className="btn-primary-dark mt-4 flex items-center justify-center gap-2" disabled={isLoading}>
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? 'Syncing...' : 'Confirm Enrollment'}
          </button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest py-2" disabled={isLoading}>Return to Login</button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleRecoveryRequest} className="space-y-4">
          <p className="text-slate-400 text-[10px] font-medium leading-relaxed mb-4 italic">Providing your registered name and phone will alert a Super Admin to investigate and verify your secure PIN reset.</p>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registered Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input-dark" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registered Phone</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-dark" />
          </div>
          <button type="submit" className="btn-primary-dark mt-4">Request Recovery</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest py-2">Back to Login</button>
        </form>
      )}

      <style>{`
        .form-input-dark {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border-radius: 1rem;
          background: #0f172a;
          border: 1px solid #1e293b;
          color: white;
          outline: none;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        .form-input-dark:focus { border-color: #6366f1; background: #020617; }
        .form-input-dark:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary-dark {
          width: 100%;
          background: #6366f1;
          color: white;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 1rem;
          border-radius: 1rem;
          transition: all 0.3s;
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
        }
        .btn-primary-dark:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.4); }
        .btn-primary-dark:disabled { background: #334155; box-shadow: none; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  );
};

export default Login;
