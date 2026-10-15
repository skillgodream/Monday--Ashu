import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Shield, Users, UserCheck, LogIn, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithGoogle,
    loginWithEmail,
    selectDemoPersona,
    role,
    isDemo,
    isLoading,
    error,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'persona' | 'login'>('persona');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setFormError(err?.message || 'Login failed.');
    }
  };

  const handleGoogleSubmit = async () => {
    setFormError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setFormError(err?.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">Guru Coach Identity & Access</h2>
          <p className="text-xs text-stone-500 mt-1">
            Sign in to access your organization's LMS, or switch evaluation persona.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 mb-4">
          <button
            onClick={() => setActiveTab('persona')}
            className={`flex-1 pb-2 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'persona'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Demo Persona Switching
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 pb-2 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'login'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Enterprise SSO / Password
          </button>
        </div>

        {(error || formError) && (
          <div className="mb-4 flex items-start gap-2 p-3 text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error || formError}</span>
          </div>
        )}

        {activeTab === 'persona' ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-600">
              Select a pre-provisioned LMS role to preview permissions and tenant workflows:
            </p>

            {/* Admin Persona */}
            <button
              onClick={() => selectDemoPersona('admin')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                role === 'admin'
                  ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-300'
                  : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-900">Rajesh Patel</div>
                  <div className="text-[11px] text-stone-500">VP Operations · Admin (Org Scope)</div>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Full Admin
              </span>
            </button>

            {/* Manager Persona */}
            <button
              onClick={() => selectDemoPersona('manager')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                role === 'manager'
                  ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-300'
                  : 'border-stone-200 hover:border-blue-300 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-900">Priya Sharma</div>
                  <div className="text-[11px] text-stone-500">Delivery Ops Lead · Team Manager</div>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                Team Lead
              </span>
            </button>

            {/* Learner Persona */}
            <button
              onClick={() => selectDemoPersona('learner')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                role === 'learner'
                  ? 'border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-300'
                  : 'border-stone-200 hover:border-emerald-300 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-900">Vikram Singh</div>
                  <div className="text-[11px] text-stone-500">Field Associate · Learner</div>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                Frontline
              </span>
            </button>

            {/* Public Guest Option */}
            <button
              onClick={() => selectDemoPersona('guest')}
              className="w-full text-center py-2 text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              Reset to Public Demo Guest
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleGoogleSubmit}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google Workspace</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-stone-200 w-full"></div>
              <span className="bg-white px-2 text-[11px] text-stone-400 absolute">or sign in with email</span>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Work Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@organization.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
