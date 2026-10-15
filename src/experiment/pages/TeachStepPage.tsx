import React from 'react';
import { Slide } from '../types';
import { ImageSlot, toSentenceCase } from '../tokens';

export const TeachStepPage: React.FC<{
  slide: Slide;
  onNext?: () => void;
}> = ({ slide }) => {
  const stepLabel = slide.step || slide.tag || 'Standard Procedure';

  // 1. Extract raw items from slide.items or slide.content
  let rawItems: string[] = [];
  if (slide.items && slide.items.length > 0) {
    rawItems = [...slide.items];
  } else if (slide.content) {
    rawItems = slide.content
      .split('\n')
      .map((l) => l.replace(/^[\*\-•\d\.]\s*/, '').trim())
      .filter(Boolean);
  }

  // 2. Extract or categorize fields for instructions, rationale, and tips
  let actionText = '';
  let whyText = slide.why || '';
  let tipText = slide.nb || '';
  const actionChecklist: string[] = [];
  const decisionTriggers: Array<{ situation: string; action: string }> = [];

  rawItems.forEach((item, idx) => {
    const itemLower = item.toLowerCase();
    if (item.includes('→')) {
      const [situation, action] = item.split('→').map((s) => s.trim());
      decisionTriggers.push({ situation, action });
      return;
    }

    if (
      itemLower.startsWith('why it matters:') ||
      itemLower.startsWith('why:') ||
      itemLower.startsWith('rationale:') ||
      itemLower.startsWith('reason:')
    ) {
      whyText = item.replace(/^(why it matters:|why:|rationale:|reason:)\s*/i, '');
    } else if (
      itemLower.startsWith('tip:') ||
      itemLower.startsWith('pro tip:') ||
      itemLower.startsWith('coach tip:') ||
      itemLower.startsWith('watch-out:') ||
      itemLower.startsWith('field tip:') ||
      itemLower.startsWith('note:')
    ) {
      tipText = item.replace(/^(tip:|pro tip:|coach tip:|watch-out:|field tip:|note:)\s*/i, '');
    } else if (idx === 0 && !actionText) {
      actionText = item;
    } else if (idx === 1 && !whyText) {
      whyText = item;
    } else if (idx === 2 && !tipText) {
      tipText = item;
    } else {
      actionChecklist.push(item);
    }
  });

  // Fallback for action text
  if (!actionText) {
    actionText = slide.lead || slide.title || 'Execute the standard operational step according to procedure.';
  }

  return (
    <div className="flex flex-col gap-5 select-none text-left">
      {/* 1. Header Section: Prominent section headline followed by crisp horizontal metadata */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        {/* Horizontal Metadata Row with clean typographic separation */}
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#3F377A] font-semibold">{toSentenceCase(stepLabel)}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Verified Standard</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Mandatory Execution</span>
        </div>

        {/* Prominent Bold Section Header */}
        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title)}
        </h2>
      </div>

      {/* 2. Rich Media Integration: Placeholders/containers clipping imagery with matching rounded corners */}
      {slide.img && (
        <div className="rounded-[24px] overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] bg-white">
          <ImageSlot src={slide.img} alt={slide.title} textContext={slide.title} />
        </div>
      )}

      {/* 3. Primary Instruction Card: Clean White Card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#71717A]">Primary Directive</span>
          <span className="text-[11px] font-medium text-[#22543D] bg-[#EDF5F0] px-2.5 py-0.5 rounded-full border border-[#D1E7DD]">
            Required
          </span>
        </div>

        <p className="text-base sm:text-[17px] font-bold text-[#1A1A1A] leading-relaxed">
          {toSentenceCase(actionText)}
        </p>
      </div>

      {/* 4. Action Verification List Items: Clean list design with subtle icon on left, title, and right detail */}
      {actionChecklist.length > 0 && (
        <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-[#71717A]">Verification Steps</span>
            <span className="text-xs text-[#71717A] font-medium">{actionChecklist.length} tasks</span>
          </div>

          <div className="space-y-2">
            {actionChecklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-3.5 rounded-[18px] bg-[#F4F4F6] border border-black/[0.03] hover:bg-[#EAEAF0]/60 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Subtle minimalist geometric outline shape on the left */}
                  <div className="w-4 h-4 rounded-full border-2 border-slate-400/80 shrink-0 mt-0.5 flex items-center justify-center" />
                  <span className="text-xs sm:text-sm font-semibold text-[#2D2D2D] leading-relaxed">
                    {toSentenceCase(item)}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5 pl-2">
                  Step {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Sub-Cards: Operational Rationale & Practical Guidance with muted pastel accents */}
      {(whyText || tipText) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Sub-Card 1: Operational Rationale (Soft Sage Pastel Accent) */}
          {whyText && (
            <div className="bg-[#EDF5F0] rounded-[24px] p-5 border border-[#D1E7DD] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#22543D]">Operational Rationale</span>
                <span className="text-[10px] font-semibold text-[#22543D] uppercase tracking-wider">Quality</span>
              </div>
              <p className="text-xs sm:text-[13px] font-medium text-[#2D2D2D] leading-relaxed">
                {toSentenceCase(whyText)}
              </p>
            </div>
          )}

          {/* Sub-Card 2: Practical Guidance (Soft Lavender Pastel Accent) */}
          {tipText && (
            <div className="bg-[#F3F1FB] rounded-[24px] p-5 border border-[#E4E0F7] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3F377A]">Field Practice</span>
                <span className="text-[10px] font-semibold text-[#3F377A] uppercase tracking-wider">Guidance</span>
              </div>
              <p className="text-xs sm:text-[13px] font-medium text-[#2D2D2D] leading-relaxed">
                {toSentenceCase(tipText)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. Decision Triggers (if any) */}
      {decisionTriggers.length > 0 && (
        <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-3">
          <span className="text-xs font-semibold text-[#71717A]">Conditional Decision Gates</span>
          <div className="space-y-2.5">
            {decisionTriggers.map((dt, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[18px] bg-[#EEF1FA] border border-[#DCE2F5] space-y-1"
              >
                <div className="text-xs font-bold text-[#2D3748]">Condition: {dt.situation}</div>
                <div className="text-xs font-medium text-[#475569]">Action: {dt.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
