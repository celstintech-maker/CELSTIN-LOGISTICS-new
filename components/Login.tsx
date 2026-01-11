
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
      const userCredential = await signInWithEmailAndPassword(auth, emailInput.trim(), password);
      const profile = await getUserProfile(userCredential.user.uid);
      
      if (!profile) {
        setMessage({ text: 'Access Error: Identity profile missing.', type: 'error' });
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      if (profile.active === false) {
        setMessage({ text: 'ENROLLMENT PENDING: Your account is awaiting Super Admin verification. Please try again after approval.', type: 'error' });
        // We stay logged in (Auth-wise) so that the App.tsx listener can detect when 'active' becomes true
        // But we don't call setCurrentUser here; App.tsx handles the state transition.
        setIsLoading(false);
        return;
      }

      setCurrentUser(profile);
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMsg = 'Authentication failed. Please check credentials.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email or access token.';
      }
      setMessage({ text: errorMsg, type: 'error' });
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
      await sendPasswordResetEmail(auth, emailInput.trim());
      setMessage({ text: 'Reset link sent to your inbox.', type: 'success' });
      setView('login');
    } catch (error: any) {
      setMessage({ text: 'Failed to send reset email.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: 'info' });

    const trimmedEmail = emailInput.trim().toLowerCase();
    const isSuperAdminEmail = trimmedEmail === 'support@celstin.com';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      
      const newUserProfile: Partial<User> = {
        id: userCredential.user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: trimmedEmail,
        role: isSuperAdminEmail ? Role.SuperAdmin : role,
        active: isSuperAdminEmail, 
        commissionBalance: 0,
        totalWithdrawn: 0,
        commissionRate: 0.1
      };

      await setProfileData(userCredential.user.uid, newUserProfile);
      
      setIsLoading(false);
      if (!isSuperAdminEmail) {
        setRegistrationSuccess(true);
      } else {
        setCurrentUser(newUserProfile as User);
      }
    } catch (error: any) {
      console.error("Registration Error:", error);
      let errorMsg = 'Registration failed.';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'Email already registered.';
      if (error.code === 'auth/weak-password') errorMsg = 'Password is too weak.';
      setMessage({ text: errorMsg, type: 'error' });
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
      <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md mx-auto animate-in zoom-in-95 duration-500 text-center">
        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-4 font-outfit">Registration Logged</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Your profile has been created! A <span className="text-white font-bold">Super Admin</span> must approve your account before you can log in.
        </p>
        <button onClick={resetToLogin} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition-all uppercase tracking-widest text-xs">
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-10 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md mx-auto relative overflow-hidden">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white uppercase tracking-tight font-outfit">
          {view === 'login' ? 'Secure Login' : view === 'register' ? 'Enrollment' : 'Recovery'}
        </h2>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-xl text-xs font-bold ${message.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
          {message.text}
        </div>
      )}

      {view === 'forgot' ? (
        <form onSubmit={handlePasswordReset} className="space-y-6">
          <input type="email" required placeholder="Corporate Email" className="form-input-dark" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="btn-primary-dark">{isLoading ? 'Processing...' : 'Send Reset Link'}</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-indigo-400 uppercase mt-6">Back to Login</button>
        </form>
      ) : view === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-6">
          <input type="email" required placeholder="Corporate Email" className="form-input-dark" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isLoading} />
          <input type="password" required placeholder="Access Token" className="form-input-dark" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
          <button type="submit" disabled={isLoading} className="btn-primary-dark">{isLoading ? 'Authenticating...' : 'Authenticate'}</button>
          <div className="flex justify-between text-[10px] font-bold text-indigo-400 uppercase mt-6">
            <button type="button" onClick={() => setView('register')}>Request Access</button>
            <button type="button" onClick={() => setView('forgot')}>Lost Key?</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" required placeholder="Full Identity Name" value={name} onChange={(e) => setName(e.target.value)} className="form-input-dark" disabled={isLoading} />
          <input type="email" required placeholder="Corporate Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="form-input-dark" disabled={isLoading} />
          <div className="grid grid-cols-2 gap-4">
            <input type="tel" required placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input-dark" disabled={isLoading} />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="form-input-dark" disabled={isLoading}>
              <option value={Role.Customer}>Customer</option>
              <option value={Role.Vendor}>Vendor</option>
              <option value={Role.Rider}>Rider</option>
              <option value={Role.Admin}>Admin</option>
            </select>
          </div>
          <input type="password" required placeholder="Create Access Token" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input-dark" disabled={isLoading} />
          <button type="submit" className="btn-primary-dark mt-4" disabled={isLoading}>{isLoading ? 'Enrolling...' : 'Confirm Enrollment'}</button>
          <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-slate-500 uppercase py-2">Return to Login</button>
        </form>
      )}

      <style>{`
        .form-input-dark { width: 100%; padding: 0.875rem 1.25rem; border-radius: 1rem; background: #0f172a; border: 1px solid #1e293b; color: white; outline: none; font-size: 0.875rem; transition: all 0.2s; }
        .form-input-dark:focus { border-color: #6366f1; }
        .btn-primary-dark { width: 100%; background: #6366f1; color: white; font-weight: 800; text-transform: uppercase; padding: 1rem; border-radius: 1rem; transition: all 0.3s; }
        .btn-primary-dark:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default Login;
