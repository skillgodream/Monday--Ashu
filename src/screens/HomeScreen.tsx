import React from 'react';
import { Upload, Camera, Sparkles, ArrowRight, ShieldCheck, FileText, Play } from 'lucide-react';
import { Lesson } from '../types';
import { sounds } from '../utils/audio';

interface HomeScreenProps {
  lessons: Lesson[];
  onScanClick: () => void;
  onUploadClick: () => void;
  onSelectSop: (lessonId: string, title?: string) => void;
  onExploreLibrary: () => void;
  onOpenPassport: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  lessons,
  onScanClick,
  onUploadClick,
  onSelectSop,
  onExploreLibrary,
  onOpenPassport,
}) => {
  return (
    <div className="flex-1 flex flex-col px-4 pt-4 pb-28 space-y-5 max-w-lg mx-auto w-full animate-in fade-in duration-200">
      
      {/* 1. Hero Field Trainer Card with Guruji Avatar & Quick Actions (matching user's screenshot) */}
      <div className="relative overflow-hidden rounded-[32px] bg-[#12151E]/90 border border-white/10 p-6 text-white shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center space-y-4">
        
        {/* Ambient Specular Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mascot Container */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center pt-2">
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
          <img
            src="/Coachguru.png"
            alt="Guruji AI Trainer"
            className="w-full h-full object-contain relative z-10 drop-shadow-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/guruji 1.png";
            }}
          />
        </div>

        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Meet Guruji - AI Trainer
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5 max-w-xs">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Field Trainer
          </h1>
          <p className="text-xs text-slate-300 font-normal leading-relaxed">
            Upload an SOP to convert it into interactive micro-learning modules with Guruji.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5 pt-2">
          {/* Primary CTA: Upload SOP */}
          <button
            onClick={() => {
              sounds.playTap();
              onUploadClick();
            }}
            className="w-full h-12 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.98] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Upload size={18} className="text-black" />
            <span>Upload SOP (PDF / DOCX)</span>
          </button>

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                sounds.playTap();
                if (lessons.length > 0) {
                  onSelectSop(lessons[0].id, lessons[0].title);
                }
              }}
              className="h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play size={15} className="text-emerald-400" />
              <span>Try Demo SOP</span>
            </button>

            <button
              onClick={() => {
                sounds.playTap();
                onScanClick();
              }}
              className="h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera size={15} className="text-sky-400" />
              <span>Scan SOP</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Verified Domain SOPs / Training Decks */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Verified Domain SOPs
          </h2>
          <button
            onClick={() => {
              sounds.playTap();
              onExploreLibrary();
            }}
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div className="space-y-2.5">
          {lessons.slice(0, 4).map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => {
                sounds.playTap();
                onSelectSop(lesson.id, lesson.title);
              }}
              className="group flex items-center justify-between p-4 bg-[#12151E]/80 hover:bg-[#1A1E2C]/90 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 shadow-md active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-white flex items-center justify-center shrink-0 font-black text-sm group-hover:scale-105 transition-transform">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                      {lesson.category}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {lesson.stepsCount || 6} Steps
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mt-0.5">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {lesson.subtitle || lesson.description}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-all ml-2">
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Process Passport Review Banner */}
      <div
        onClick={() => {
          sounds.playTap();
          onOpenPassport();
        }}
        className="p-4 bg-[#12151E]/80 hover:bg-[#1A1E2C]/90 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-amber-400 flex items-center justify-center font-bold">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Process Passport Audit</h4>
            <p className="text-[11px] text-slate-400">Review operational controls & safety rules</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
          Review →
        </span>
      </div>

    </div>
  );
};

