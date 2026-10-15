import React from 'react';
import { Slide } from '../types';
import { Check } from 'lucide-react';
import { toSentenceCase } from '../tokens';

export const CompletionPage: React.FC<{
  slide: Slide;
  onNext: () => void;
}> = ({ slide, onNext }) => {
  const nextTitle = slide.next || 'Next: Practical Application';
  const nextSubtitle = slide.nb || 'Continue to visual demonstration and guided practice.';

  return (
    <div className="flex flex-col items-center justify-center text-center h-full p-4 sm:p-6 select-none my-auto space-y-6">
      {/* 1. Subtle, Minimalist Completion Icon: Soft Sage Circle with crisp check */}
      <div className="w-16 h-16 rounded-full bg-[#EDF5F0] border border-[#D1E7DD] flex items-center justify-center text-[#22543D] shadow-[0px_4px_16px_rgba(34,84,61,0.08)]">
        <Check className="w-8 h-8 stroke-[2.5]" />
      </div>

      {/* 2. Slide Title & Metadata */}
      <div className="space-y-1.5 max-w-sm">
        <span className="text-xs font-semibold text-[#22543D] uppercase tracking-wider">
          Module Overview Complete
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight leading-tight">
          {toSentenceCase(slide.title || 'Training Completed')}
        </h2>
        <p className="text-xs sm:text-sm font-normal text-[#71717A] leading-relaxed pt-1">
          {toSentenceCase(
            slide.content || "You've successfully reviewed the operational logic and safety standards."
          )}
        </p>
      </div>

      {/* 3. Next Action Sub-Card: Pure white card with soft diffused shadow */}
      <div className="w-full max-w-sm bg-white rounded-[24px] p-5 border border-black/[0.04] shadow-[0px_8px_30px_rgba(0,0,0,0.04)] text-left space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#4B5EAA] uppercase tracking-wider">
            Recommended Next Step
          </span>
          <span className="text-[11px] font-medium text-[#71717A]">Guided</span>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
          {toSentenceCase(nextTitle)}
        </h3>

        <p className="text-xs text-[#71717A] leading-relaxed">
          {toSentenceCase(nextSubtitle)}
        </p>
      </div>
    </div>
  );
};
