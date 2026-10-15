import React from 'react';
import { X, Clock, UserCheck, ArrowRight, Compass, Zap, Target, Sparkles } from 'lucide-react';
import { Lesson, ExperienceLevel } from '../types';
import ClayArt from './ClayArt';
import { sounds } from '../utils/audio';

interface WelcomeJourneyModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: ExperienceLevel) => void;
  onAskTrainer: () => void;
}

export default function WelcomeJourneyModal({
  lesson,
  isOpen,
  onClose,
  onSelectLevel,
  onAskTrainer,
}: WelcomeJourneyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-gradient-to-b from-white via-slate-50/80 to-white rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 shadow-[0_24px_70px_rgba(15,23,42,0.35)] border border-white/80 space-y-6 relative overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Subtle Ambient Background Halo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-b from-indigo-200/40 via-purple-100/20 to-transparent blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/70 pb-3.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 border border-slate-200/80 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold tracking-tight text-slate-700 uppercase">
              Onboarding Journey
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playTap();
                onAskTrainer();
              }}
              className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            >
              <UserCheck size={13} className="text-emerald-600" />
              <span>Ask trainer</span>
            </button>
            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hero Visual & Pedestal */}
        <div className="text-center space-y-3 relative z-10 pt-1">
          {/* Volumetric Glowing Hero Container */}
          <div className="relative inline-block mx-auto">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 blur-xl opacity-20 transform scale-110" />
            <div className="w-22 h-22 rounded-[28px] bg-gradient-to-br from-indigo-50 via-white to-sky-100 border border-white/90 shadow-[0_12px_30px_rgba(79,70,229,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center relative z-10">
              <ClayArt type={lesson.artType} size={68} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome to {lesson.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-xs mx-auto mt-1.5 leading-relaxed">
              {lesson.description}
            </p>
          </div>

          {/* Time Estimate Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs backdrop-blur-sm">
            <Clock size={13} className="text-amber-500" />
            <span>~{lesson.durationMinutes || 8} min total training</span>
          </div>
        </div>

        {/* Starting Point Cards Section */}
        <div className="space-y-3 relative z-10 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Choose Your Starting Point:
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Tap one to begin</span>
          </div>

          {/* Option 1: New */}
          <button
            onClick={() => {
              sounds.playTap();
              onSelectLevel('new');
            }}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-sky-50/90 via-white to-white border border-sky-200/80 hover:border-sky-400 text-left flex items-center justify-between shadow-[0_4px_20px_rgba(14,165,233,0.06)] hover:shadow-[0_8px_30px_rgba(14,165,233,0.12)] active:scale-[0.985] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
                <Compass size={20} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                  New to this SOP
                </span>
                <span className="text-xs font-medium text-slate-500 block mt-0.5">
                  Start with Training deck cards & tool explorer
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 group-hover:translate-x-0.5 transition-all shadow-2xs">
              <ArrowRight size={15} />
            </div>
          </button>

          {/* Option 2: Some */}
          <button
            onClick={() => {
              sounds.playTap();
              onSelectLevel('some');
            }}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-emerald-50/90 via-white to-white border border-emerald-200/80 hover:border-emerald-400 text-left flex items-center justify-between shadow-[0_4px_20px_rgba(16,185,129,0.06)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] active:scale-[0.985] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <Zap size={20} />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-emerald-600 transition-colors">
                  Some Experience
                </span>
                <span className="text-xs font-medium text-slate-500 block mt-0.5">
                  Quick refresher cards then jump into Coach Demo
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-300 group-hover:translate-x-0.5 transition-all shadow-2xs">
              <ArrowRight size={15} />
            </div>
          </button>

          {/* Option 3: Experienced (Gold Highlighted Card) */}
          <button
            onClick={() => {
              sounds.playTap();
              onSelectLevel('experienced');
            }}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-50/40 to-white border-2 border-amber-300/90 hover:border-amber-500 text-left flex items-center justify-between shadow-[0_6px_25px_rgba(245,158,11,0.12)] hover:shadow-[0_10px_35px_rgba(245,158,11,0.2)] active:scale-[0.985] transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                <Target size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Experienced
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 rounded-full shadow-xs">
                    Fast-Track Check
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-600 block mt-0.5">
                  Take 4-question check (≥75% skips cards directly to Demo)
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center group-hover:scale-105 group-hover:translate-x-0.5 transition-all shadow-xs shrink-0">
              <ArrowRight size={15} className="stroke-[2.5]" />
            </div>
          </button>
        </div>

        {/* Protection Microcopy Note */}
        <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed pt-1 border-t border-slate-200/60">
          New / Some / Experienced is only a start-point choice. The system never labels you.
        </p>
      </div>
    </div>
  );
}

