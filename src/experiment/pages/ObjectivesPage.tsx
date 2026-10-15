import React from 'react';
import { Slide } from '../types';
import { toSentenceCase } from '../tokens';

export const ObjectivesPage: React.FC<{
  slide: Slide;
  onNext?: () => void;
}> = ({ slide }) => {
  const lead = slide.lead || 'By the end of this module, you will be able to:';

  let items = slide.items;
  if (!items || items.length === 0) {
    items = (slide.content || '')
      .split('\n')
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);
  }

  const finalItems = items.slice(0, 4);

  return (
    <div className="flex flex-col gap-5 select-none text-left">
      {/* 1. Header Card: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#4B5EAA] font-semibold">{toSentenceCase(slide.tag || 'Learning Objectives')}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{finalItems.length} Core Outcomes</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>SOP Competencies</span>
        </div>

        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title || 'What you will master')}
        </h2>

        <p className="text-xs sm:text-sm font-normal text-[#71717A] leading-relaxed pt-1">
          {toSentenceCase(lead)}
        </p>
      </div>

      {/* 2. Objectives List: Clean stacked rows with subtle geometric icon on left and right-aligned detail */}
      <div className="space-y-2.5">
        {finalItems.map((item, index) => (
          <div
            key={index}
            className="p-4 sm:p-5 rounded-[22px] bg-white border border-black/[0.04] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex items-start gap-3.5 hover:border-black/[0.08] transition-colors"
          >
            {/* Subtle minimalist geometric outline shape on the left */}
            <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 shrink-0 mt-1.5" />

            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] leading-relaxed">
                {toSentenceCase(item)}
              </h3>
            </div>

            <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5">
              Goal {index + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
