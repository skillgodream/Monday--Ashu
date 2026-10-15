import React from 'react';
import { Loader2 } from 'lucide-react';
import { sounds } from '../utils/audio';

interface AnalyzingModalProps {
  isOpen: boolean;
  onCancel: () => void;
}

export function AnalyzingModal({ isOpen, onCancel }: AnalyzingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="text-center flex flex-col items-center gap-6">
        <div className="relative">
          <Loader2 size={48} className="text-blue-500 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Analyzing document...</h2>
          <p className="text-sm text-slate-400">Building your operational training experience.</p>
        </div>
        <button
          onClick={() => { sounds.playTap(); onCancel(); }}
          className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
