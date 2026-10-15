import React, { useState } from 'react';
import { Slide } from '../types';
import { findBestVisualMatch } from '../../utils/visualLibraryMatcher';
import { Check } from 'lucide-react';
import { toSentenceCase } from '../tokens';

export const SectionIntroPage: React.FC<{
  slide: Slide;
  onNext?: () => void;
}> = ({ slide }) => {
  const isPrerequisiteChecklist =
    slide.sec?.toLowerCase().includes('before') ||
    slide.sec?.toLowerCase().includes('prep') ||
    slide.title?.toLowerCase().includes('ready') ||
    slide.title?.toLowerCase().includes('prereq');

  const secBadge = slide.sec || slide.tag || (isPrerequisiteChecklist ? 'Prerequisites' : 'Process Overview');

  // Process slide fl items dynamically from extracted SOP
  const rawItems: string[] = slide.fl || [];

  const items = rawItems.map((raw, idx) => {
    const parts = raw.split(/(?<!\d)[:\-\–](?!\d)\s*/);
    let title = '';
    let subtitle = '';

    if (parts.length > 1 && parts[0].trim().length < 50) {
      title = parts[0]?.trim();
      subtitle = parts.slice(1).join(' ').trim();
    } else {
      const words = raw.trim().split(/\s+/);
      if (words.length > 6) {
        title = words.slice(0, 5).join(' ');
        subtitle = words.slice(5).join(' ');
      } else {
        title = raw.trim();
        subtitle = isPrerequisiteChecklist
          ? 'Required prerequisite for this procedure.'
          : `Step ${idx + 1} operational directive.`;
      }
    }

    title = title.charAt(0).toUpperCase() + title.slice(1);
    subtitle = subtitle ? subtitle.charAt(0).toUpperCase() + subtitle.slice(1) : '';

    const itemMatch = findBestVisualMatch(raw, slide.title || '');
    const itemImg = itemMatch.url || '';

    return {
      title,
      subtitle,
      img: itemImg,
    };
  });

  // Track checked states for tapping each card
  const [checkedStates, setCheckedStates] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedStates((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const checkedCount = Object.values(checkedStates).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-5 select-none text-left">
      {/* 1. Header Card: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#22543D] font-semibold">{toSentenceCase(secBadge)}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{items.length} Items</span>
          {isPrerequisiteChecklist && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-[#22543D] font-medium">{checkedCount}/{items.length} Verified</span>
            </>
          )}
        </div>

        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title || (isPrerequisiteChecklist ? 'Preparation & Setup' : 'Process Stages'))}
        </h2>

        {slide.content && (
          <p className="text-xs sm:text-sm font-normal text-[#71717A] leading-relaxed pt-1">
            {toSentenceCase(slide.content)}
          </p>
        )}
      </div>

      {/* 2. Verification List: Clean stacked rows with subtle icon on left and right-aligned detail */}
      {items.length > 0 ? (
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const isChecked = checkedStates[idx];

            return (
              <div
                key={idx}
                onClick={isPrerequisiteChecklist ? () => toggleCheck(idx) : undefined}
                className={`p-4 sm:p-5 rounded-[22px] transition-all duration-200 flex items-start gap-3.5 border ${
                  isPrerequisiteChecklist ? 'cursor-pointer' : ''
                } ${
                  isChecked
                    ? 'bg-[#EDF5F0] border-[#D1E7DD] shadow-[0px_4px_16px_rgba(0,0,0,0.02)]'
                    : 'bg-white border-black/[0.04] hover:border-black/[0.08] shadow-[0px_4px_20px_rgba(0,0,0,0.02)]'
                }`}
              >
                {/* Subtle minimalist icon on left (checkbox or clean geometric outline) */}
                {isPrerequisiteChecklist ? (
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'bg-[#22543D] border-[#22543D] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 shrink-0 mt-1.5" />
                )}

                {/* Title & Subtitle */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] leading-snug">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-[11px] sm:text-xs text-[#71717A] leading-relaxed mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                {/* Right-aligned secondary detail */}
                <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5">
                  {isChecked ? 'Verified' : isPrerequisiteChecklist ? 'Tap to verify' : `Stage ${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-[24px] bg-white border border-black/[0.04] text-center text-[#71717A] text-xs shadow-[0px_8px_30px_rgba(0,0,0,0.04)]">
          {slide.content || 'Review the procedural details in the upcoming steps.'}
        </div>
      )}
    </div>
  );
};
