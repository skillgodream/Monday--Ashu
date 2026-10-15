import React from 'react';
import { X, ShieldCheck, Check, AlertTriangle, UserCheck, FileText, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import { PilotLearner } from '../utils/pilotManager';
import { sounds } from '../utils/audio';

interface LearnerEvidenceReportModalProps {
  isOpen: boolean;
  learner: PilotLearner | null;
  onClose: () => void;
  onOpenSupervisorObservation: () => void;
}

export default function LearnerEvidenceReportModal({
  isOpen,
  learner,
  onClose,
  onOpenSupervisorObservation,
}: LearnerEvidenceReportModalProps) {
  if (!isOpen || !learner) return null;

  const isGurujiReady = learner.gurujiReadiness === 'ready_for_supervised_practice';
  const isWorkplacePassed = learner.workplaceReadiness === 'workplace_demonstration_passed';

  const latestAttempt = learner.attempts[learner.attempts.length - 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0D121F] border border-white/15 rounded-3xl p-6 text-white space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                learner.cohortType === 'simulated_persona'
                  ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {learner.cohortType === 'simulated_persona' ? 'Simulated Persona' : 'Real Frontline Learner'}
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                <FileText size={12} className="inline mr-1" /> Capability Evidence
              </span>
            </div>
            <h2 className="text-xl font-black text-white">{learner.name}</h2>
            <p className="text-xs text-slate-400 font-medium">{learner.role} · {learner.domain}</p>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Both Readiness States Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* State 1: Guruji Learning Readiness */}
          <div className={`p-4 rounded-2xl border space-y-1.5 ${
            isGurujiReady ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-amber-950/40 border-amber-500/30'
          }`}>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              1. Guruji Learning Readiness
            </div>
            <div className="flex items-center gap-1.5 font-black text-xs text-white">
              {isGurujiReady ? (
                <>
                  <ShieldCheck size={16} className="text-emerald-400" /> Ready for Supervised Practice
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-amber-400" /> Targeted Remediation Required
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isGurujiReady
                ? 'Demonstrated simulated decision accuracy & safety gates.'
                : 'Failed critical controls or step decisions. Re-test needed.'}
            </p>
          </div>

          {/* State 2: Workplace Readiness */}
          <div className={`p-4 rounded-2xl border space-y-1.5 ${
            isWorkplacePassed
              ? 'bg-emerald-950/40 border-emerald-500/30'
              : learner.workplaceReadiness === 'workplace_demonstration_failed'
              ? 'bg-rose-950/40 border-rose-500/30'
              : 'bg-indigo-950/40 border-indigo-500/30'
          }`}>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              2. Workplace Readiness
            </div>
            <div className="flex items-center gap-1.5 font-black text-xs text-white">
              {isWorkplacePassed ? (
                <>
                  <Check size={16} className="text-emerald-400" /> Workplace Demonstration Passed
                </>
              ) : learner.workplaceReadiness === 'workplace_demonstration_failed' ? (
                <>
                  <AlertTriangle size={16} className="text-rose-400" /> Workplace Practice Required
                </>
              ) : (
                <>
                  <Clock size={16} className="text-indigo-400" /> Pending Supervisor Observation
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isWorkplacePassed
                ? 'Supervisor confirmed physical task safety on the floor.'
                : 'Requires physical demonstration on floor with supervisor.'}
            </p>
          </div>
        </div>

        {/* Assigned SOP Details */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Assigned Standard Operating Procedure
          </div>
          <div className="font-extrabold text-sm text-white">{learner.assignedSopTitle}</div>
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-white/10">
            <span>Experience Level: <b className="text-white capitalize">{learner.experienceLevel}</b></span>
            <span>Total Time: <b className="text-white">{Math.round(learner.timeSpentSeconds / 60)} min</b></span>
          </div>
        </div>

        {/* 4-Stage Learning Journey Log */}
        <div className="space-y-2 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Instructional Journey Execution Log
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className={`p-2.5 rounded-xl border ${learner.progress.learnCompleted ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              1. Learn
            </div>
            <div className={`p-2.5 rounded-xl border ${learner.progress.seeCompleted ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              2. See
            </div>
            <div className={`p-2.5 rounded-xl border ${learner.progress.guideCompleted ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              3. Guide
            </div>
            <div className={`p-2.5 rounded-xl border ${learner.progress.proveCompleted ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              4. Prove
            </div>
          </div>
        </div>

        {/* Assessment Attempts & Remediation History */}
        <div className="space-y-2 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Assessment Attempts ({learner.attempts.length})</span>
            {learner.remediationCompleted && (
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <RotateCcw size={12} /> Targeted Remediation Completed
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {learner.attempts.map((att, idx) => (
              <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-white">
                    Attempt #{att.attemptNumber} · {att.mode === 'proveCapability' ? 'Solo Test' : 'Guided Scenario'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-black ${att.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {att.score}% Accuracy
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Controls: {att.criticalControlPassed ? <b className="text-emerald-400">Passed</b> : <b className="text-rose-400">Failed</b>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Adaptive Teaching Loop Diagnostic Trace */}
        {learner.adaptiveTeachingTrace && learner.adaptiveTeachingTrace.length > 0 && (
          <div className="space-y-2 text-left p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl">
            <div className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <RotateCcw size={14} className="text-indigo-400" /> Adaptive Teaching Loop Diagnostic Trace
            </div>
            {learner.adaptiveTeachingTrace.map((trace, idx) => (
              <div key={idx} className="space-y-1 text-xs border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Requirement: {trace.requirementTitle}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Re-test Score: {trace.retestScore}%</span>
                </div>
                <div className="text-[11px] text-rose-300 font-mono">
                  • Initial Misunderstanding: {trace.initialMisunderstanding}
                </div>
                <div className="text-[11px] text-amber-200 font-mono">
                  • Diagnosed Root Cause: {trace.diagnosedRootCause}
                </div>
                <div className="text-[11px] text-slate-300">
                  • Coaching Tier 1: {trace.coachingTier1}
                </div>
                <div className="text-[11px] text-indigo-200">
                  • Coaching Tier 2: {trace.coachingTier2}
                </div>
                {trace.sourceAmbiguityEscalated && (
                  <div className="text-[10px] text-amber-400 font-bold font-mono pt-0.5">
                    ⚠ Unresolved Source Ambiguity Escalated to SOP Owner
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Supervisor Observation Sign-Off Record */}
        {learner.supervisorObservation ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <UserCheck size={14} /> Supervisor Floor Observation Record
              </span>
              <span className="text-[10px] text-slate-400">{new Date(learner.supervisorObservation.observedAt).toLocaleDateString()}</span>
            </div>

            <div className="text-xs text-slate-200">
              Evaluator: <b className="text-white">{learner.supervisorObservation.supervisorName}</b>
            </div>

            <p className="text-xs text-slate-300 italic border-t border-white/10 pt-2">
              "{learner.supervisorObservation.overallNotes}"
            </p>
          </div>
        ) : (
          <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl text-left flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertCircle size={14} /> Pending Floor Supervisor Sign-off
              </div>
              <p className="text-[11px] text-slate-300">
                Conduct physical observation check on the floor to grant full workplace certification.
              </p>
            </div>

            <button
              onClick={() => {
                sounds.playTap();
                onOpenSupervisorObservation();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-md transition-all"
            >
              Sign-off Now
            </button>
          </div>
        )}

        {/* Content Quality Flags if reported */}
        {learner.contentQualityFlags.length > 0 && (
          <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-2xl text-left space-y-1">
            <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Content Quality / SOP Issue Reported
            </div>
            {learner.contentQualityFlags.map((flag, idx) => (
              <p key={idx} className="text-[11px] text-slate-300">
                • {flag.description}
              </p>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
          <button
            onClick={() => {
              sounds.playTap();
              onOpenSupervisorObservation();
            }}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserCheck size={14} className="text-emerald-400" />
            {learner.supervisorObservation ? 'Edit Observation' : 'Conduct Observation'}
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-5 py-2 rounded-full bg-white text-slate-950 font-bold hover:bg-slate-100 transition-all cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
