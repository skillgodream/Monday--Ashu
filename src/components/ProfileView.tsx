import React, { useState } from 'react';
import { User, Volume2, VolumeX, Moon, Sun, RotateCcw, Shield, Award, Check, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface ProfileViewProps {
  onResetData: () => void;
  onOpenBentoShowcase?: () => void;
  onOpenPassport?: () => void;
}

export default function ProfileView({ onResetData, onOpenBentoShowcase, onOpenPassport }: ProfileViewProps) {
  const [audioEnabled, setAudioEnabled] = useState(sounds.isSoundEnabled());
  const [darkMode, setDarkMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sounds.setSoundEnabled(next);
    if (next) {
      sounds.playTap();
      sounds.speak('Sound effects enabled');
    }
  };

  const toggleDarkMode = () => {
    sounds.playTap();
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleReset = () => {
    sounds.playTap();
    onResetData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 pt-4 pb-28 space-y-6 text-white relative z-10 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Worker Profile</h1>
        <p className="text-sm font-normal text-white/60 mt-1">
          Shift credentials & device preferences
        </p>
      </div>

      {/* User Card - Apple Translucent Dark Glass */}
      <div className="bg-[#0E1017]/85 backdrop-blur-2xl rounded-3xl p-5 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-4 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-2xl border border-white/20 shadow-md">
          VS
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Vikram Sharma</h2>
          <p className="text-xs font-semibold text-emerald-400">Fulfillment Specialist · Bay A/B</p>
          <span className="text-[11px] font-normal text-white/50 block mt-0.5">
            Badge ID: WMS-88492 · Shift 1
          </span>
        </div>
      </div>

      {/* Stats Summary - 3 Apple Translucent Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0E1017]/80 backdrop-blur-xl p-3.5 rounded-2xl border border-white/[0.08] text-center shadow-md">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Drills</span>
          <span className="text-xl font-black text-white mt-0.5 block">24</span>
        </div>
        <div className="bg-[#0E1017]/80 backdrop-blur-xl p-3.5 rounded-2xl border border-white/[0.08] text-center shadow-md">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Scan Rate</span>
          <span className="text-xl font-black text-emerald-400 mt-0.5 block">99.2%</span>
        </div>
        <div className="bg-[#0E1017]/80 backdrop-blur-xl p-3.5 rounded-2xl border border-white/[0.08] text-center shadow-md">
          <span className="text-[10px] uppercase font-bold text-white/50 block">Tier</span>
          <span className="text-xl font-black text-sky-400 mt-0.5 block">Level 2</span>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
          Audio & Display Settings
        </h3>

        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className="w-full p-4 bg-[#0E1017]/80 hover:bg-[#151923]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] flex items-center justify-between active:scale-[0.985] transition-all shadow-md cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10">
              {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </div>
            <div className="text-left">
              <span className="text-sm font-bold text-white block">Audio Sound Effects & Voice</span>
              <span className="text-xs text-white/50 font-normal block">
                {audioEnabled ? 'Voice coach and sound chimes on' : 'Muted'}
              </span>
            </div>
          </div>
          <div
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
              audioEnabled ? 'bg-white justify-end' : 'bg-white/20 justify-start'
            }`}
          >
            <div className={`w-5 h-5 rounded-full ${audioEnabled ? 'bg-black' : 'bg-white'} shadow-sm`} />
          </div>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full p-4 bg-[#0E1017]/80 hover:bg-[#151923]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] flex items-center justify-between active:scale-[0.985] transition-all shadow-md cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10">
              {darkMode ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div className="text-left">
              <span className="text-sm font-bold text-white">Dim Floor Lighting Mode</span>
              <span className="text-xs text-white/50 font-normal block">
                {darkMode ? 'High contrast dark theme active' : 'Clean light mode'}
              </span>
            </div>
          </div>
          <div
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
              darkMode ? 'bg-white justify-end' : 'bg-white/20 justify-start'
            }`}
          >
            <div className={`w-5 h-5 rounded-full ${darkMode ? 'bg-black' : 'bg-white'} shadow-sm`} />
          </div>
        </button>

        {/* Bento Architecture Showcase Launcher */}
        {onOpenBentoShowcase && (
          <button
            onClick={() => {
              sounds.playTap();
              onOpenBentoShowcase();
            }}
            className="w-full p-4 bg-[#0E1017]/80 hover:bg-[#151923]/90 backdrop-blur-xl text-white rounded-2xl border border-white/[0.08] flex items-center justify-between active:scale-[0.985] transition-all shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/15">
                <Sparkles size={18} />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-white block">Bento Architecture Showcase</span>
                <span className="text-xs text-white/50 font-normal block">
                  Interactive component preview
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-white/80 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Preview →
            </span>
          </button>
        )}
      </div>

      {/* Safety Compliance & Reset */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
          Data & Compliance
        </h3>

        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs font-medium text-emerald-300">
          <Shield size={20} className="shrink-0 text-emerald-400" />
          <span>Warehouse safety credentials are active and verified.</span>
        </div>

        {/* Process Passport Builder Launcher */}
        {onOpenPassport && (
          <button
            onClick={() => {
              sounds.playTap();
              onOpenPassport();
            }}
            className="w-full p-4 bg-[#0E1017]/80 hover:bg-[#151923]/90 backdrop-blur-xl border border-white/[0.08] text-white rounded-2xl flex items-center justify-between active:scale-[0.985] transition-all cursor-pointer"
          >
            <div className="text-left">
              <span className="text-sm font-bold text-white block">Process Passport (P0/P1/P2)</span>
              <span className="text-xs text-white/50 font-normal block">
                Trainer review & sign-off basics sheet
              </span>
            </div>
            <span className="text-xs font-semibold text-white bg-white/10 px-3 py-1 rounded-full border border-white/15">
              Inspect →
            </span>
          </button>
        )}

        <button
          onClick={handleReset}
          className="w-full h-12 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-98 transition-all cursor-pointer"
        >
          {resetSuccess ? (
            <>
              <Check size={16} className="text-emerald-400" />
              <span className="text-emerald-300">Practice History Reset!</span>
            </>
          ) : (
            <>
              <RotateCcw size={16} /> Reset Practice Scores to Default
            </>
          )}
        </button>
      </div>
    </div>
  );
}
