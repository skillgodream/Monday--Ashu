import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, LogIn, LogOut, Shield, Users, UserCheck } from 'lucide-react';

export const HeaderUserWidget: React.FC = () => {
  const { currentUser, role, isDemo, activePersona, openAuthModal, logout } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <Shield className="w-3 h-3 text-amber-700" />
            Admin
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            <Users className="w-3 h-3 text-blue-700" />
            Manager
          </span>
        );
      case 'learner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <UserCheck className="w-3 h-3 text-emerald-700" />
            Learner
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700 border border-stone-300">
            Demo Mode
          </span>
        );
    }
  };

  const displayName = currentUser?.fullName || activePersona?.fullName || (isDemo ? 'Guest Evaluator' : 'User');
  const jobTitle = currentUser?.jobTitle || activePersona?.jobTitle || (isDemo ? 'Public Sandbox' : '');

  return (
    <div className="flex items-center gap-2.5">
      <div className="text-right hidden sm:block">
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-xs font-medium text-stone-900">{displayName}</span>
          {getRoleBadge()}
        </div>
        {jobTitle && <p className="text-[10px] text-stone-500 truncate max-w-[150px]">{jobTitle}</p>}
      </div>

      {currentUser ? (
        <button
          onClick={logout}
          title="Sign out or switch persona"
          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={openAuthModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 shadow-sm transition-colors"
        >
          <LogIn className="w-3.5 h-3.5 text-stone-500" />
          <span>Sign In / Persona</span>
        </button>
      )}
    </div>
  );
};
