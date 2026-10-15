import React, { useState } from 'react';
import { ChevronLeft, BookOpen, Bookmark } from 'lucide-react';
import { Lesson } from '../types';
import { sounds } from '../utils/audio';

interface LessonOverviewProps {
  lesson: Lesson;
  onBack: () => void;
  onOpenIntroDeck: () => void;
  onStartSimulation: (phase: number) => void;
  onOpenVideoDemo?: () => void;
  onAskTrainer?: () => void;
}

export default function LessonOverview({
  lesson,
  onBack,
  onOpenIntroDeck,
  onStartSimulation,
  onOpenVideoDemo,
  onAskTrainer,
}: LessonOverviewProps) {
  const [bookmarked, setBookmarked] = useState(false);

  // Dynamic color configuration based on lesson color scheme
  const getThemeColors = () => {
    switch (lesson.color) {
      case 'mint':
        return {
          bgClass: 'bg-[#ECFDF5]',
          blob1: 'bg-[#A7F3D0]',
          blob2: 'bg-[#6EE7B7]',
          blob3: 'bg-[#C6F6D5]',
          blob4: 'bg-[#A5F3FC]',
          textAccent: 'text-emerald-600',
          borderAccent: 'border-emerald-500/20',
          accentGradient: 'from-emerald-500/10 to-teal-500/10',
          primaryAccent: '#10B981',
        };
      case 'peach':
        return {
          bgClass: 'bg-[#FFF7ED]',
          blob1: 'bg-[#FFEDD5]',
          blob2: 'bg-[#FDBA74]',
          blob3: 'bg-[#FECACA]',
          blob4: 'bg-[#FED7AA]',
          textAccent: 'text-orange-600',
          borderAccent: 'border-orange-500/20',
          accentGradient: 'from-orange-500/10 to-amber-500/10',
          primaryAccent: '#F97316',
        };
      case 'lilac':
        return {
          bgClass: 'bg-[#F5F3FF]',
          blob1: 'bg-[#DDD6FE]',
          blob2: 'bg-[#C4B5FD]',
          blob3: 'bg-[#F5D0FE]',
          blob4: 'bg-[#E9D5FF]',
          textAccent: 'text-purple-600',
          borderAccent: 'border-purple-500/20',
          accentGradient: 'from-purple-500/10 to-indigo-500/10',
          primaryAccent: '#7C3AED',
        };
      case 'sky':
      default:
        return {
          bgClass: 'bg-[#E0F2FE]',
          blob1: 'bg-[#C7D2FE]',
          blob2: 'bg-[#D8B4FE]',
          blob3: 'bg-[#A5F3FC]',
          blob4: 'bg-[#FFD3C4]',
          textAccent: 'text-indigo-600',
          borderAccent: 'border-indigo-500/20',
          accentGradient: 'from-indigo-500/10 to-blue-500/10',
          primaryAccent: '#2563EB',
        };
    }
  };

  const themeColors = getThemeColors();

  const learningPath = [
    {
      id: 'training-deck',
      title: 'Learn the flow',
      subtitle: 'Interactive workflow',
      hoverBorder: 'hover:border-sky-500/30',
      action: () => onOpenIntroDeck(),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-sky-400 drop-shadow-[0_2px_10px_rgba(56,189,248,0.35)]"
        >
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M12 7.5v3.5" />
          <path d="M12 11c0 3-6 3.5-6 4.5" />
          <path d="M12 11c0 3 6 3.5 6 4.5" />
        </svg>
      ),
    },
    {
      id: 'show-me',
      title: 'See the action',
      subtitle: 'Visual walkthrough',
      hoverBorder: 'hover:border-purple-500/30',
      action: () => (onOpenVideoDemo ? onOpenVideoDemo() : onStartSimulation(0)),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-purple-400 drop-shadow-[0_2px_10px_rgba(192,132,252,0.35)]"
        >
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M3 17v2a2 2 0 0 0 2 2h2" />
          <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
          <circle cx="12" cy="12" r="1.8" />
          <path d="M7.5 12c1.2-2.3 3-3.3 4.5-3.3s3.3 1 4.5 3.3c-1.2 2.3-3 3.3-4.5 3.3s-3.3-1-4.5-3.3Z" />
        </svg>
      ),
    },
    {
      id: 'guide-me',
      title: 'Make the decision',
      subtitle: 'Interactive scenario',
      hoverBorder: 'hover:border-amber-500/30',
      action: () => onStartSimulation(1),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.35)]"
        >
          <circle cx="7" cy="6" r="2.5" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M7 8.5v6.5a3.5 3.5 0 0 0 3.5 3.5c2 0 3.5-1.5 3.5-3.5v-2.5" />
        </svg>
      ),
    },
    {
      id: 'test-me',
      title: 'Prove capability',
      subtitle: 'Independent assessment',
      hoverBorder: 'hover:border-emerald-500/30',
      action: () => onStartSimulation(2),
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7 text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.35)]"
        >
          <path d="M18 6 7 17l-5-5" />
          <path d="m22 10-7.5 7.5L13 16" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black text-white flex flex-col overflow-y-auto animate-in fade-in duration-200 p-6 sm:p-8 font-sans select-none">
      
      {/* 1. Pure Apple Black Minimal Ambient Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <div className="relative w-full flex flex-col z-10 max-w-md mx-auto">
        
        {/* 2. Header Navigation Bar */}
        <div className="flex justify-between items-center w-full relative z-10">
          <button
            onClick={() => {
              sounds.playTap();
              onBack();
            }}
            className="w-10 h-10 rounded-full border border-white/15 bg-white/10 flex items-center justify-center text-white shadow-xs hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-2">
            {onAskTrainer && (
              <button
                onClick={() => {
                  sounds.playTap();
                  onAskTrainer();
                }}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white hover:bg-white/20 transition-all shadow-xs cursor-pointer"
              >
                Ask Trainer
              </button>
            )}
            <button
              onClick={() => {
                sounds.playTap();
                setBookmarked(!bookmarked);
              }}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/10 flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer hover:bg-white/20 text-white"
              aria-label="Bookmark"
            >
              <Bookmark size={18} className={bookmarked ? 'fill-current text-indigo-400' : ''} />
            </button>
          </div>
        </div>

        {/* 3. Hero Header Section */}
        <div className="flex items-center justify-between gap-4 pt-8 pb-6 border-b border-white/10 relative z-10">
          <div className="flex-1 space-y-2">
            {/* Steps Count Badge */}
            <div className="flex items-center gap-1.5 text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
              <BookOpen size={14} className="stroke-[2.5]" />
              <span>{lesson.stepsCount} verified steps</span>
            </div>

            {/* Apple style gradient heading */}
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#60A5FA] via-[#C084FC] to-[#F472B6] bg-clip-text text-transparent tracking-tight leading-tight pb-0.5">
              {lesson.title}
            </h1>

            <p className="text-slate-300/80 font-normal text-xs sm:text-sm leading-relaxed max-w-xs">
              {lesson.description || 'Ensure a safe, welcoming environment for every guest through our 5-step sanitization protocol.'}
            </p>
          </div>

          {/* Right-side Koala Coach circular profile */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#161C2C] border border-white/15 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl">
            <img
              src="/Coachguru.png"
              alt="Guruji Koala Coach"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain transform translate-y-2 scale-110 drop-shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/guruji 1.png";
              }}
            />
          </div>
        </div>

        {/* 4. Interactive 2x2 Format Options Grid with subtle icon colors */}
        <div className="grid grid-cols-2 gap-4 pt-6 mt-2 relative z-10">
          {learningPath.map((item) => {
            return (
              <button
                key={item.id}
                onClick={() => {
                  sounds.playTap();
                  item.action();
                }}
                className={`relative overflow-hidden min-h-[195px] sm:min-h-[205px] rounded-[28px] bg-[#0E1017] border border-white/[0.08] p-6 flex flex-col justify-between items-start text-left active:scale-[0.98] ${item.hoverBorder} hover:bg-[#131620] transition-all duration-200 cursor-pointer group shadow-xl`}
              >
                {/* Top: Freestanding icon with subtle Apple color tint */}
                <div className="group-hover:scale-105 transition-transform duration-200">
                  {item.icon}
                </div>

                {/* Bottom: Title & Subtitle */}
                <div className="mt-auto pt-5 relative z-10">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#7E8796] font-normal mt-1 leading-snug">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
