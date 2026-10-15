/**
 * GURU COACH LMS - PHASE 5 LEARNER DASHBOARD & TODAY'S LEARNING
 *
 * Frontline worker home experience providing:
 * 1. Your Assigned Journey (Title, Status, Dates, Progress %)
 * 2. Your Next Step (Dynamic evidence-driven next action)
 * 3. Your Progress & Assessment Evidence
 * 4. Resume Learning launchpad into the 4 Learning Modes
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Eye,
  Target,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  FileText,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { getApiHeaders } from '../utils/apiHelper';
import { useAuth } from '../context/AuthContext';
import { Lesson } from '../types';
import { sounds } from '../utils/audio';

interface LearnerHomeViewProps {
  onSelectSop: (lessonId: string, title?: string, mode?: string) => void;
  onExploreLibrary?: () => void;
  onOpenTrainerModal?: () => void;
}

interface LearnerAssignment {
  id: string;
  learning_asset_id: string;
  asset_title: string;
  asset_subtitle?: string;
  asset_role_target?: string;
  status: string;
  progress_pct: number;
  start_date?: string;
  due_date?: string;
  stages_completed: {
    learn: boolean;
    see: boolean;
    guide: boolean;
    prove: boolean;
  };
}

interface NextStepAction {
  assignment_id: string;
  asset_id: string;
  asset_title: string;
  action_code: 'learn' | 'see' | 'guide' | 'prove' | 'observation_pending';
  title: string;
  description: string;
  mode_target: string;
}

interface Attempt {
  id: string;
  attempt_number?: number;
  mode: string;
  score: number;
  passed: boolean;
  critical_controls_passed: boolean;
  recorded_at: string;
}

export function LearnerHomeView({
  onSelectSop,
  onExploreLibrary,
  onOpenTrainerModal,
}: LearnerHomeViewProps) {
  const { currentUser } = useAuth();

  const [assignments, setAssignments] = useState<LearnerAssignment[]>([]);
  const [nextStep, setNextStep] = useState<NextStepAction | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const headers = getApiHeaders();
      const res = await fetch('/api/learner/dashboard', { headers });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to fetch dashboard data');
      }

      const data = await res.json();
      setAssignments(data.assignments || []);
      setNextStep(data.nextStep || null);
      setAttempts(data.attempts || []);
    } catch (err: any) {
      setErrorNotice(err.message || 'Could not load your assigned learning journeys.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const primaryAssignment = assignments.length > 0 ? assignments[0] : null;

  return (
    <div className="flex-1 flex flex-col px-4 pt-4 pb-28 space-y-6 max-w-2xl mx-auto w-full text-white font-sans text-left">
      {/* Welcome Kicker */}
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
            <ShieldCheck size={12} /> Today's Operational Learning
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Welcome back, {currentUser?.fullName || 'Operator'}
          </h1>
        </div>
        <button
          onClick={fetchDashboardData}
          title="Refresh Dashboard"
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-400" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* SECTION B: YOUR NEXT STEP (PROMINENT ACTION ANCHOR) */}
      {nextStep ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-[#0D1222] to-slate-950 border border-indigo-500/30 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} /> Recommended Next Action
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Target: {nextStep.asset_title}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">{nextStep.title}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{nextStep.description}</p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                sounds.playTap();
                onSelectSop(nextStep.asset_id, nextStep.asset_title, nextStep.mode_target);
              }}
              className="w-full h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Continue Learning Stage</span> <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-[#0D1222]/80 border border-white/10 text-center space-y-3">
          <p className="text-xs text-slate-300">
            No pending active learning steps right now.
          </p>
        </div>
      )}

      {/* SECTION A: YOUR ASSIGNED JOURNEY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen size={14} className="text-emerald-400" /> Your Assigned Learning Journey
          </h2>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 text-slate-400 text-xs space-y-2">
            <p>You have no active learning assignments assigned by your Manager.</p>
            <p className="text-[11px] text-slate-500">
              Explore available domain SOPs in the Library to start practicing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-5 rounded-3xl bg-[#0D121F] border border-white/10 hover:border-white/20 transition-all space-y-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">
                      {assignment.asset_role_target || 'Frontline Operator'}
                    </span>
                    <h3 className="text-lg font-black text-white mt-0.5">
                      {assignment.asset_title}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider ${
                      assignment.status === 'certified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : assignment.status === 'ready_for_observation'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {assignment.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Progress Bar & Stage Badges */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>Overall Journey Progress</span>
                    <span className="font-bold text-white">{assignment.progress_pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                      style={{ width: `${assignment.progress_pct}%` }}
                    />
                  </div>

                  {/* 4 Cognitive Stages Check */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                    <div
                      className={`p-1.5 rounded-xl border text-[10px] font-bold ${
                        assignment.stages_completed?.learn
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      }`}
                    >
                      1. Teach
                    </div>
                    <div
                      className={`p-1.5 rounded-xl border text-[10px] font-bold ${
                        assignment.stages_completed?.see
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      }`}
                    >
                      2. Show
                    </div>
                    <div
                      className={`p-1.5 rounded-xl border text-[10px] font-bold ${
                        assignment.stages_completed?.guide
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      }`}
                    >
                      3. Guide
                    </div>
                    <div
                      className={`p-1.5 rounded-xl border text-[10px] font-bold ${
                        assignment.stages_completed?.prove
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      }`}
                    >
                      4. Test
                    </div>
                  </div>
                </div>

                {/* Dates & Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    {assignment.start_date && (
                      <span>Start: {new Date(assignment.start_date).toLocaleDateString()}</span>
                    )}
                    {assignment.due_date && (
                      <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      sounds.playTap();
                      onSelectSop(assignment.learning_asset_id, assignment.asset_title);
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Play size={14} className="fill-current" />
                    <span>Resume Learning Journey</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION C: YOUR PROGRESS & EVIDENCE BREAKDOWN */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
          <Award size={14} className="text-amber-400" /> Assessment Evidence & Attempt Log
        </h2>

        {attempts.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#0D121F] border border-white/10 text-xs text-slate-400 text-center">
            No assessment attempts recorded yet. Complete the "Guide Me" or "Test Me" simulation stages to generate evidence.
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.slice(0, 5).map((attempt) => (
              <div
                key={attempt.id}
                className="p-3.5 rounded-2xl bg-[#0D121F] border border-white/10 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white capitalize">
                      {attempt.mode.replace(/_/g, ' ')} Attempt #{attempt.attempt_number || 1}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        attempt.passed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {attempt.passed ? 'PASSED' : 'REMEDIATION NEEDED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Critical Controls Passed: {attempt.critical_controls_passed ? 'Yes' : 'No'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-white">{attempt.score}%</span>
                  <span className="block text-[10px] text-slate-400 font-mono">
                    {new Date(attempt.recorded_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
