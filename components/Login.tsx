
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
      let profile = await getUserProfile(userCredential.user.uid);
      
      if (!profile) {
        // Simple recovery if profile write was interrupted previously
        const recoveryProfile: User = {
          id: userCredential.user.uid,
          name: userCredential.user.displayName || 'User',
          phone: '08000000000',
          email: userCredential.user.email || '',
          role: Role.Customer,
          active: false,
          isDeleted: false,
          commissionBalance: 0
        };
        await setProfileData(userCredential.user.uid, recoveryProfile);
        profile = recoveryProfile;
      }

      if (profile.isDeleted) {
        setMessage({ text: 'ACCOUNT DEACTIVATED', type: 'error' });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      if (profile.active === false) {
        setMessage({ text: 'ENROLLMENT PENDING', type: 'error' });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      setCurrentUser(profile);
    } catch (error: any) {
      console.error("Login Error:", error);
      setMessage({ text: 'Invalid credentials or network error.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

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

      // We fire this and proceed to success screen for non-admins to make it feel instant
      const writePromise = setProfileData(userCredential.user.uid, newUserProfile);
      
      if (!isSuperAdminEmail) {
        // OPTIMISTIC TRANSITION
        setRegistrationSuccess(true);
        setIsLoading(false);
        
        // Finalize in background
        await writePromise;
        await signOut(auth);
      } else {
        await writePromise;
        setCurrentUser(newUserProfile);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Registration Error:", error);
      setIsLoading(false);
      setMessage({ text: error.message || 'Registration failed.', type: 'error' });
    }
  };

  const resetToLogin = () => {
    setRegistrationSuccess(false);
    setView('login');
    setMessage({ text: '', type: 'info' });
  };

  if (registrationSuccess) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-auto animate-in zoom-in-95 duration-300 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase mb-4">Request Sent</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          Your account is being processed. An Admin will verify your details shortly.
        </p>
        <button onClick={resetToLogin} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs">
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md mx-auto relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight font-outfit">
          {view === 'login' ? 'Portal Access' : view === 'register' ? 'New Enrollment' : 'Identity Recovery'}
        </h2>
        <div className="h-1 w-12 bg-indigo-500 mx-auto mt-2 rounded-full"></div>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-xl text-[11px] font-black leading-relaxed border animate-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
          {message.text}
        </div>
      )}

      {view === 'forgot' ? (
        <form onSubmit={(e) => { e.preventDefault(); setIsLoading(true); sendPasswordResetEmail(auth, emailInput).then(() => {setMessage({text: 'Link sent!', type: 'success'}); setView('login');}).catch(()=>{}).finally(()=>setIsLoading(false)); }} className="space-y-4">
          <input type="email" required placeholder="Email Address" className="form-input-v3" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
          <button type="submit" disabled={isLoading} className="btn-primary-v3">{isLoading ? 'Sending...' : 'Reset Access'}</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-black text-indigo-500 uppercase mt-4">Back to Login</button>
        </form>
      ) : view === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" required placeholder="Email" className="form-input-v3" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
          <input type="password" required placeholder="Password" className="form-input-v3" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={isLoading} className="btn-primary-v3">{isLoading ? 'Verifying...' : 'Login'}</button>
          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mt-6">
            <button type="button" onClick={() => setView('register')} className="hover:text-indigo-600">Register</button>
            <button type="button" onClick={() => setView('forgot')} className="hover:text-indigo-600">Forgot Key?</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="form-input-v3" />
          <input type="email" required placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="form-input-v3" />
          <div className="grid grid-cols-2 gap-4">
            <input type="tel" required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-v3" />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="form-input-v3 bg-white dark:bg-slate-950">
              <option value={Role.Customer}>Customer</option>
              <option value={Role.Vendor}>Vendor</option>
              <option value={Role.Rider}>Rider</option>
              <option value={Role.Admin}>Admin</option>
            </select>
          </div>
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input-v3" minLength={6} />
          <button type="submit" className="btn-primary-v3 mt-2" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Register Account'}
          </button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-black text-slate-400 uppercase py-2">Back to Login</button>
        </form>
      )}

      <style>{`
        .form-input-v3 { width: 100%; padding: 0.875rem 1.25rem; border-radius: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; color: #1e293b; font-size: 0.875rem; font-weight: 600; outline: none; transition: all 0.2s; }
        .dark .form-input-v3 { background: #0f172a; border-color: #1e293b; color: #f8fafc; }
        .btn-primary-v3 { width: 100%; background: #4f46e5; color: white; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 1rem; border-radius: 1rem; font-size: 0.75rem; transition: all 0.3s; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.3); }
        .btn-primary-v3:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
        .btn-primary-v3:disabled { opacity: 0.6; cursor: wait; }
      `}</style>
    </div>
  );
};

export default Login;
