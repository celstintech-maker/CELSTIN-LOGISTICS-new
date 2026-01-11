
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Role, User } from '../types';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, setProfileData, getUserProfile, signOut } from '../firebase';

const Login: React.FC = () => {
  const { setCurrentUser, setRecoveryRequests } = useContext(AppContext);
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(Role.Customer);
  
  const [message, setMessage] = useState({ text: '', type: 'error' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, password);
      const profile = await getUserProfile(userCredential.user.uid);
      
      if (!profile) {
        setMessage({ text: 'Access Error: Identity profile missing.', type: 'error' });
        return;
      }

      // STRICT APPROVAL CHECK
      if (profile.active === false) {
        setMessage({ text: 'ACCESS DENIED: Your enrollment is still awaiting Super Admin verification.', type: 'error' });
        await signOut(auth);
        return;
      }

      setCurrentUser(profile as User);
    } catch (error: any) {
      let errorMsg = 'Authentication failed. Please check credentials.';
      if (error.code === 'auth/invalid-credential') errorMsg = 'Invalid email or access token.';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    // support@celstin.com gets automatic SuperAdmin approval
    const isSuperAdminEmail = emailInput.toLowerCase() === 'support@celstin.com';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, password);
      
      const newUserProfile: Partial<User> = {
        id: userCredential.user.uid,
        name,
        phone,
        email: emailInput,
        role: isSuperAdminEmail ? Role.SuperAdmin : role,
        active: isSuperAdminEmail, // ONLY SuperAdmin email is auto-active
        commissionBalance: 0,
        totalWithdrawn: 0,
        commissionRate: 0.1
      };

      await setProfileData(userCredential.user.uid, newUserProfile);
      
      if (!isSuperAdminEmail) {
        setMessage({ text: 'ENROLLMENT LOGGED: You must wait for a Super Admin to approve your terminal access.', type: 'success' });
        await signOut(auth);
        setView('login');
      } else {
        setCurrentUser(newUserProfile as User);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMsg = 'Registration failed.';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'Email already indexed.';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md mx-auto transition-all relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white font-outfit uppercase tracking-tight">
          {view === 'login' ? 'Secure Login' : view === 'register' ? 'Enrollment' : 'Recovery'}
        </h2>
        <p className="text-slate-500 mt-3 text-xs font-bold uppercase tracking-widest">
          {view === 'login' ? 'Terminal authentication required' : view === 'register' ? 'Join the Fleet Network' : 'Verify ID for access restoration'}
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Corporate Email</label>
            <input 
              type="email" 
              required 
              placeholder="support@celstin.com" 
              className="form-input-dark" 
              value={emailInput} 
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Access Token</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••" 
              className="form-input-dark" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary-dark flex items-center justify-center gap-2">
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Authenticate'}
          </button>
          <div className="flex justify-between text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-6">
            <button type="button" onClick={() => setView('register')} className="hover:text-indigo-300">Request Access</button>
            <button type="button" onClick={() => setView('forgot')} className="hover:text-indigo-300">Lost Key?</button>
          </div>
        </form>
      )}

      {view === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Identity Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input-dark" disabled={isLoading} placeholder="Super Admin" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Corporate Email</label>
            <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="form-input-dark" disabled={isLoading} placeholder="support@celstin.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Comms Link</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-dark" disabled={isLoading} placeholder="080..." />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fleet Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="form-input-dark appearance-none" disabled={isLoading}>
                <option value={Role.Customer}>Customer</option>
                <option value={Role.Vendor}>Vendor</option>
                <option value={Role.Rider}>Rider</option>
                <option value={Role.Admin}>Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Create Access Token</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input-dark" disabled={isLoading} placeholder="Min 6 characters" />
          </div>
          <button type="submit" className="btn-primary-dark mt-4 flex items-center justify-center gap-2" disabled={isLoading}>
            Confirm Enrollment
          </button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest py-2" disabled={isLoading}>Return to Login</button>
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
        .btn-primary-dark:hover:not(:disabled) { background: #4f46e5; transform: translateY(-1px); }
      `}</style>
    </div>
  );
};

export default Login;
