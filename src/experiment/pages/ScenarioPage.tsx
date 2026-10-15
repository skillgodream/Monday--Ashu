import React from 'react';
import { Slide } from '../types';
import { ImageSlot, toSentenceCase } from '../tokens';

export const ScenarioPage: React.FC<{
  slide: Slide;
  onNext?: () => void;
}> = ({ slide }) => {
  return (
    <div className="flex flex-col gap-5 select-none text-left">
      {/* 1. Header Card: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#4B5EAA] font-semibold">{toSentenceCase(slide.tag || 'Workplace Scenario')}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Field Simulation</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>On-the-Floor Context</span>
        </div>

        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title || 'Operational Scenario')}
        </h2>
      </div>

      {/* 2. Visual Media Container */}
      {slide.img && (
        <div className="rounded-[24px] overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] bg-white">
          <ImageSlot src={slide.img} alt={slide.title} textContext={slide.title} />
        </div>
      )}

      {/* 3. Scenario Narrative Card: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2.5">
        <span className="text-xs font-semibold text-[#71717A]">Scenario Situation</span>
        <p className="text-xs sm:text-sm font-medium text-[#2D2D2D] leading-relaxed">
          {toSentenceCase(slide.content || 'Review the operational situation carefully before making your frontline decision.')}
        </p>
      </div>
    </div>
  );
};
