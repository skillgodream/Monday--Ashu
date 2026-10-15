/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, 
  BookOpen, Layers, CheckSquare, HelpCircle, Flame, Award, RotateCcw,
  Zap, Lightbulb, ExternalLink, ChevronRight
} from 'lucide-react';
import { Lesson } from '../types';
import { INITIAL_LESSONS } from '../data/lessonsData';

interface ContentCardScreenProps {
  onBack: () => void;
  lesson?: Lesson;
}

export function ContentCardScreen({ onBack, lesson = INITIAL_LESSONS[0] }: ContentCardScreenProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'timeline' | 'safety' | 'interactive'>('cards');
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [selectedDecisionOption, setSelectedDecisionOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Extract operational steps from lesson operationalBlueprint or trainingPlan or fallback
  const rawBlueprintSteps = lesson.operationalBlueprint?.operational_steps;
  const operationalSteps = rawBlueprintSteps && rawBlueprintSteps.length > 0 
    ? rawBlueprintSteps.map((s, i) => ({
        step: `Step ${i + 1}`,
        title: s.instruction.slice(0, 50) || `Operational Step ${i + 1}`,
        category: s.category || 'Operation',
        why_it_matters: s.why_it_matters || lesson.description || 'Crucial for upholding standard quality and safety compliance.',
        items: [s.instruction],
        critical_control: s.critical_control ? 'Strict adherence required for safety & compliance audit.' : undefined
      }))
    : (lesson as any).operationalSteps || [
        {
          step: 'Step 1',
          title: 'Prepare SOP Parameters',
          category: 'Preparation',
          why_it_matters: 'Incorrect setup fails to meet regulatory and operational standards.',
          items: [
            'Verify all required tools, materials, and safety gear are ready.',
            'Confirm work order specifications match current procedure requirements.'
          ],
          critical_control: 'Never bypass pre-execution safety or identity verifications.'
        },
        {
          step: 'Step 2',
          title: 'Execute Operational Sequence',
          category: 'Execution',
          why_it_matters: 'Precision during execution prevents rework and quality defects.',
          items: [
            'Follow sequence steps in exact order without deviation.',
            'Monitor real-time indicators and metrics during processing.'
          ],
          critical_control: 'Halt immediately if an unexpected exception occurs.'
        }
      ];

  const criticalControls = lesson.operationalBlueprint?.critical_controls?.map(c => c.rule) || 
    (lesson as any).criticalControls || [
      'Strict dilution and safety ratios must be verified.',
      'Mandatory PPE during chemical or heavy equipment handling.'
    ];

  const commonMistakes = lesson.operationalBlueprint?.common_mistakes?.map(m => ({ mistake: m.mistake, correction: m.prevention })) ||
    (lesson as any).commonMistakes || [
      { mistake: 'Bypassing verification step', correction: 'Always verify parameters before proceeding.' }
    ];

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / operationalSteps.length) * 100);

  return (
    <div className="min-h-screen bg-[#070A14] text-white font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#070A14]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <span>← Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest">
                Content Card Design Workspace
              </span>
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight mt-0.5 truncate max-w-md">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex bg-white/5 p-1 rounded-xl border border-white/10">
          {(['cards', 'timeline', 'safety', 'interactive'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'cards' ? '📇 Content Cards' : tab === 'timeline' ? '⚡ Step Flow' : tab === 'safety' ? '🛡️ Safety Gates' : '🎯 Interactive Practice'}
            </button>
          ))}
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden bg-white/5 border-b border-white/10 px-4 py-2 gap-2 overflow-x-auto">
        {(['cards', 'timeline', 'safety', 'interactive'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Progress Banner */}
        <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/50 to-slate-900/80 border border-indigo-500/30 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">Learner Mastery Card</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Master This SOP in Minutes
              </h2>
              <p className="text-sm text-slate-300 max-w-xl">
                {lesson.description || 'Immersive instructional design content cards extracted from your uploaded Standard Operating Procedure.'}
              </p>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-center shrink-0 min-w-[140px]">
              <span className="text-xs text-slate-300 uppercase tracking-wider block font-bold">Progress</span>
              <span className="text-3xl font-black text-indigo-400">{completedCount}/{operationalSteps.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{progressPercent}% Completed</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-2 rounded-full mt-6 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* VIEW 1: CONTENT CARDS */}
        {activeTab === 'cards' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Operational Step Cards ({operationalSteps.length})</span>
              </h3>
              <span className="text-xs text-slate-400">Tap card checkbox when mastered</span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {operationalSteps.map((stepItem: any, idx: number) => {
                const isCompleted = completedSteps[idx];
                return (
                  <div 
                    key={idx}
                    className={`rounded-3xl border transition-all duration-300 overflow-hidden backdrop-blur-xl ${
                      isCompleted 
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/50' 
                        : 'bg-white/[0.04] border-white/10 hover:border-indigo-500/40 shadow-xl'
                    }`}
                  >
                    {/* Card Header Strip */}
                    <div className="px-6 py-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                          isCompleted ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded">
                              {stepItem.category || 'Operation'}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white mt-0.5">
                            {stepItem.title}
                          </h4>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleStep(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        }`}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{isCompleted ? 'Mastered ✓' : 'Mark Mastered'}</span>
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 space-y-6">
                      {stepItem.why_it_matters && (
                        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex items-start gap-3">
                          <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider block">Why This Matters</span>
                            <p className="text-sm text-indigo-100 font-medium mt-0.5">
                              {stepItem.why_it_matters}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Action Checklist</span>
                        <div className="space-y-2.5">
                          {stepItem.items.map((bullet: string, bIdx: number) => (
                            <div key={bIdx} className="flex items-start gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3.5 hover:bg-white/[0.05] transition-all">
                              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-indigo-400 text-xs font-bold shrink-0 mt-0.5">
                                {bIdx + 1}
                              </div>
                              <p className="text-sm text-slate-200 leading-relaxed font-normal">
                                {bullet}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {stepItem.critical_control && (
                        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider block">Critical Safety Control</span>
                            <p className="text-sm text-amber-100 font-medium mt-0.5">
                              {stepItem.critical_control}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: STEP FLOW TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span>Step-by-Step Sequence Timeline</span>
            </h3>

            <div className="relative pl-6 border-l-2 border-indigo-500/40 space-y-8 ml-2">
              {operationalSteps.map((s: any, idx: number) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-0 w-8 h-8 rounded-full bg-indigo-600 border-4 border-[#070A14] flex items-center justify-center text-white text-xs font-black shadow-lg">
                    {idx + 1}
                  </div>

                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{s.category || 'Phase'}</span>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">Step {idx + 1} of {operationalSteps.length}</span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-2">{s.title}</h4>
                    <p className="text-sm text-slate-300 mb-4">{s.why_it_matters}</p>

                    <div className="space-y-2">
                      {s.items.map((it: string, iIdx: number) => (
                        <div key={iIdx} className="flex items-center gap-2 text-xs text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{it}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: SAFETY GATES */}
        {activeTab === 'safety' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Critical Safety Gates & Common Mistakes</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-3xl p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Critical Controls</h4>
                    <p className="text-xs text-amber-200">Mandatory compliance gates</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {criticalControls.map((control: string, cIdx: number) => (
                    <div key={cIdx} className="bg-black/30 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                        {cIdx + 1}
                      </div>
                      <p className="text-xs text-amber-100 font-medium leading-relaxed">{control}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Common Mistakes</h4>
                    <p className="text-xs text-rose-200">Avoid these frontline errors</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {commonMistakes.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="bg-black/30 border border-rose-500/20 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Mistake: {typeof m === 'string' ? m : m.mistake}</span>
                      </div>
                      {m.correction && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-200 font-medium">
                          ✓ Corrective Action: {m.correction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: INTERACTIVE PRACTICE CARD */}
        {activeTab === 'interactive' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Scenario-Driven Practice Card</span>
            </h3>

            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold uppercase tracking-widest">
                  Frontline Scenario Challenge
                </span>
                <span className="text-xs text-slate-400">Test your operational decision</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-extrabold text-white">
                  When executing this SOP procedure, what is the primary compliance rule to ensure zero quality defects?
                </h4>
              </div>

              <div className="space-y-3">
                {[
                  { id: 0, text: 'Follow all sequential steps and verify critical controls before sign-off.', correct: true, feedback: 'Correct! Adhering to exact SOP sequence and controls guarantees quality.' },
                  { id: 1, text: 'Skip steps if time is short to maintain speed.', correct: false, feedback: 'Incorrect. Skipping steps leads to safety and compliance failures.' }
                ].map(opt => {
                  const isSelected = selectedDecisionOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedDecisionOption(opt.id);
                        setShowExplanation(true);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected 
                          ? opt.correct 
                            ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg' 
                            : 'bg-rose-950/40 border-rose-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 hover:border-indigo-500/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                          isSelected ? (opt.correct ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-white/10 text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + opt.id)}
                        </div>
                        <span className="text-sm font-semibold">{opt.text}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </button>
                  );
                })}
              </div>

              {showExplanation && selectedDecisionOption !== null && (
                <div className={`p-5 rounded-2xl border animate-in fade-in duration-300 ${
                  selectedDecisionOption === 0 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <span>{selectedDecisionOption === 0 ? '✓ Correct Decision!' : '✗ Incorrect Decision'}</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {selectedDecisionOption === 0 
                      ? 'Correct! Adhering to exact SOP sequence and controls guarantees quality.'
                      : 'Incorrect. Skipping steps leads to safety and compliance failures.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
