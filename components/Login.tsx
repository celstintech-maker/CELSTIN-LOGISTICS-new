
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
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, password);
      const profile = await getUserProfile(userCredential.user.uid);
      
      if (!profile) {
        setMessage({ text: 'Access Error: Identity profile missing.', type: 'error' });
        await signOut(auth);
        return;
      }

      // Block users that are not yet approved by Super Admin
      if (profile.active === false) {
        setMessage({ text: 'ENROLLMENT PENDING: Your account is currently in the verification queue. A Super Admin will review your credentials shortly.', type: 'error' });
        await signOut(auth);
        return;
      }

      setCurrentUser(profile);
    } catch (error: any) {
      let errorMsg = 'Authentication failed. Please check credentials.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'Invalid email or access token.';
      }
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) {
      setMessage({ text: 'Please enter your email address.', type: 'error' });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailInput);
      setMessage({ text: 'Reset link sent to your inbox. Check your spam if not found.', type: 'success' });
      setView('login');
    } catch (error: any) {
      setMessage({ text: 'Failed to send reset email. ' + error.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    const isSuperAdminEmail = emailInput.toLowerCase() === 'support@celstin.com';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, password);
      
      const newUserProfile: Partial<User> = {
        id: userCredential.user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: emailInput.trim(),
        role: isSuperAdminEmail ? Role.SuperAdmin : role,
        active: isSuperAdminEmail, // Super admin is active by default, others need approval
        commissionBalance: 0,
        totalWithdrawn: 0,
        commissionRate: 0.1
      };

      await setProfileData(userCredential.user.uid, newUserProfile);
      
      if (!isSuperAdminEmail) {
        setRegistrationSuccess(true);
        // Log them out immediately so they can't bypass the check until session refresh
        await signOut(auth);
      } else {
        setCurrentUser(newUserProfile as User);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMsg = 'Registration failed.';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'Email already indexed in our registry.';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setRegistrationSuccess(false);
    setView('login');
    setEmailInput('');
    setPassword('');
    setName('');
    setPhone('');
    setMessage({ text: '', type: 'info' });
  };

  if (registrationSuccess) {
    return (
      <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md mx-auto animate-in zoom-in-95 duration-500 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
        <div className="text-center">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white font-outfit uppercase tracking-tight mb-4">Enrollment Logged</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Success! Your profile has been created. To maintain network integrity, a <span className="text-white font-bold">Super Admin</span> must now approve your access.
            <br /><br />
            You will be able to log in once your status is marked as <span className="text-emerald-500 font-bold uppercase tracking-widest text-[10px]">Active</span>.
          </p>
          <button 
            onClick={resetToLogin}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20"
          >
            Acknowledge & Return
          </button>
        </div>
      </div>
    );
  }

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
        <div className={`p-4 mb-6 rounded-xl text-xs font-bold leading-relaxed ${message.type === 'error' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
          {message.text}
        </div>
      )}

      {view === 'forgot' ? (
        <form onSubmit={handlePasswordReset} className="space-y-6">
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
          <button type="submit" disabled={isLoading} className="btn-primary-dark">
            {isLoading ? 'Processing...' : 'Send Recovery Link'}
          </button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-6">Return to Login</button>
        </form>
      ) : view === 'login' ? (
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
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Identity Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input-dark" disabled={isLoading} placeholder="John Doe" />
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
            {isLoading ? (
               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Confirm Enrollment'}
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
