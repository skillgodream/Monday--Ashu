import React, { useState } from 'react';
import { X, Volume2, UserCheck, BookOpen, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { MICRO_LESSONS } from '../data/lessonsData';
import { sounds } from '../utils/audio';

interface MicroLessonSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBasics: () => void;
  onAskTrainer: () => void;
}

export default function MicroLessonSheet({
  isOpen,
  onClose,
  onOpenBasics,
  onAskTrainer,
}: MicroLessonSheetProps) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeLesson = MICRO_LESSONS.find((m) => m.id === activeLessonId);

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1116]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <HelpCircle size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#D97706] block">
                On The Floor Quick Help
              </span>
              <h3 className="text-base font-bold text-[#0E1116]">Stuck? Ask Guruji</h3>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#0E1116]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Active 1-2 Minute Micro-lesson if selected */}
        {activeLesson ? (
          <div className="p-4 rounded-2xl bg-[#DDF3E6] border border-[#1FA55E]/40 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#14532D]">{activeLesson.title}</span>
              <span className="text-[10px] font-bold text-white bg-[#1FA55E] px-2 py-0.5 rounded-full">
                {activeLesson.duration}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#166534] leading-relaxed">
              {activeLesson.summary}
            </p>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  sounds.playTap();
                  sounds.speak(`${activeLesson.title}. ${activeLesson.summary}`);
                }}
                className="flex-1 py-2 rounded-xl bg-white text-[#14532D] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Volume2 size={14} /> Listen Aloud
              </button>
              <button
                onClick={() => setActiveLessonId(null)}
                className="px-3 py-2 rounded-xl border border-emerald-300 text-[#14532D] font-bold text-xs"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-[#66726B]">
              Pick a 1 to 2 minute micro-lesson for your immediate task:
            </p>
            {MICRO_LESSONS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  sounds.playTap();
                  setActiveLessonId(m.id);
                }}
                className="w-full p-3 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] hover:border-[#0E1116] text-left flex items-center justify-between active:scale-[0.985] transition-all cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-[#0E1116] block">{m.title}</span>
                  <span className="text-[10px] font-semibold text-[#66726B] block mt-0.5 truncate max-w-[260px]">
                    {m.summary}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-[#2F6FED]">{m.duration}</span>
                  <ChevronRight size={14} className="text-[#66726B]" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Always Accessible Actions: Re-open Basics & Ask Trainer */}
        <div className="pt-2 border-t border-[#E6E8EC] space-y-2">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
              onOpenBasics();
            }}
            className="w-full h-12 rounded-full border border-[#E6E8EC] bg-white text-[#0E1116] font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-98 transition-all"
          >
            <BookOpen size={16} className="text-[#2F6FED]" /> Re-Open Training deck (Reference)
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              onClose();
              onAskTrainer();
            }}
            className="w-full h-12 rounded-full bg-[#10243A] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md"
          >
            <UserCheck size={16} className="text-emerald-400" /> Handoff to Floor Trainer
          </button>
        </div>
      </div>
    </div>
  );
}
