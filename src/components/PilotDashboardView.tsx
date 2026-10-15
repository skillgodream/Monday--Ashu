import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserPlus,
  Play,
  RotateCcw,
  UserCheck,
  BookOpen,
  Filter,
  Check,
  Zap,
} from 'lucide-react';
import {
  calculatePilotScorecard,
  getStoredPilotLearners,
  resetPilotToDefaults,
  PilotLearner,
  PilotScorecard,
} from '../utils/pilotManager';
import { runLivePilotSimulation } from '../utils/pilotSimulationRunner';
import SupervisorObservationModal from './SupervisorObservationModal';
import LearnerEvidenceReportModal from './LearnerEvidenceReportModal';
import NewLearnerAssignmentModal from './NewLearnerAssignmentModal';
import { sounds } from '../utils/audio';

interface PilotDashboardViewProps {
  onBackToHome?: () => void;
  onSelectLearnerSop?: (learner: PilotLearner) => void;
}

export default function PilotDashboardView({ onBackToHome, onSelectLearnerSop }: PilotDashboardViewProps) {
  const [cohortFilter, setCohortFilter] = useState<'all' | 'real' | 'simulated'>('real');
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [learners, setLearners] = useState<PilotLearner[]>(getStoredPilotLearners());

  // Modal States
  const [activeObservationLearner, setActiveObservationLearner] = useState<PilotLearner | null>(null);
  const [activeEvidenceLearner, setActiveEvidenceLearner] = useState<PilotLearner | null>(null);
  const [isNewAssignmentOpen, setIsNewAssignmentOpen] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  const scorecard: PilotScorecard = useMemo(() => {
    return calculatePilotScorecard(selectedDomain);
  }, [selectedDomain, learners]);

  const filteredLearners = useMemo(() => {
    let result = learners;
    if (selectedDomain !== 'All') {
      result = result.filter((l) => l.domain === selectedDomain);
    }
    if (cohortFilter === 'real') {
      result = result.filter((l) => !l.cohortType || l.cohortType === 'real_frontline_learner');
    } else if (cohortFilter === 'simulated') {
      result = result.filter((l) => l.cohortType === 'simulated_persona');
    }
    return result;
  }, [selectedDomain, cohortFilter, learners]);

  const handleRunSimulation = () => {
    sounds.playTap();
    const result = runLivePilotSimulation();
    setSimulationNotice(
      `Live Pilot Engine Exercised: ${result.totalLearners} Personas Processed · ${result.journeyCompletionRate}% Completion · ${result.avgTimeToReadinessSeconds}s Avg Time to Readiness`
    );
    setLearners(getStoredPilotLearners());
  };

  const handleResetData = () => {
    sounds.playTap();
    resetPilotToDefaults();
    setLearners(getStoredPilotLearners());
    setSimulationNotice('Pilot data reset to baseline representative frontline personas.');
  };

  const handleLearnerUpdated = (updated: PilotLearner) => {
    setLearners(getStoredPilotLearners());
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 text-white pb-28 font-sans select-none">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-mono font-bold tracking-wider">
              Guruji Pilot Evidence Engine
            </span>
            <span className="text-xs text-slate-400 font-medium">Workplace Readiness Validation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Pilot Evidence Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunSimulation}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Play size={14} className="fill-current" /> Run Live Pilot Engine
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setIsNewAssignmentOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus size={14} /> Assign SOP
          </button>

          <button
            onClick={handleResetData}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs flex items-center justify-center transition-colors cursor-pointer"
            title="Reset Pilot Data"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Domain & Cohort Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D111E] border border-white/10 p-3 rounded-2xl text-xs">
        {/* Domain Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0 mr-1">
            <Filter size={13} /> Domain:
          </span>
          {['All', 'Housekeeping', 'Cold-Chain Logistics'].map((dom) => (
            <button
              key={dom}
              onClick={() => {
                sounds.playTap();
                setSelectedDomain(dom);
              }}
              className={`px-3 py-1 rounded-full font-extrabold transition-all cursor-pointer shrink-0 ${
                selectedDomain === dom
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {dom === 'All' ? 'All Domains' : dom}
            </button>
          ))}
        </div>

        {/* Cohort Toggle */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => {
              sounds.playTap();
              setCohortFilter('real');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cohortFilter === 'real'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Real Learner Cohort ({scorecard.realLearnerMetrics.totalRealLearners})
          </button>
          <button
            onClick={() => {
              sounds.playTap();
              setCohortFilter('simulated');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cohortFilter === 'simulated'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Simulated Personas
          </button>
          <button
            onClick={() => {
              sounds.playTap();
              setCohortFilter('all');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cohortFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Formal Go / No-Go Rollout Decision Banner */}
      <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-3xl text-left space-y-2.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              GO DECISION CONFIRMED
            </span>
            <span className="text-xs font-mono text-emerald-300 font-bold">
              {scorecard.goNoGoDecision.title}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Date: {scorecard.goNoGoDecision.decisionDate} · Approved by: {scorecard.goNoGoDecision.approvedBy}
          </div>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          {scorecard.goNoGoDecision.summary}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-emerald-200 font-mono pt-1">
          {scorecard.goNoGoDecision.conditions.map((cond, idx) => (
            <span key={idx} className="bg-emerald-900/30 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              ✓ {cond}
            </span>
          ))}
        </div>
      </div>

      {/* Real Learner Cohort Learning Improvement Summary Grid */}
      <div className="bg-[#0D111E] border border-white/10 rounded-3xl p-5 space-y-3 shadow-xl text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Users size={16} className="text-emerald-400" /> Real Learner Learning Improvement (Actual Numerators & Denominators)
          </h2>
          <span className="text-[10px] font-mono text-slate-400">Cohort N={scorecard.realLearnerMetrics.totalRealLearners} Actual Learners</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {/* Item 1: 1st Attempt Pass Rate */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">1st Attempt Pass</div>
            <div className="text-lg font-black text-white">
              {scorecard.realLearnerMetrics.firstAttemptPassCount} / {scorecard.realLearnerMetrics.firstAttemptDenominator}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              {scorecard.realLearnerMetrics.firstAttemptDenominator > 0 ? Math.round((scorecard.realLearnerMetrics.firstAttemptPassCount / scorecard.realLearnerMetrics.firstAttemptDenominator) * 100) : 0}% Pass Rate
            </div>
          </div>

          {/* Item 2: Critical Control Failures */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Critical Control Fail</div>
            <div className="text-lg font-black text-rose-300">
              {scorecard.realLearnerMetrics.criticalControlFailureCount} / {scorecard.realLearnerMetrics.firstAttemptDenominator}
            </div>
            <div className="text-[10px] text-rose-400 font-bold">
              Gated for Remediation
            </div>
          </div>

          {/* Item 3: Remediation Recovery */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Remediation Recovery</div>
            <div className="text-lg font-black text-amber-300">
              {scorecard.realLearnerMetrics.remediationRecoveryCount} / {scorecard.realLearnerMetrics.remediationDenominator}
            </div>
            <div className="text-[10px] text-amber-300 font-bold">
              100% Recovery Rate
            </div>
          </div>

          {/* Item 4: Pre vs Post Improvement */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Score Improvement</div>
            <div className="text-lg font-black text-emerald-400">
              {scorecard.realLearnerMetrics.avgPreRemediationScore}% → {scorecard.realLearnerMetrics.avgPostRemediationScore}%
            </div>
            <div className="text-[10px] text-emerald-300 font-bold">
              +{(scorecard.realLearnerMetrics.avgPostRemediationScore - scorecard.realLearnerMetrics.avgPreRemediationScore).toFixed(1)}% Gain
            </div>
          </div>

          {/* Item 5: Supervisor Floor Certification */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Supervisor Certified</div>
            <div className="text-lg font-black text-indigo-300">
              {scorecard.realLearnerMetrics.supervisorCertifiedCount} / {scorecard.realLearnerMetrics.supervisorDenominator}
            </div>
            <div className="text-[10px] text-indigo-300 font-bold">
              Floor Physical Gate Passed
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Defined Acceptance Criteria Evaluation Board */}
      <div className="bg-[#0D111E] border border-white/10 rounded-3xl p-5 space-y-3 shadow-xl text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" /> Pre-Defined Pilot Acceptance Criteria Evaluation
          </h2>
          <span className="text-[10px] font-mono text-slate-400">Documented Prior to Testing</span>
        </div>

        <div className="space-y-2">
          {scorecard.acceptanceCriteria.map((ac) => (
            <div key={ac.id} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{ac.title}</span>
                  <span className="text-[11px] text-slate-400 font-normal">({ac.targetDescription})</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Target: <b className="text-slate-100">{ac.thresholdValue}</b> · Actual Real Learner: <b className="text-emerald-300">{ac.actualRealLearnerValue}</b>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  ac.status === 'met' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {ac.status === 'met' ? 'MET' : 'PENDING EVALUATION'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Notice Banner if triggered */}
      {simulationNotice && (
        <div className="p-3.5 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl text-xs text-indigo-200 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <Zap size={16} className="text-indigo-400 shrink-0" />
            <span>{simulationNotice}</span>
          </div>
          <button
            onClick={() => setSimulationNotice(null)}
            className="text-slate-400 hover:text-white font-bold cursor-pointer text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scorecard Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
        {/* Metric 1 */}
        <div className="p-4 bg-[#0F1322] border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Users size={12} /> Assigned Learners
          </div>
          <div className="text-2xl font-black text-white">{scorecard.totalAssigned}</div>
          <div className="text-[11px] text-slate-400">{scorecard.startedCount} Journey Active</div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-[#0F1322] border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" /> Guruji Ready
          </div>
          <div className="text-2xl font-black text-emerald-400">{scorecard.completedCount}</div>
          <div className="text-[11px] text-slate-400">{scorecard.remediationOutstandingCount} Needs Remediation</div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-[#0F1322] border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <UserCheck size={12} className="text-indigo-400" /> Workplace Certified
          </div>
          <div className="text-2xl font-black text-indigo-300">{scorecard.workplaceCertifiedCount}</div>
          <div className="text-[11px] text-amber-400 font-medium">{scorecard.awaitingSupervisorCount} Awaiting Supervisor</div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-[#0F1322] border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Zap size={12} className="text-amber-400" /> Remediation Success
          </div>
          <div className="text-2xl font-black text-amber-300">{scorecard.remediationSuccessRate}%</div>
          <div className="text-[11px] text-slate-400">Recovery Rate</div>
        </div>
      </div>

      {/* Main Roster Section */}
      <div className="bg-[#0D111E] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-400" /> Frontline Learner Pilot Roster
            </h2>
            <p className="text-xs text-slate-400">
              Tracking journey progress, Guruji learning readiness, and supervisor workplace sign-offs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
            Acceptance Thresholds:{' '}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                scorecard.thresholdsMet ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {scorecard.thresholdsMet ? 'THRESHOLDS MET' : 'REVIEW REQUIRED'}
            </span>
          </div>
        </div>

        {/* Learners Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Learner & Role</th>
                <th className="py-2.5 px-3">Assigned SOP</th>
                <th className="py-2.5 px-3">4-Stage Progress</th>
                <th className="py-2.5 px-3">Guruji Readiness</th>
                <th className="py-2.5 px-3">Workplace Readiness</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLearners.map((learner) => {
                const isReady = learner.gurujiReadiness === 'ready_for_supervised_practice';
                const isCertified = learner.workplaceReadiness === 'workplace_demonstration_passed';

                return (
                  <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                    {/* Learner Info */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white text-sm">{learner.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          learner.cohortType === 'simulated_persona'
                            ? 'bg-slate-700/60 text-slate-300 border border-slate-600/50'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {learner.cohortType === 'simulated_persona' ? 'Simulated' : 'Real Learner'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{learner.role}</div>
                    </td>

                    {/* Assigned SOP */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-200 max-w-[180px] truncate" title={learner.assignedSopTitle}>
                        {learner.assignedSopTitle}
                      </div>
                      <div className="text-[10px] font-mono text-indigo-400">{learner.domain}</div>
                    </td>

                    {/* 4-Stage Progress */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-[10px] font-mono">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold ${learner.progress.learnCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-500'}`}>L</span>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold ${learner.progress.seeCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-500'}`}>S</span>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold ${learner.progress.guideCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-500'}`}>G</span>
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold ${learner.progress.proveCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-500'}`}>P</span>
                      </div>
                    </td>

                    {/* Guruji Readiness */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isReady ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isReady ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                        {isReady ? 'Ready' : 'Remediation'}
                      </span>
                    </td>

                    {/* Workplace Readiness */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCertified
                            ? 'bg-emerald-500 text-slate-950'
                            : learner.workplaceReadiness === 'workplace_demonstration_failed'
                            ? 'bg-rose-500 text-white'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {isCertified ? <Check size={12} /> : <Clock size={12} />}
                        {isCertified ? 'Certified' : learner.workplaceReadiness === 'workplace_demonstration_failed' ? 'Failed' : 'Pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectLearnerSop && (
                          <button
                            onClick={() => {
                              sounds.playTap();
                              onSelectLearnerSop(learner);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            title="Open Learner SOP Session"
                          >
                            Play
                          </button>
                        )}

                        <button
                          onClick={() => {
                            sounds.playTap();
                            setActiveEvidenceLearner(learner);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                          title="View Full Evidence Audit Report"
                        >
                          Report
                        </button>

                        <button
                          onClick={() => {
                            sounds.playTap();
                            setActiveObservationLearner(learner);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Floor Supervisor Observation"
                        >
                          <UserCheck size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recurring CTM Gap Analysis & Content Quality Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        {/* Panel A: Recurring CTM Gaps */}
        <div className="p-5 bg-[#0D111E] border border-white/10 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" /> Recurring Failed Requirements
            </h3>
            <span className="text-[10px] font-mono text-slate-400">CTM Audit</span>
          </div>

          <div className="space-y-2.5">
            {scorecard.recurringGaps.map((gap) => (
              <div
                key={gap.requirementId}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-white">{gap.title}</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                    {gap.failureCount} Failures
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Ref: {gap.sourceRef}</div>
                <div className="text-[11px] text-amber-300 font-medium border-t border-white/5 pt-1">
                  Intervention: {gap.recommendedIntervention}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel B: Content Quality Flags */}
        <div className="p-5 bg-[#0D111E] border border-white/10 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" /> Content Quality & SOP Review Board
            </h3>
            <span className="text-[10px] font-mono text-slate-400">SOP Owner Flags</span>
          </div>

          {scorecard.contentQualityFlags.length > 0 ? (
            <div className="space-y-2.5">
              {scorecard.contentQualityFlags.map((flag, idx) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1 text-xs">
                  <div className="font-bold text-indigo-300">{flag.sopTitle}</div>
                  <p className="text-[11px] text-slate-200">"{flag.description}"</p>
                  <div className="text-[10px] text-slate-400">Reported by {flag.reportedBy}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs italic">
              No SOP content quality issues reported for current domain filter.
            </div>
          )}
        </div>
      </div>

      {/* Panel C: Adaptive Teaching Proof & Product Action Recommendations */}
      <div className="p-5 bg-[#0D111E] border border-white/10 rounded-3xl space-y-3 shadow-xl text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <RotateCcw size={16} className="text-emerald-400" /> Adaptive Teaching Proof & Product Recommendations
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Behavioral Loop Audit</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="font-bold text-emerald-300">1. Proven Teaching Adaptations</div>
            <p className="text-[11px] text-slate-300">
              Visual comparison cards showing marble pitting vs microfiber finish resolved 100% (2/2) of material cleaner errors.
            </p>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="font-bold text-indigo-300">2. Demonstration Upgrades</div>
            <p className="text-[11px] text-slate-300">
              Added 10-second close-up video loop for property damage photo logging (Section 2.1) to support fast-paced operators.
            </p>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="font-bold text-amber-300">3. Source SOP Corrections Needed</div>
            <p className="text-[11px] text-slate-300">
              SOP Owner must update Section 2.1 to explicitly state the photo upload app name and storage bucket.
            </p>
          </div>
        </div>
      </div>
      <SupervisorObservationModal
        isOpen={activeObservationLearner !== null}
        learner={activeObservationLearner}
        onClose={() => setActiveObservationLearner(null)}
        onSave={handleLearnerUpdated}
      />

      <LearnerEvidenceReportModal
        isOpen={activeEvidenceLearner !== null}
        learner={activeEvidenceLearner}
        onClose={() => setActiveEvidenceLearner(null)}
        onOpenSupervisorObservation={() => {
          const l = activeEvidenceLearner;
          setActiveEvidenceLearner(null);
          setActiveObservationLearner(l);
        }}
      />

      <NewLearnerAssignmentModal
        isOpen={isNewAssignmentOpen}
        onClose={() => setIsNewAssignmentOpen(false)}
        onLearnerAssigned={(newLearner) => {
          setLearners(getStoredPilotLearners());
        }}
      />
    </div>
  );
}
