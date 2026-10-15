import React from 'react';
import { Slide } from '../types';
import { ShieldCheck, ChevronRight } from 'lucide-react';

export const WelcomePage: React.FC<{
  slide: Slide;
  onNext: () => void;
  slideIndex?: number;
  totalSlides?: number;
  onClose?: () => void;
}> = ({ slide, onNext, slideIndex = 0, totalSlides = 1, onClose }) => {
  const role = slide.role ? `Role: ${slide.role.replace(/^role:\s*/i, '')}` : 'Standard Operating Procedure';
  const body = slide.content || 'Interactive operational procedure walkthrough and key concepts review.';
  const tagBadge = slide.tag || 'Module Overview';
  const ctaText = slide.cta || "Let's Begin";

  return (
    <div className="hero flex flex-col justify-end p-6 h-full relative overflow-hidden bg-gradient-to-b from-[#162554] via-[#111c40] to-[#0a1026] text-white">
      {/* Translucent background curves/glows */}
      <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_85%_18%,rgba(90,110,255,0.4),transparent)] pointer-events-none" />
      
      {/* Dynamic Integrated Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-4 z-20 pointer-events-none">
        <div className="w-20 shrink-0 pointer-events-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all text-white font-bold text-xs"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
          )}
        </div>
        
        {/* Centered pill badge */}
        <div className="flex-1 flex justify-center">
          <span className="bg-[#e0e7ff] text-[#3730a3] border border-indigo-200 text-[11px] font-extrabold tracking-wide px-3.5 py-1.5 rounded-full shadow-xs">
            {tagBadge}
          </span>
        </div>

        {/* Right page counter */}
        <div className="w-12 flex justify-end shrink-0">
          <span className="text-xs font-black text-indigo-200 bg-[#0a1026]/40 border border-indigo-500/20 px-2.5 py-1 rounded-md">
            {slideIndex + 1} / {totalSlides}
          </span>
        </div>
      </div>

      {/* Center Neutral Operational Shield Graphic */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none z-0">
        <svg viewBox="0 0 100 100" className="w-36 h-36 text-white" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 12 L85 28 V52 C85 74 50 90 50 90 C50 90 15 74 15 52 V28 Z" />
          <path d="M38 50 L46 58 L64 40" strokeWidth="3" />
        </svg>
      </div>

      {/* Slide Content positioned at bottom-left */}
      <div className="relative z-10 flex flex-col gap-3 select-none text-left">
        {/* Module Overview capsule badge */}
        <div className="inline-flex items-center self-start px-3.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-black uppercase tracking-widest text-indigo-200 backdrop-blur-xs mb-1">
          {tagBadge}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white mb-0.5">
          {slide.title || 'Standard Operating Procedure'}
        </h1>

        {/* Role */}
        <div className="text-sm sm:text-base font-extrabold text-indigo-300 tracking-wide">
          {role}
        </div>

        {/* Content body description */}
        <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed max-w-sm mb-4">
          {body}
        </p>

        {/* Dynamic CTA Button */}
        <button
          onClick={onNext}
          className="cta flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-lg transition-transform hover:scale-105 select-none self-start cursor-pointer border-0"
        >
          {ctaText}
          <ChevronRight className="w-4 h-4 text-white stroke-[3]" />
        </button>
      </div>
    </div>
  );
};

