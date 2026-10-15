import React, { useState, useMemo } from 'react';
import { X, Check, AlertTriangle, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { EXPERIENCED_CHECK_QUESTIONS } from '../data/lessonsData';
import { Lesson } from '../types';
import { sounds } from '../utils/audio';

interface ExperiencedCheckModalProps {
  isOpen: boolean;
  lesson?: Lesson | null;
  onClose: () => void;
  onPass: () => void;
  onFail: () => void;
  onAskTrainer: () => void;
}

export default function ExperiencedCheckModal({
  isOpen,
  lesson,
  onClose,
  onPass,
  onFail,
  onAskTrainer,
}: ExperiencedCheckModalProps) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, { optionId: string; isCorrect: boolean }>>({});
  const [isFinished, setIsFinished] = useState(false);

  const questions = useMemo(() => {
    if (!lesson) return EXPERIENCED_CHECK_QUESTIONS;
    const bpSteps = lesson.operationalBlueprint?.operational_steps || [];
    const sos = lesson.stepObjects || [];
    
    const extracted: Array<{ id: number; question: string; options: { id: string; text: string; isCorrect: boolean }[]; explanation: string }> = [];

    if (bpSteps.length > 0) {
      bpSteps.forEach((s, idx) => {
        if (s.scenario_question && s.choices && s.choices.length >= 2 && s.choices.some(c => c.isCorrect)) {
          extracted.push({
            id: idx + 1,
            question: s.scenario_question,
            options: s.choices.map((c, cIdx) => ({ id: c.id || `c${cIdx + 1}`, text: c.title || (c as any).text, isCorrect: Boolean(c.isCorrect) })),
            explanation: s.why_it_matters || s.coach_tip || 'Compliant SOP Standard',
          });
        }
      });
    }

    if (extracted.length === 0 && sos.length > 0) {
      sos.forEach((so: any, idx: number) => {
        if (so.options && so.options.length >= 2) {
          const choices = so.options.map((opt: any, oIdx: number) => ({
            id: opt.id || `c${oIdx + 1}`,
            text: opt.label || opt.text,
            isCorrect: Boolean((so.correct && opt.id === so.correct) || opt.isCorrect === true),
          }));
          if (choices.some((c: any) => c.isCorrect)) {
            extracted.push({
              id: idx + 1,
              question: so.question || `How do you execute step ${idx + 1}: ${so.title}?`,
              options: choices,
              explanation: so.why || so.coach_say || 'Compliant SOP Standard',
            });
          }
        }
      });
    }

    return extracted.length > 0 ? extracted : EXPERIENCED_CHECK_QUESTIONS;
  }, [lesson]);

  if (!isOpen) return null;

  const currentQ = questions[currentQIndex] || questions[0];
  const totalQuestions = questions.length;
  const currentSelection = userAnswers[currentQIndex];

  const handleSelectOption = (optionId: string, isCorrect: boolean) => {
    if (userAnswers[currentQIndex]) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQIndex]: { optionId, isCorrect },
    }));

    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
  };

  const handleNext = () => {
    sounds.playTap();
    if (currentQIndex < totalQuestions - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentQIndex(0);
    setUserAnswers({});
    setIsFinished(false);
  };

  // Assessment Complete Result Screen
  if (isFinished) {
    const totalAnswered = Object.keys(userAnswers).length;
    const correctAnswersCount = Object.values(userAnswers).filter((a) => a.isCorrect).length;
    const finalScore = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
    const passed = finalScore >= 75 && totalAnswered === totalQuestions;

    return (
      <div className="fixed inset-0 z-50 bg-[#07090E]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-[#0D121F] border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-200 text-white">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
              Experienced Check · {finalScore}%
            </span>
            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {passed ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                <Check size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Check Passed ({correctAnswersCount}/{totalQuestions} Correct)</h3>
                <p className="text-xs text-slate-300 mt-1 font-semibold">
                  You demonstrated solid operational grasp. You can skip the intro cards!
                </p>
              </div>

              {/* Mandatory Safety Card Confirmation */}
              <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-left space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-400">
                  <ShieldCheck size={18} />
                  <span>Mandatory Floor Safety Rule</span>
                </div>
                <p className="text-sm font-bold text-rose-200">
                  "Don't guess. Stop. Check. Act correctly."
                </p>
                <p className="text-[11px] text-slate-300 font-semibold">
                  Never operate without verifying mandatory safety and compliance controls. Follow written SOP rules at all times.
                </p>
              </div>

              <button
                onClick={() => {
                  sounds.playTap();
                  handleReset();
                  onPass();
                }}
                className="w-full h-14 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xl cursor-pointer"
              >
                Skip Cards → Continue to Show Me <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg">
                <AlertTriangle size={30} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Review Recommended ({correctAnswersCount}/{totalQuestions})</h3>
                <p className="text-xs text-slate-300 mt-1 font-semibold leading-relaxed">
                  A quick walk through the presentation cards in <b>Training deck</b> will refresh the exact procedure for this SOP.
                </p>
              </div>

              <button
                onClick={() => {
                  sounds.playTap();
                  handleReset();
                  onFail();
                }}
                className="w-full h-14 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xl cursor-pointer"
              >
                Continue to Training deck <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Question Display
  return (
    <div className="fixed inset-0 z-50 bg-[#07090E]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-200 text-white">
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
              Experienced Check · Question {currentQIndex + 1} of {totalQuestions}
            </span>
            <div className="text-xs font-bold text-slate-300">Score ≥ 75% skips intro cards</div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Question Prompt */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-sm font-bold text-white leading-snug">{currentQ.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQ.options.map((opt) => {
            const isSelected = currentSelection?.optionId === opt.id;
            const revealed = currentSelection !== undefined;

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id, opt.isCorrect)}
                disabled={revealed}
                className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected && opt.isCorrect
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg'
                    : isSelected && !opt.isCorrect
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg'
                    : revealed && opt.isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                <span>{opt.text}</span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 ml-2">
                    {opt.isCorrect ? <Check size={14} /> : <X size={14} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Rationale if revealed */}
        {currentSelection && (
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300 font-medium animate-in fade-in">
            {currentQ.explanation}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              sounds.playTap();
              onAskTrainer();
            }}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserCheck size={15} className="text-emerald-400" />
            Ask trainer
          </button>

          <button
            onClick={handleNext}
            disabled={!currentSelection}
            className={`h-12 px-6 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              currentSelection
                ? 'bg-white text-slate-950 shadow-lg active:scale-95 hover:bg-slate-100'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            {currentQIndex === totalQuestions - 1 ? 'See Check Results' : 'Next Question'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
