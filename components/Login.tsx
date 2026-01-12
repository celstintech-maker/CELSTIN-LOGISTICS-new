
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Role, User } from '../types';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, setProfileData, getUserProfile, signOut, sendPasswordResetEmail } from '../firebase';

const Login: React.FC = () => {
  const { setCurrentUser } = useContext(AppContext);
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(Role.Customer);
  
  const [message, setMessage] = useState({ text: '', type: 'error' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput.trim().toLowerCase(), password);
      const profile = await getUserProfile(userCredential.user.uid);
      
      if (!profile) {
        setMessage({ text: 'Access Error: Identity profile missing.', type: 'error' });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      if (profile.isDeleted) {
        setMessage({ text: 'ACCOUNT DEACTIVATED: Contact Admin for restoration.', type: 'error' });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      if (profile.active === false) {
        setMessage({ text: 'ENROLLMENT PENDING: Awaiting Admin approval.', type: 'error' });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      setCurrentUser(profile);
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMsg = 'Authentication failed. Check credentials.';
      if (error.code === 'auth/invalid-credential') errorMsg = 'Invalid email or password.';
      if (error.code === 'auth/user-disabled') errorMsg = 'This account has been disabled.';
      if (error.code === 'auth/too-many-requests') errorMsg = 'Too many attempts. Try again later.';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    const trimmedEmail = emailInput.trim().toLowerCase();
    const isSuperAdminEmail = trimmedEmail === 'support@celstin.com';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      
      const newUserProfile: User = {
        id: userCredential.user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: trimmedEmail,
        role: isSuperAdminEmail ? Role.SuperAdmin : role,
        active: isSuperAdminEmail, 
        isDeleted: false,
        commissionBalance: 0,
        totalWithdrawn: 0,
        commissionRate: 0.1,
        riderStatus: 'Offline'
      };

      await setProfileData(userCredential.user.uid, newUserProfile);
      
      if (!isSuperAdminEmail) {
        // Sign out immediately so the App's auth listener doesn't try to log them into a pending account
        await signOut(auth);
        setRegistrationSuccess(true);
        // Clean up inputs
        setEmailInput('');
        setPassword('');
        setName('');
        setPhone('');
      } else {
        setCurrentUser(newUserProfile);
      }
    } catch (error: any) {
      console.error("Registration Error:", error);
      let errorMsg = 'Registration failed. Check connection.';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'This email is already registered.';
      if (error.code === 'auth/invalid-email') errorMsg = 'Please enter a valid email address.';
      if (error.code === 'auth/weak-password') errorMsg = 'Password must be at least 6 characters.';
      if (error.code === 'auth/network-request-failed') errorMsg = 'Network error. Check your connection.';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setRegistrationSuccess(false);
    setView('login');
    setMessage({ text: '', type: 'info' });
  };

  if (registrationSuccess) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-auto animate-in zoom-in-95 duration-500 text-center will-change-transform">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-4 font-outfit">Request Received</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 px-4">
          Enrollment captured. An <span className="text-indigo-600 font-bold">Administrator</span> must verify your identity before login is enabled.
        </p>
        <button onClick={resetToLogin} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 active:scale-95">
          Return to Portal
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-auto relative overflow-hidden will-change-transform animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-outfit">
          {view === 'login' ? 'Portal Access' : view === 'register' ? 'New Enrollment' : 'Identity Recovery'}
        </h2>
        <div className="h-1 w-12 bg-indigo-500 mx-auto mt-2 rounded-full"></div>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-xl text-[11px] font-black leading-relaxed border animate-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'error' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
            {message.text}
          </div>
        </div>
      )}

      {view === 'forgot' ? (
        <form onSubmit={(e) => { e.preventDefault(); if(!isLoading) { setIsLoading(true); sendPasswordResetEmail(auth, emailInput).then(() => {setMessage({text: 'Reset link sent!', type: 'success'}); setView('login');}).catch(()=>setMessage({text: 'Reset failed.', type: 'error'})).finally(()=>setIsLoading(false)); } }} className="space-y-4">
          <input type="email" required placeholder="Email Address" className="form-input-v3" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="btn-primary-v3">{isLoading ? 'Sending Request...' : 'Reset Access'}</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase mt-4">Back to Login</button>
        </form>
      ) : view === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" required placeholder="Corporate Email" className="form-input-v3" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isLoading} autoComplete="email" />
          <input type="password" required placeholder="Access Token" className="form-input-v3" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} autoComplete="current-password" />
          <button type="submit" disabled={isLoading} className="btn-primary-v3">{isLoading ? 'Validating Token...' : 'Log In'}</button>
          <div className="flex justify-between text-[10px] font-black text-slate-500 dark:text-indigo-400 uppercase mt-6 px-1">
            <button type="button" onClick={() => setView('register')} className="hover:text-indigo-600 transition-colors">Create Account</button>
            <button type="button" onClick={() => setView('forgot')} className="hover:text-indigo-600 transition-colors">Forgot Key?</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" required placeholder="Legal Full Name" value={name} onChange={(e) => setName(e.target.value)} className="form-input-v3" disabled={isLoading} />
          <input type="email" required placeholder="Corporate Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="form-input-v3" disabled={isLoading} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="tel" required placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-v3" disabled={isLoading} />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="form-input-v3 cursor-pointer bg-white dark:bg-slate-950" disabled={isLoading}>
              <option value={Role.Customer}>Customer</option>
              <option value={Role.Vendor}>Vendor</option>
              <option value={Role.Rider}>Rider</option>
              <option value={Role.Admin}>Admin</option>
            </select>
          </div>
          <input type="password" required placeholder="Create Access Token" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input-v3" disabled={isLoading} minLength={6} />
          <button type="submit" className="btn-primary-v3 mt-2" disabled={isLoading}>
            <span className="flex items-center justify-center gap-2">
              {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              {isLoading ? 'Processing...' : 'Register Account'}
            </span>
          </button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-black text-slate-400 uppercase py-2">Return to Login</button>
        </form>
      )}

      <style>{`
        .form-input-v3 { 
          width: 100%; 
          padding: 0.875rem 1.25rem; 
          border-radius: 1rem; 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          color: #1e293b; 
          outline: none; 
          font-size: 0.875rem; 
          font-weight: 600;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .dark .form-input-v3 { background: #0f172a; border-color: #1e293b; color: #f8fafc; }
        .form-input-v3:focus { border-color: #6366f1; ring: 2px; ring-color: #6366f1; }
        
        .btn-primary-v3 { 
          width: 100%; 
          background: #4f46e5; 
          color: white; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 0.1em;
          padding: 1rem; 
          border-radius: 1rem; 
          font-size: 0.75rem;
          transition: all 0.3s; 
          box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.3);
        }
        .btn-primary-v3:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
        .btn-primary-v3:active:not(:disabled) { transform: translateY(0); }
        .btn-primary-v3:disabled { opacity: 0.6; cursor: wait; }
      `}</style>
    </div>
  );
};

export default Login;
