import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface SlideFrameProps {
  children: React.ReactNode;
  currentIndex: number;
  totalSlides: number;
  onBack: () => void;
  onNext: () => void;
  showBack: boolean;
}

export const SlideFrame: React.FC<SlideFrameProps> = ({ 
  children, currentIndex, totalSlides, onBack, onNext, showBack 
}) => {
  const progressPercent = Math.round(((currentIndex + 1) / totalSlides) * 100);

  return (
    <div className="flex flex-col h-screen w-full bg-[#F4F4F6] text-[#1A1A1A]">
      {/* Subtle, Thin Horizontal Progress Track at the top */}
      <div className="h-0.5 w-full bg-[#ECECF0]">
        <div
          className="h-full bg-[#1E293B] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 no-scrollbar">
        {children}
      </div>

      {/* Navigation Row */}
      <div className="h-20 bg-white border-t border-black/[0.04] flex items-center justify-between px-6 shrink-0 shadow-[0px_-4px_20px_rgba(0,0,0,0.02)]">
        <button 
          onClick={onBack}
          disabled={!showBack}
          className="px-4 py-2 text-sm font-semibold text-[#71717A] hover:text-[#1A1A1A] disabled:opacity-0 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-xs font-semibold text-[#71717A]">
          <span className="text-[#1A1A1A] font-bold">Step {currentIndex + 1}</span> of {totalSlides}
        </div>

        <button 
          onClick={onNext}
          className="min-h-[44px] px-8 py-2.5 rounded-full bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold text-sm shadow-[0px_4px_16px_rgba(30,41,59,0.12)] cursor-pointer transition-all active:scale-98"
        >
          {currentIndex === totalSlides - 1 ? 'Complete' : 'Next Step'}
        </button>
      </div>
    </div>
  );
};
