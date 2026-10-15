import React from 'react';
import { ShieldCheck, AlertTriangle, Check, ArrowRight, RotateCcw, X, BookOpen, UserCheck } from 'lucide-react';
import { CapabilityDecisionResult, TargetedRemediationPlan } from '../utils/capabilityDecisionEngine';
import { sounds } from '../utils/audio';

interface CapabilityDecisionModalProps {
  isOpen: boolean;
  result: CapabilityDecisionResult | null;
  sopTitle: string;
  onClose: () => void;
  onStartTargetedRemediation: (plan: TargetedRemediationPlan) => void;
  onAskTrainer?: () => void;
}

export default function CapabilityDecisionModal({
  isOpen,
  result,
  sopTitle,
  onClose,
  onStartTargetedRemediation,
  onAskTrainer,
}: CapabilityDecisionModalProps) {
  if (!isOpen || !result) return null;

  const isReady = result.decision === 'is_ready';
  const isTargeted = result.decision === 'needs_targeted_practice';
  const isReview = result.decision === 'requires_review';

  return (
    <div className="fixed inset-0 z-50 bg-[#07090E]/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D121F] border border-white/10 sm:rounded-[32px] rounded-t-[32px] p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-8 duration-200 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
              Capability Decision · {sopTitle}
            </span>
            <div className="text-xs font-bold text-slate-300">Guruji Work Coach Decision</div>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Readiness Badge Header */}
        <div className={`p-5 rounded-2xl border text-left space-y-2 ${
          isReady
            ? 'bg-emerald-950/40 border-emerald-500/30'
            : isTargeted
            ? 'bg-amber-950/40 border-amber-500/30'
            : 'bg-rose-950/40 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
              isReady
                ? 'bg-emerald-500 text-slate-950'
                : isTargeted
                ? 'bg-amber-500 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}>
              {result.decisionTitle}
            </span>
            <span className="text-sm font-black text-white">{result.percentage}% Accuracy</span>
          </div>

          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {result.summary}
          </p>

          <div className="flex items-center gap-4 pt-2 text-[11px] font-semibold text-slate-300 border-t border-white/10">
            <div>
              Demonstrated: <b className="text-white">{result.demonstratedCount}/{result.totalCount}</b>
            </div>
            <div>
              Critical Controls: <b className={result.criticalControlsPassed ? 'text-emerald-400' : 'text-rose-400'}>
                {result.criticalControlsPassed ? 'Passed' : 'Missed'}
              </b>
            </div>
          </div>
        </div>

        {/* Evidence Matrix Overview */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Instructional Evidence Matrix
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Steps:</span>
              <b className="text-white">{result.evidenceMatrix.steps.demonstrated}/{result.evidenceMatrix.steps.total}</b>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Controls:</span>
              <b className="text-white">{result.evidenceMatrix.controls.demonstrated}/{result.evidenceMatrix.controls.total}</b>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Decisions:</span>
              <b className="text-white">{result.evidenceMatrix.decisions.demonstrated}/{result.evidenceMatrix.decisions.total}</b>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
              <span className="text-slate-400 font-medium">Exceptions:</span>
              <b className="text-white">{result.evidenceMatrix.exceptions.demonstrated}/{result.evidenceMatrix.exceptions.total}</b>
            </div>
          </div>
        </div>

        {/* Weak Requirements List if any */}
        {result.weakRequirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Gaps Identified for Targeted Remediation ({result.weakRequirements.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {result.weakRequirements.map((weak, idx) => (
                <div key={idx} className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-1 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-200">{weak.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{weak.sourceRef}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{weak.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="pt-2 space-y-2">
          {result.remediationPlan ? (
            <button
              onClick={() => {
                sounds.playTap();
                onStartTargetedRemediation(result.remediationPlan!);
              }}
              className="w-full h-13 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
            >
              {result.remediationPlan.buttonText}
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="w-full h-13 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
            >
              Floor Certified · Back to Overview <Check size={16} />
            </button>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            {onAskTrainer && (
              <button
                onClick={() => {
                  sounds.playTap();
                  onAskTrainer();
                }}
                className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UserCheck size={14} className="text-emerald-400" /> Ask trainer
              </button>
            )}

            <button
              onClick={() => {
                sounds.playTap();
                onClose();
              }}
              className="text-slate-400 hover:text-white font-semibold cursor-pointer ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
