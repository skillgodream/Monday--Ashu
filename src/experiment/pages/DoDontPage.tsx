import React from 'react';
import { Slide } from '../types';
import { toSentenceCase } from '../tokens';

export const DoDontPage: React.FC<{
  slide: Slide;
  onNext?: () => void;
}> = ({ slide }) => {
  const dos = slide.dos || slide.comparison?.do || [];
  const donts = slide.donts || slide.comparison?.dont || [];

  const finalDos = dos.slice(0, 4);
  const finalDonts = donts.slice(0, 4);

  return (
    <div className="flex flex-col gap-5 select-none text-left">
      {/* 1. Header Card: Pure white card with soft diffused shadow */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium flex-wrap">
          <span className="text-[#6B2D38] font-semibold">{toSentenceCase(slide.tag || 'Standard Controls')}</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Compliance Guidelines</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>Dos and Don'ts</span>
        </div>

        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(slide.title || 'Operational Guidelines')}
        </h2>
      </div>

      {/* 2. Sub-Cards: Do & Don't Unified Sections */}
      <div className="space-y-4">
        {/* Do Section: Soft Sage Pastel Accent */}
        {finalDos.length > 0 && (
          <div className="bg-[#EDF5F0] rounded-[24px] p-5 border border-[#D1E7DD] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#22543D] uppercase tracking-wider">
                Mandatory Standard Practice
              </span>
              <span className="text-[10px] font-semibold text-[#22543D] bg-white/60 px-2 py-0.5 rounded-full">
                Compliant
              </span>
            </div>

            <div className="space-y-2">
              {finalDos.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-3.5 bg-white rounded-[18px] border border-black/[0.03] shadow-[0px_2px_8px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-[#EDF5F0] border border-[#D1E7DD] text-[#22543D] flex items-center justify-center shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[#1A1A1A] leading-relaxed">
                      {toSentenceCase(item)}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5">
                    Do
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Don't Section: Soft Dusty Rose Pastel Accent */}
        {finalDonts.length > 0 && (
          <div className="bg-[#FDF2F4] rounded-[24px] p-5 border border-[#F8D7DD] shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B2D38] uppercase tracking-wider">
                Prohibited Actions & Pitfalls
              </span>
              <span className="text-[10px] font-semibold text-[#6B2D38] bg-white/60 px-2 py-0.5 rounded-full">
                Violation
              </span>
            </div>

            <div className="space-y-2">
              {finalDonts.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-3 p-3.5 bg-white rounded-[18px] border border-black/[0.03] shadow-[0px_2px_8px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-[#FDF2F4] border border-[#F8D7DD] text-[#6B2D38] flex items-center justify-center shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[#1A1A1A] leading-relaxed">
                      {toSentenceCase(item)}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5">
                    Avoid
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
