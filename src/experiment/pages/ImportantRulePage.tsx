import React from 'react';
import { Slide } from '../types';
import { ImageSlot, toSentenceCase } from '../tokens';

export const ImportantRulePage: React.FC<{
  slide: Slide;
  onNext?: () => void;
}> = ({ slide }) => {
  let why =
    slide.why ||
    slide.gurujiCoaching?.whyItMatters ||
    'Mandatory procedure requirement. Adhere strictly to verified operational standards.';

  if (slide.title && why.trim().toLowerCase() === slide.title.trim().toLowerCase()) {
    why = 'Non-negotiable operational standard: skipping this verification leads to procedural errors and compliance discrepancies.';
  }

  return (
    <div className="flex flex-col gap-5 select-none text-left">
      {/* 1. Header Card: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#6B2D38] font-semibold">{toSentenceCase(slide.tag || 'Critical Control')}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Zero-Tolerance Rule</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Compliance Gate</span>
        </div>

        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title || 'Mandatory Safety & Compliance Control')}
        </h2>
      </div>

      {/* 2. Visual Media Container if available */}
      {slide.img && (
        <div className="rounded-[24px] overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] bg-white">
          <ImageSlot src={slide.img} alt={slide.title} textContext={slide.title} />
        </div>
      )}

      {/* 3. Rule Rationale Card: Soft Dusty Rose Pastel Accent */}
      <div className="bg-[#FDF2F4] rounded-[24px] p-5 sm:p-6 border border-[#F8D7DD] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#6B2D38] uppercase tracking-wider">
            Operational Requirement
          </span>
          <span className="text-[10px] font-semibold text-[#6B2D38] bg-white/70 px-2.5 py-0.5 rounded-full border border-[#F8D7DD]">
            Mandatory
          </span>
        </div>

        <p className="text-sm sm:text-base font-bold text-[#1A1A1A] leading-relaxed">
          {toSentenceCase(slide.title)}
        </p>

        <div className="pt-2 border-t border-[#F8D7DD]/60">
          <span className="text-xs font-semibold text-[#6B2D38] block mb-1">
            Why this rule cannot be bypassed:
          </span>
          <p className="text-xs sm:text-sm font-normal text-[#2D2D2D] leading-relaxed">
            {toSentenceCase(why)}
          </p>
        </div>
      </div>
    </div>
  );
};
