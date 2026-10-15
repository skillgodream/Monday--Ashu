import React, { useState } from 'react';
import { X, ShieldCheck, Check, AlertTriangle, UserCheck, FileText } from 'lucide-react';
import { PilotLearner, SupervisorObservationRecord, recordSupervisorObservation } from '../utils/pilotManager';
import { sounds } from '../utils/audio';

interface SupervisorObservationModalProps {
  isOpen: boolean;
  learner: PilotLearner | null;
  onClose: () => void;
  onSave: (updatedLearner: PilotLearner) => void;
}

export default function SupervisorObservationModal({
  isOpen,
  learner,
  onClose,
  onSave,
}: SupervisorObservationModalProps) {
  if (!isOpen || !learner) return null;

  const initialChecklist = [
    {
      requirementId: 'step-1',
      title: 'Property Damage Pre-Inspection & Photo Log',
      isCriticalControl: true,
      observedCorrectly: true,
      notes: '',
    },
    {
      requirementId: 'step-2',
      title: 'Material-Specific Surface Care (Marble / Hardwood / Probe)',
      isCriticalControl: true,
      observedCorrectly: true,
      notes: '',
    },
    {
      requirementId: 'step-3',
      title: 'Safety PPE & Escalation Protocol Adherence',
      isCriticalControl: true,
      observedCorrectly: true,
      notes: '',
    },
  ];

  const [checklist, setChecklist] = useState(initialChecklist);
  const [supervisorName, setSupervisorName] = useState('Marcus Vance (Floor Lead)');
  const [overallDecision, setOverallDecision] = useState<'workplace_demonstration_passed' | 'workplace_demonstration_failed'>(
    'workplace_demonstration_passed'
  );
  const [overallNotes, setOverallNotes] = useState('Learner performed task safely on the floor according to SOP standards.');

  const toggleChecklistItem = (idx: number, observed: boolean) => {
    const updated = [...checklist];
    updated[idx].observedCorrectly = observed;
    setChecklist(updated);

    // If any critical control failed, default decision to failed
    if (updated.some((item) => item.isCriticalControl && !item.observedCorrectly)) {
      setOverallDecision('workplace_demonstration_failed');
    } else {
      setOverallDecision('workplace_demonstration_passed');
    }
  };

  const handleSave = () => {
    sounds.playTap();
    const record: SupervisorObservationRecord = {
      supervisorName,
      observedAt: new Date().toISOString(),
      checklist,
      finalDecision: overallDecision,
      overallNotes,
    };

    const updated = recordSupervisorObservation(learner.id, record);
    if (updated) {
      onSave(updated);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0D121F] border border-white/15 rounded-3xl p-6 text-white space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              <UserCheck size={14} /> Supervisor Floor Observation
            </div>
            <h2 className="text-lg font-black text-white">{learner.name}</h2>
            <p className="text-xs text-slate-400 font-medium">{learner.role} · {learner.assignedSopTitle}</p>
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

        {/* Notice Banner */}
        <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-1 text-slate-200">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Separate Workplace Demonstration Handover
          </div>
          <p className="text-[11px] text-slate-300/90 leading-relaxed">
            Simulation readiness is a prerequisite. Independent work authorization requires physical observation of mandatory safety and compliance controls on the floor.
          </p>
        </div>

        {/* Supervisor Name Input */}
        <div className="space-y-1 text-left">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Supervisor / Evaluator Name
          </label>
          <input
            type="text"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* Checklist */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Physical Observation Checklist
          </label>

          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <div
                key={item.requirementId}
                className={`p-3.5 rounded-2xl border transition-all text-left space-y-2 ${
                  item.observedCorrectly
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : 'bg-rose-950/30 border-rose-500/30'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      {item.title}
                      {item.isCriticalControl && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] uppercase font-mono font-bold">
                          Critical Control
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(idx, true)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        item.observedCorrectly
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Passed
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(idx, false)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        !item.observedCorrectly
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Failed
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final Decision Selector */}
        <div className="space-y-2 text-left">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Final Workplace Certification Decision
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                setOverallDecision('workplace_demonstration_passed');
              }}
              className={`p-3.5 rounded-2xl border text-left space-y-1 cursor-pointer transition-all ${
                overallDecision === 'workplace_demonstration_passed'
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-lg'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <Check size={16} /> Workplace Certified
              </div>
              <p className="text-[10px] opacity-80 font-normal">Passed physical demonstration on floor.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playTap();
                setOverallDecision('workplace_demonstration_failed');
              }}
              className={`p-3.5 rounded-2xl border text-left space-y-1 cursor-pointer transition-all ${
                overallDecision === 'workplace_demonstration_failed'
                  ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-lg'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                <AlertTriangle size={16} /> Practice Required
              </div>
              <p className="text-[10px] opacity-80 font-normal">Requires supervised re-test.</p>
            </button>
          </div>
        </div>

        {/* Overall Notes */}
        <div className="space-y-1 text-left">
          <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Supervisor Observation Notes
          </label>
          <textarea
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            rows={3}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            Sign-off & Record Observation <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
