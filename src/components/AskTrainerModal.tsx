import React, { useState } from 'react';
import { X, UserCheck, PhoneCall, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { sounds } from '../utils/audio';

interface AskTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStepTitle?: string;
  triggerReason?: string | null;
}

export default function AskTrainerModal({
  isOpen,
  onClose,
  currentStepTitle,
  triggerReason,
}: AskTrainerModalProps) {
  const [called, setCalled] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [isUnanswerableAlert, setIsUnanswerableAlert] = useState(false);

  if (!isOpen) return null;

  const handleCallTrainer = () => {
    sounds.playTap();
    setCalled(true);
    sounds.playCorrect();
    sounds.speak('Trainer supervisor notified. They are walking to your aisle station.');
    setTimeout(() => {
      setCalled(false);
      onClose();
    }, 2200);
  };

  const handleSendQuestion = () => {
    sounds.playTap();
    if (!questionText.trim()) return;

    // Check if question asks about out-of-scope or unapproved content
    const unanswerableKeywords = ['salary', 'union', 'policy change', 'custom mod', 'override password', 'system bypass'];
    const isUnanswerable = unanswerableKeywords.some((kw) =>
      questionText.toLowerCase().includes(kw)
    );

    if (isUnanswerable) {
      setIsUnanswerableAlert(true);
      sounds.playWrong();
      sounds.speak('Question requires supervisor sign-off. Dispatching trainer.');
    } else {
      sounds.playCorrect();
      sounds.speak('Question sent to lead trainer Marcus.');
      setCalled(true);
      setTimeout(() => {
        setCalled(false);
        setQuestionText('');
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1116]/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-200">
        <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1116]">Ask My Trainer</h3>
              <span className="text-[10px] font-bold text-[#66726B] uppercase tracking-wider block">
                Floor Support Available 24/7
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              setIsUnanswerableAlert(false);
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#F7F7F5] border border-[#E6E8EC] flex items-center justify-center text-[#0E1116]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {triggerReason && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-700">
                Automated Handoff Triggered
              </span>
              <p className="font-semibold text-xs mt-0.5">{triggerReason}</p>
            </div>
          </div>
        )}

        {called ? (
          <div className="py-6 flex flex-col items-center text-center space-y-2 animate-in zoom-in-95">
            <CheckCircle2 size={44} className="text-emerald-500 animate-bounce" />
            <h4 className="text-lg font-bold text-[#0E1116]">Trainer Dispatched</h4>
            <p className="text-xs text-[#3D4652] max-w-xs leading-relaxed">
              Supervisor <b>Marcus Vance (Lead Trainer)</b> has been notified and is coming to your station now.
            </p>
          </div>
        ) : isUnanswerableAlert ? (
          <div className="py-4 space-y-3 animate-in fade-in">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
              <span className="font-black uppercase tracking-wider text-[10px] text-rose-700 block">
                Handoff Required: Out-Of-Scope Question
              </span>
              <p className="font-medium text-xs leading-relaxed">
                This question cannot be answered from approved SOP content. An in-person trainer handoff has been logged.
              </p>
            </div>

            <button
              onClick={handleCallTrainer}
              className="w-full h-12 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <PhoneCall size={16} /> Confirm Dispatch Trainer
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] text-xs font-semibold text-[#3D4652] space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#2F6FED] block">Active Context</span>
              <p className="text-sm font-bold text-[#0E1116]">
                {currentStepTitle || 'Warehouse Floor Picking'}
              </p>
              <p className="text-[11px] text-[#66726B]">
                Never hesitate to ask. Correct procedure is always more important than speed.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ask trainer a question about this step..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#E6E8EC] text-xs focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                onClick={handleSendQuestion}
                disabled={!questionText.trim()}
                className={`w-full h-11 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  questionText.trim()
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <MessageSquare size={14} /> Send Question to Trainer
              </button>
            </div>

            <button
              onClick={handleCallTrainer}
              className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md shadow-emerald-600/25"
            >
              <PhoneCall size={16} /> Call Trainer to My Station
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
