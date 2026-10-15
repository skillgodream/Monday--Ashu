import React, { useState } from 'react';
import { Slide } from '../types';
import { Check, ArrowRight } from 'lucide-react';
import { ImageSlot, toSentenceCase } from '../tokens';

export const DecisionPage: React.FC<{
  slide: Slide;
  onChoiceSelect: (isCorrect: boolean, feedback: string) => void;
  feedback?: string | null;
  onNext?: () => void;
}> = ({ slide, onChoiceSelect, onNext }) => {
  // Extract options from slide
  const options =
    (slide.opts || []).length > 0
      ? (slide.opts || []).map((o) => ({
          text: o.t,
          why: o.why,
          isCorrect: Boolean(o.ok),
        }))
      : (slide.choices || []).map((c) => ({
          text: c.text,
          why: c.feedback || c.why || '',
          isCorrect: Boolean(c.isCorrect),
        }));

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');

  const handleSelect = (index: number) => {
    if (isChecked && isCorrect) return;

    setSelectedIndex(index);
    if (isChecked && !isCorrect) {
      setIsChecked(false);
      setFeedbackText('');
    }
  };

  const handleAction = () => {
    if (options.length === 0) {
      if (onNext) onNext();
      return;
    }

    if (selectedIndex === null) return;

    if (isChecked && isCorrect) {
      if (onNext) onNext();
      return;
    }

    const opt = options[selectedIndex];
    if (!opt) return;

    setIsChecked(true);
    setFeedbackText(opt.why);

    if (opt.isCorrect) {
      setIsCorrect(true);
      onChoiceSelect(true, opt.why);
    } else {
      setIsCorrect(false);
      onChoiceSelect(false, opt.why);
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-left pb-4">
      {/* 1. Header Section: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#4B5EAA] font-semibold">{toSentenceCase(slide.tag || 'Decision Verification')}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Scenario Check</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>{options.length} Choices</span>
        </div>

        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title || 'What is the required standard action?')}
        </h2>
      </div>

      {/* 2. Contextual Scenario / Instruction text */}
      {slide.content && (
        <div className="bg-white rounded-[24px] p-5 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04]">
          <p className="text-xs sm:text-sm font-medium text-[#2D2D2D] leading-relaxed">
            {toSentenceCase(slide.content)}
          </p>
        </div>
      )}

      {/* 3. Rich Media Container if available */}
      {slide.img && (
        <div className="rounded-[24px] overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] bg-white">
          <ImageSlot src={slide.img} alt={slide.title} textContext={slide.title} />
        </div>
      )}

      {/* 4. Options List: De-gamified, clean list design without numbered circles */}
      {options.length > 0 && (
        <div className="space-y-3">
          {options.map((opt, j) => {
            const isSelected = selectedIndex === j;
            const isThisCorrect = opt.isCorrect;

            // Default clean white row
            let cardStateClasses =
              'bg-white border-black/[0.05] hover:border-black/[0.12] text-[#2D2D2D] shadow-[0px_2px_8px_rgba(0,0,0,0.02)]';

            if (!isChecked) {
              if (isSelected) {
                // Muted indigo pastel focus state
                cardStateClasses =
                  'bg-[#EEF1FA] border-[#DCE2F5] text-[#1A1A1A] shadow-[0px_4px_16px_rgba(0,0,0,0.04)]';
              }
            } else {
              if (isThisCorrect) {
                // Soft sage pastel highlight for verified correct option
                cardStateClasses =
                  'bg-[#EDF5F0] border-[#D1E7DD] text-[#22543D] shadow-[0px_4px_16px_rgba(0,0,0,0.04)]';
              } else if (isSelected && !isThisCorrect) {
                // Soft dusty rose pastel highlight for incorrect selection
                cardStateClasses =
                  'bg-[#FDF2F4] border-[#F8D7DD] text-[#6B2D38] shadow-[0px_4px_16px_rgba(0,0,0,0.04)]';
              } else {
                cardStateClasses = 'bg-white border-black/[0.04] text-[#71717A] opacity-60';
              }
            }

            return (
              <div
                key={j}
                onClick={() => handleSelect(j)}
                className={`p-4 sm:p-5 rounded-[22px] border transition-all duration-200 flex items-start gap-3.5 cursor-pointer select-none ${cardStateClasses}`}
              >
                {/* Minimalist geometric outline shape (radio indicator) on left */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isChecked
                      ? isThisCorrect
                        ? 'border-[#22543D] bg-[#22543D] text-white'
                        : isSelected
                        ? 'border-[#6B2D38] bg-[#6B2D38] text-white'
                        : 'border-slate-300'
                      : isSelected
                      ? 'border-[#1E293B] bg-[#1E293B] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isChecked && isThisCorrect ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isChecked && isSelected && !isThisCorrect ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  ) : isSelected ? (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  ) : null}
                </div>

                {/* Option Text */}
                <span className="text-xs sm:text-sm font-semibold flex-1 leading-relaxed">
                  {toSentenceCase(opt.text)}
                </span>

                {/* Right-aligned secondary detail */}
                <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5 pl-2">
                  {isChecked && isThisCorrect
                    ? 'Compliant'
                    : isChecked && isSelected && !isThisCorrect
                    ? 'Review'
                    : `Option ${String.fromCharCode(65 + j)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Feedback Card with sophisticated muted pastel accent */}
      {isChecked && feedbackText && (
        <div
          className={`p-5 rounded-[24px] border space-y-1.5 animate-in fade-in duration-200 ${
            isCorrect
              ? 'bg-[#EDF5F0] border-[#D1E7DD] text-[#22543D]'
              : 'bg-[#FDF2F4] border-[#F8D7DD] text-[#6B2D38]'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span>{isCorrect ? '✓ Verification Passed' : '✕ Procedural Clarification'}</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed font-medium">
            {toSentenceCase(feedbackText)}
          </p>
        </div>
      )}

      {/* 6. Primary Action Button: Modern pill-shaped control with deep solid fill */}
      <button
        onClick={handleAction}
        disabled={options.length > 0 && selectedIndex === null}
        className={`w-full min-h-[48px] py-3.5 px-6 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-[0px_4px_16px_rgba(30,41,59,0.12)] ${
          isChecked && isCorrect
            ? 'bg-[#1E293B] hover:bg-[#0F172A]'
            : 'bg-[#1E293B] hover:bg-[#0F172A]'
        }`}
      >
        <span>
          {options.length === 0
            ? 'Continue'
            : isChecked && isCorrect
            ? 'Continue to Next Step'
            : 'Verify Decision'}
        </span>
        <ArrowRight className="w-4 h-4 stroke-[2.2]" />
      </button>
    </div>
  );
};
