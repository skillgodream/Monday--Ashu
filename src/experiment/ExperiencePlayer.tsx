import React, { useState, useEffect } from 'react';
import { SlidePlan } from './types';
import { Renderer } from './Renderer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AccentProvider, getAccentForSlideType } from './tokens';
import { ChevronLeft, MoreHorizontal, X, RotateCcw, HelpCircle } from 'lucide-react';

export function ExperiencePlayer({
  plan,
  onClose,
  onComplete,
}: {
  plan: SlidePlan;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [decisionSolved, setDecisionSolved] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  if (!plan || !plan.slides || plan.slides.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F4F6] p-6 text-center">
        <div className="p-6 rounded-[24px] bg-white border border-black/[0.06] shadow-[0px_8px_30px_rgba(0,0,0,0.04)] text-slate-800">
          <p className="font-semibold text-sm">Unable to load lesson slides.</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2.5 rounded-full bg-[#1E293B] text-white text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const slide = plan.slides[currentIndex];
  const isDecision = slide?.type === 'DECISION';
  const isLastSlide = currentIndex === plan.slides.length - 1;
  const isWelcome = slide?.type === 'WELCOME';

  // Reset decision state when slide changes
  useEffect(() => {
    setFeedback(null);
    setDecisionSolved(false);
    setIsMenuOpen(false);
  }, [currentIndex]);

  const handleChoice = (isCorrect: boolean, feedbackText: string) => {
    setFeedback(feedbackText);
    if (isCorrect) {
      setDecisionSolved(true);
    }
  };

  const handleNext = () => {
    if (isLastSlide) {
      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
      return;
    }
    setCurrentIndex((prev) => Math.min(plan.slides.length - 1, prev + 1));
  };

  const handleBack = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsMenuOpen(false);
  };

  const isNextDisabled = isDecision && !decisionSolved;
  const accent = getAccentForSlideType(slide.type);

  // Calculate percentage for the thin top progress track
  const progressPercent = Math.round(((currentIndex + 1) / plan.slides.length) * 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none ${
        isWelcome ? 'bg-[#040814]' : 'bg-[#F4F4F6]'
      } p-0 sm:p-4`}
    >
      <div
        className={`w-full max-w-[460px] h-full sm:h-[820px] sm:rounded-[32px] flex flex-col overflow-hidden relative ${
          isWelcome
            ? 'bg-[#050B18] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-blue-950/40'
            : 'bg-white shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04]'
        }`}
      >
        {/* 1. TOP NAVIGATION STRUCTURE (De-gamified, Elegant Modern E-Learning) */}
        {!isWelcome && (
          <div className="shrink-0 bg-white border-b border-black/[0.04] relative z-20">
            {/* Top Navigation Row: Back Arrow on Left, Metadata in Center, Context Menu on Right */}
            <div className="h-14 flex items-center justify-between px-5">
              {/* Top Left: Clean Back-Arrow Icon Button enclosed in rounded pill/circle */}
              <button
                onClick={currentIndex > 0 ? handleBack : onClose}
                className="w-9 h-9 rounded-full bg-[#F4F4F6] hover:bg-[#EAEAF0] active:scale-95 transition-all flex items-center justify-center text-[#2D2D2D] border border-black/[0.04] cursor-pointer"
                title={currentIndex > 0 ? 'Go back' : 'Exit lesson'}
                aria-label="Previous step"
              >
                <ChevronLeft className="w-4 h-4 text-[#2D2D2D] stroke-[2.2]" />
              </button>

              {/* Center: Elegant percentage / step micro-widget with typographic separation */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#71717A]">
                <span className="text-[#1A1A1A] font-bold">Step {currentIndex + 1}</span>
                <span className="text-slate-300">of</span>
                <span>{plan.slides.length}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono text-[#4B5EAA]">{progressPercent}%</span>
              </div>

              {/* Top Right: Context Menu Button (...) enclosed in rounded background pill */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-9 h-9 rounded-full bg-[#F4F4F6] hover:bg-[#EAEAF0] active:scale-95 transition-all flex items-center justify-center text-[#2D2D2D] border border-black/[0.04] cursor-pointer"
                  title="Options"
                  aria-label="Module options"
                >
                  <MoreHorizontal className="w-4 h-4 text-[#2D2D2D] stroke-[2]" />
                </button>

                {/* Dropdown Menu Modal / Sheet */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-11 w-44 bg-white rounded-2xl shadow-[0px_10px_35px_rgba(0,0,0,0.12)] border border-black/[0.06] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={handleRestart}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#2D2D2D] hover:bg-[#F4F4F6] rounded-xl cursor-pointer text-left transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#71717A]" />
                      <span>Restart from beginning</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer text-left transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      <span>Exit module</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle, Thin Horizontal Progress Track at the top */}
            <div className="h-0.5 w-full bg-[#ECECF0]">
              <div
                className="h-full bg-[#1E293B] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 2. SLIDE BODY CONTAINER - Generous padding & whitespace */}
        <div
          className={`flex-1 overflow-y-auto no-scrollbar animate-in fade-in duration-200 ${
            isWelcome ? 'p-0 bg-[#050B18]' : 'p-5 sm:p-6 bg-[#F4F4F6]'
          }`}
        >
          <AccentProvider value={accent}>
            <ErrorBoundary>
              <Renderer
                slide={slide}
                onChoiceSelect={handleChoice}
                feedback={feedback}
                onNext={handleNext}
                slideIndex={currentIndex}
                totalSlides={plan.slides.length}
                onClose={onClose}
              />
            </ErrorBoundary>
          </AccentProvider>
        </div>

        {/* 3. CONTROLS & BOTTOM ACTIONS (De-gamified: Modern pill button, ample breathing room) */}
        {!isWelcome && !isDecision && (
          <div className="p-5 sm:p-6 pt-3 pb-6 bg-white border-t border-black/[0.04] flex items-center justify-between gap-4 shrink-0 select-none">
            {/* Secondary Option: Clean text-only Back button */}
            {currentIndex > 0 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2.5 text-sm font-semibold text-[#71717A] hover:text-[#1A1A1A] cursor-pointer transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-[#71717A] hover:text-[#1A1A1A] cursor-pointer transition-colors"
              >
                Exit
              </button>
            )}

            {/* Active Primary Action Button: Modern pill-shaped action control with deep solid fill */}
            <button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="min-h-[48px] px-8 py-3 rounded-full bg-[#1E293B] hover:bg-[#0F172A] active:scale-[0.98] text-white font-bold text-sm tracking-tight cursor-pointer transition-all duration-150 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-[0px_4px_16px_rgba(30,41,59,0.12)] flex items-center justify-center gap-2"
            >
              <span>{isLastSlide ? 'Complete Module' : 'Next Step'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
