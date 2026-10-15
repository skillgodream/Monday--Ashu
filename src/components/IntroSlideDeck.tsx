import React, { useState } from 'react';
import { X, Volume2, ArrowRight, ArrowLeft, Check, AlertCircle, HelpCircle, UserCheck, ShieldCheck, FileText, Lightbulb, Shield } from 'lucide-react';
import ClayArt from './ClayArt';
import ToolDetailModal from './ToolDetailModal';
import { WAREHOUSE_TOOLS, STEP_JOURNEY } from '../data/lessonsData';
import { ToolItem, Lesson } from '../types';
import { sounds } from '../utils/audio';

interface IntroSlideDeckProps {
  lesson?: Lesson;
  onClose: () => void;
  onStartSimulation: () => void;
  onAskTrainer?: () => void;
}

export default function IntroSlideDeck({ lesson, onClose, onStartSimulation, onAskTrainer }: IntroSlideDeckProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeDecisionGate, setActiveDecisionGate] = useState<'all' | 'accept' | 'reject' | 'pause'>('all');

  const totalSlides = 8;

  // Extract dynamic items if lesson is present
  const dynamicSteps = lesson?.blueprint?.scenarios.watch || [];
  const dynamicChecklist = lesson?.blueprint?.floor_checklist || [];
  const dynamicTools = lesson?.passport?.fields.tools || [];
  const dynamicRules = lesson?.passport?.fields.golden_rules || [];
  const dynamicMistakes = lesson?.blueprint?.common_mistakes || [];

  const handleNext = () => {
    sounds.playTap();
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onStartSimulation();
    }
  };

  const handlePrev = () => {
    sounds.playTap();
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleAudioSpeak = (text: string) => {
    sounds.playTap();
    sounds.speak(text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F7F5] flex flex-col overflow-hidden">
      {/* Top App Header with Slide Progress and Ask Trainer */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-[#E6E8EC] bg-white/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-[#F7F7F5] border border-[#E6E8EC] flex items-center justify-center text-[#0E1116] hover:bg-[#E6E8EC] active:scale-95 transition-all cursor-pointer"
            aria-label="Exit Intro"
          >
            <X size={20} />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3D4652]">KNOW IT</span>
            <div className="text-xs font-bold text-[#0E1116]">
              Slide {currentSlide + 1} of {totalSlides}
            </div>
          </div>
        </div>

        {/* Source Filename Pill if Present */}


        {/* Slide Dots & Ask Trainer */}
        <div className="flex items-center gap-3">
          {onAskTrainer && (
            <button
              onClick={() => {
                sounds.playTap();
                onAskTrainer();
              }}
              className="text-[10px] font-bold text-[#14532D] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer"
            >
              <UserCheck size={12} className="text-emerald-600" />
              <span>Trainer</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-5 bg-[#0E1116]' : 'w-2 bg-[#E6E8EC]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Slide Content: Split Screen */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* SLIDE 1: What is this SOP? */}
        {currentSlide === 0 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[44%] bg-[#DCEBFF] relative flex items-center justify-center p-6">
              <button
                onClick={() =>
                  handleAudioSpeak(
                    `What is ${lesson?.title || 'this SOP'}? ${lesson?.description || 'Standard Operating Procedure'}`
                  )
                }
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#0E1116] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
                aria-label="Listen"
              >
                <Volume2 size={22} />
              </button>
              <div className="w-36 h-36 rounded-full bg-white/40 absolute" />
              <ClayArt type={lesson?.artType || 'clipboard'} size={135} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-6 p-6 shadow-[0_8px_24px_rgba(16,24,40,.08)] flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#2F6FED] bg-[#DCEBFF] px-3 py-1 rounded-full mb-2">
                  {lesson?.category || 'SOP Foundation'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0E1116] leading-tight mb-2">
                  {lesson ? `What is ${lesson.title}?` : 'What is Picking?'}
                </h1>
                <p className="text-base font-semibold text-[#3D4652] leading-relaxed mb-3">
                  {lesson?.description || 'Standard Operating Procedure guideline for frontline execution.'}
                </p>

                {lesson?.sourceMeta && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-900 mb-3">
                    <p>Source: {lesson.sourceMeta.filename} · Version: {lesson.sourceMeta.version}</p>
                    <p className="text-[11px] font-normal text-emerald-700 mt-0.5">{lesson.sourceMeta.confirmationText}</p>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  onClick={handleNext}
                  className="w-full h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-lg cursor-pointer"
                >
                  Next: The Job <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: Interactive Visual Flowchart */}
        {currentSlide === 1 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[28%] bg-[#DDF3E6] relative flex items-center justify-center p-4">
              <button
                onClick={() => handleAudioSpeak('Process Flowchart')}
                className="absolute top-3 right-4 w-10 h-10 rounded-full bg-[#0E1116] text-white flex items-center justify-center cursor-pointer shadow-sm"
              >
                <Volume2 size={18} />
              </button>
              <ClayArt type="clipboard" size={90} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-5 p-6 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h1 className="text-xl font-bold text-[#0E1116]">Process Flowchart</h1>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {dynamicSteps.length || 5} Core Phase Steps
                  </span>
                </div>
                <p className="text-xs text-[#66726B] font-semibold mb-3">
                  Sequential workflow in operational execution order
                </p>

                {/* Node-and-Arrow Visual Flowchart */}
                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                  {(dynamicSteps.length > 0 ? dynamicSteps : [
                    { title: 'Verify live order ID on handheld before greeting customer', why: 'Ensures correct record match before taking physical item' },
                    { title: 'Inspect item condition, physical seals & packaging', why: 'Detects damaged or tampered goods immediately' },
                    { title: 'Evaluate eligibility & decide Accept / Reject status', why: 'Applies written SOP decision rules strictly' },
                    { title: 'Communicate decision & process disposition', why: 'Keeps customer informed with standard wording' },
                  ]).map((stepItem: any, idx: number, arr: any[]) => (
                    <div key={idx} className="relative">
                      <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] hover:border-[#1FA55E] transition-all relative z-10">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#0E1116] text-white flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xs font-bold text-[#0E1116] leading-tight">
                              {stepItem.title || stepItem.question || `Step ${idx + 1}`}
                            </h3>
                            {(stepItem.why || stepItem.desc) && (
                              <p className="text-[11px] font-semibold text-[#66726B] mt-1">
                                {stepItem.why || stepItem.desc}
                              </p>
                            )}
                            {stepItem.sub_cues && stepItem.sub_cues.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[#E6E8EC] space-y-1">
                                {stepItem.sub_cues.map((cue: string, cIdx: number) => (
                                  <div key={cIdx} className="flex items-center gap-1.5 text-[11px] text-[#3D4652]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1FA55E] shrink-0" />
                                    <span className="truncate">{cue}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="flex justify-center my-0.5">
                          <div className="w-0.5 h-3 bg-[#1FA55E]/40" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  Step Journey <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: Interactive Step Journey */}
        {currentSlide === 2 && (() => {
          const stepsList = dynamicSteps.length > 0 ? dynamicSteps : [
            { title: 'Verify live order ID on handheld before greeting customer', why: 'Prevents collecting items for cancelled or mismatched orders.', coachTip: 'Always trust app data over verbal customer claims.' },
            { title: 'Inspect item condition, physical seals & packaging', why: 'Detects damaged goods before accepting transfer.', coachTip: 'Look for broken seal tags or liquid leakage.' },
            { title: 'Evaluate eligibility & decide Accept / Reject status', why: 'Applies written SOP decision rules strictly.', coachTip: 'Never improvise rules or guess refund timelines.' }
          ];

          const currentStepItem: any = stepsList[activeStepIndex] || stepsList[0];

          return (
            <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
              <div className="h-[22%] bg-[#FFE6D2] relative flex items-center justify-center p-3">
                <button
                  onClick={() => handleAudioSpeak('Interactive Step Guidance Breakdown')}
                  className="absolute top-3 right-4 w-10 h-10 rounded-full bg-[#0E1116] text-white flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <Volume2 size={18} />
                </button>
                <ClayArt type="clipboard" size={75} />
              </div>

              <div className="flex-1 bg-white rounded-t-[32px] -mt-5 p-5 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold text-[#0E1116]">Step Guidance Breakdown</h1>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      3-Dimensional Learning
                    </span>
                  </div>

                  {/* Interactive Step Selector Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                    {stepsList.map((st: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          sounds.playTap();
                          setActiveStepIndex(idx);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                          idx === activeStepIndex
                            ? 'bg-[#0E1116] text-white shadow-md'
                            : 'bg-[#F7F7F5] text-[#3D4652] hover:bg-[#E6E8EC] border border-[#E6E8EC]'
                        }`}
                      >
                        Step {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Active Step Content: 3 Differentiated Pillars */}
                  <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                    {/* PILLAR 1: Operational Action Directive (Dark Hero Card) */}
                    <div className="p-4 rounded-2xl bg-[#0E1116] text-white shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                          1. ACTION DIRECTIVE · STEP {activeStepIndex + 1} OF {stepsList.length}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">Standard Procedure</span>
                      </div>
                      <h3 className="text-sm font-bold leading-snug text-white">
                        {currentStepItem.title || currentStepItem.question || `Step ${activeStepIndex + 1}`}
                      </h3>
                      {currentStepItem.sub_cues && currentStepItem.sub_cues.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1">
                          {currentStepItem.sub_cues.map((cue: string, cIdx: number) => (
                            <div key={cIdx} className="flex items-center gap-1.5 text-xs text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              <span>{cue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PILLAR 2: Operational Rationale (Purple Theme) */}
                    {(currentStepItem.why || currentStepItem.desc) && (
                      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 shadow-sm flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <ShieldCheck size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">
                              2. OPERATIONAL RATIONALE · WHY IT MATTERS
                            </span>
                            <span className="text-[9px] font-bold text-purple-600">Error Prevention</span>
                          </div>
                          <p className="text-xs font-semibold text-purple-900 leading-relaxed">
                            {currentStepItem.why || currentStepItem.desc}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* PILLAR 3: Field Watch-Out & Prohibited Rules (Emerald Theme) */}
                    {(currentStepItem.coachTip || currentStepItem.hint) && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-sm flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Lightbulb size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                              3. FIELD WATCH-OUT · ON-THE-FLOOR PRACTICE
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600">Practical Application</span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-900 leading-relaxed">
                            {currentStepItem.coachTip || currentStepItem.hint}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    onClick={handlePrev}
                    className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Next: Your Tools <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SLIDE 4: Tools & Equipment */}
        {currentSlide === 3 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[28%] bg-[#FFE6D2] relative flex items-center justify-center p-4">
              <button
                onClick={() => handleAudioSpeak('Tools and Equipment')}
                className="absolute top-3 right-4 w-10 h-10 rounded-full bg-[#0E1116] text-white flex items-center justify-center cursor-pointer"
              >
                <Volume2 size={18} />
              </button>
              <ClayArt type="box" size={90} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-5 p-6 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h1 className="text-xl font-bold text-[#0E1116]">Process Tools & Guideline</h1>
                  <span className="text-xs font-bold text-[#F27A1A] bg-[#FFE6D2] px-3 py-1 rounded-full">
                    SOP Requirements
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-h-[46vh] overflow-y-auto">
                  {(dynamicTools.length > 0
                    ? dynamicTools.map((t, idx) => ({
                        id: `t_${idx}`,
                        name: t.name,
                        shortDesc: t.purpose,
                        whatItIs: t.what_it_is,
                        whatItsFor: t.purpose,
                        neverDo: t.never_do,
                        iconName: 'clipboard',
                      }))
                    : WAREHOUSE_TOOLS
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        sounds.playTap();
                        setSelectedTool(t);
                      }}
                      className="p-3 bg-[#F7F7F5] border border-[#E6E8EC] rounded-2xl text-left hover:border-[#0E1116] active:scale-98 transition-all cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                        <ClayArt type="clipboard" size={24} />
                      </div>
                      <span className="text-xs font-bold text-[#0E1116] block">{t.name}</span>
                      <span className="text-[10px] text-[#66726B] font-semibold block truncate">
                        {t.shortDesc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  Golden Rules <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: Interactive Visual Decision Gate Matrix */}
        {currentSlide === 4 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[22%] bg-[#E8E1FF] relative flex items-center justify-center p-3">
              <button
                onClick={() => handleAudioSpeak('Inspection and Decision Outcome Gates')}
                className="absolute top-3 right-4 w-10 h-10 rounded-full bg-[#0E1116] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Volume2 size={18} />
              </button>
              <ClayArt type="medal" size={75} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-5 p-5 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h1 className="text-xl font-bold text-[#0E1116]">Decision Point & Outcome Gates</h1>
                  <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    SOP Decision Tree
                  </span>
                </div>

                {/* Interactive Decision Outcome Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2.5 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Outcomes' },
                    { id: 'accept', label: '✓ Accept (Pass)' },
                    { id: 'reject', label: '✕ Reject (Fail)' },
                    { id: 'pause', label: '⚠️ Pause & Escalate' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        sounds.playTap();
                        setActiveDecisionGate(tab.id as any);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                        activeDecisionGate === tab.id
                          ? 'bg-[#0E1116] text-white shadow-md'
                          : 'bg-[#F7F7F5] text-[#3D4652] hover:bg-[#E6E8EC] border border-[#E6E8EC]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Visual Decision Gate Cards Grid */}
                <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                  {/* GATE 1: ACCEPT / PASS CARD */}
                  {(activeDecisionGate === 'all' || activeDecisionGate === 'accept') && (
                    <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ✓
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                            ACCEPT CONDITION · PASS GATE
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Standard Approval
                        </span>
                      </div>
                      <div className="text-xs text-emerald-900 font-semibold mb-2">
                        Pass Trigger: Meets all written SOP requirements & handheld confirmation.
                      </div>
                      <ul className="space-y-1.5 text-xs text-emerald-950 font-medium">
                        {(dynamicRules.length > 0
                          ? dynamicRules.map((r) => r.text)
                          : [
                              'Verify active order on handheld before greeting customer',
                              'Inspect item condition, physical seal & label integrity',
                              'Match exact SKU digits and serial identifiers',
                              'Record transaction in app upon successful verification',
                            ]
                        ).map((ruleText, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold mt-0.5">•</span>
                            <span>{ruleText}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2.5 pt-2 border-t border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Action Outcome: Confirm transaction in app and complete transfer.</span>
                      </div>
                    </div>
                  )}

                  {/* GATE 2: REJECT / FAIL CARD */}
                  {(activeDecisionGate === 'all' || activeDecisionGate === 'reject') && (
                    <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ✕
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                            REJECT CONDITION · DISPOSITION GATE
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          Non-Compliant
                        </span>
                      </div>
                      <div className="text-xs text-rose-900 font-semibold mb-2">
                        Reject Trigger: Damaged packaging, missing seals, or SKU mismatch.
                      </div>

                      {/* FIRM PROHIBITED LINE */}
                      <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 mb-2 text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertCircle size={15} className="text-rose-600 shrink-0" />
                        <span>PROHIBITED: NEVER improvise rules, NEVER guarantee verbal refund timelines.</span>
                      </div>

                      <ul className="space-y-1.5 text-xs text-rose-950 font-medium">
                        {(dynamicMistakes.length > 0
                          ? dynamicMistakes
                          : [
                              'Do not accept unlisted items without handheld order verification',
                              'Never override system warnings without supervisor sign-off',
                              'Do not mark complete on invented or assumed details',
                            ]
                        ).map((mistakeText, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-rose-600 font-bold mt-0.5">•</span>
                            <span>{mistakeText}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2.5 pt-2 border-t border-rose-200 text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Action Outcome: Log rejection reason code and state standard refusal wording.</span>
                      </div>
                    </div>
                  )}

                  {/* GATE 3: PAUSE & ESCALATE CARD */}
                  {(activeDecisionGate === 'all' || activeDecisionGate === 'pause') && (
                    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            ⚠️
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                            PAUSE & ESCALATE CONDITION · HOLD GATE
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Supervisor Hold
                        </span>
                      </div>
                      <div className="text-xs text-amber-900 font-semibold mb-2">
                        Pause Trigger: System error, unlisted SOP condition, or disputed customer claim.
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-200 text-xs font-semibold text-amber-950">
                        Mandatory Action: Halt transaction immediately. Do NOT force completion or guess procedure. Contact shift supervisor directly for operational guidance.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  What Can Go Wrong <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 6: What Can Go Wrong */}
        {currentSlide === 5 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[40%] bg-[#FBE0EA] relative flex items-center justify-center p-6">
              <button
                onClick={() => handleAudioSpeak('What can go wrong? Stop. Check. Act correctly.')}
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#0E1116] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Volume2 size={22} />
              </button>
              <ClayArt type="safety" size={130} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-6 p-6 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <h1 className="text-2xl font-bold text-[#0E1116] mb-3">What Can Go Wrong?</h1>
                <div className="space-y-2 mb-4">
                  {(dynamicMistakes.length > 0
                    ? dynamicMistakes
                    : [
                        'Skipping verification steps without checking procedure',
                        'Guessing without consulting written SOP',
                        'Deviating from approved operational standard',
                      ]
                  ).map((mistake, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#FBE0EA]/60 border border-[#FBE0EA] flex items-center gap-2.5 text-xs font-bold text-[#991B1B]"
                    >
                      <AlertCircle size={18} className="text-[#E5484D] shrink-0" />
                      <span>{mistake}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-[#E5484D] text-white rounded-2xl text-center font-bold text-sm shadow-md">
                  Don't guess. Stop. Check. Act correctly.
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  Meet Guruji <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 7: Meet Guruji */}
        {currentSlide === 6 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[40%] bg-[#FFF2C9] relative flex items-center justify-center p-6">
              <button
                onClick={() =>
                  handleAudioSpeak(
                    `Meet Guruji, your operational work coach for ${lesson?.title || 'this SOP'}.`
                  )
                }
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#0E1116] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Volume2 size={22} />
              </button>
              <ClayArt type="guru" size={135} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-6 p-6 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <h1 className="text-2xl font-bold text-[#0E1116] mb-2">Meet Guruji Coach</h1>
                <div className="p-4 rounded-2xl bg-[#FFF2C9]/60 border border-[#FFF2C9] text-sm font-semibold text-[#854D0E] mb-4 leading-relaxed">
                  "I'm with you on the floor. If you ever hesitate, tap 'Show me' or ask for a hint. We execute safely together!"
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      sounds.playTap();
                      sounds.speak(`Hint for ${lesson?.title || 'this step'}: Check your written SOP checklist.`);
                    }}
                    className="p-3 rounded-2xl border border-[#E6E8EC] bg-[#F7F7F5] font-bold text-xs text-[#0E1116] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <HelpCircle size={16} className="text-[#2F6FED]" />
                    See a hint
                  </button>
                  <button
                    onClick={() => {
                      sounds.playTap();
                      sounds.speak('Calling trainer supervisor to station.');
                    }}
                    className="p-3 rounded-2xl border border-[#E6E8EC] bg-[#F7F7F5] font-bold text-xs text-[#0E1116] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <UserCheck size={16} className="text-[#1FA55E]" />
                    Ask trainer
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-full bg-[#0E1116] text-white text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  Ready to Practice <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 8: Now You Do It */}
        {currentSlide === 7 && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
            <div className="h-[44%] bg-[#DCEBFF] relative flex items-center justify-center p-6">
              <button
                onClick={() => handleAudioSpeak('Now you do it! Start the interactive simulation.')}
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-[#0E1116] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <Volume2 size={22} />
              </button>
              <ClayArt type="clipboard" size={135} />
            </div>

            <div className="flex-1 bg-white rounded-t-[32px] -mt-6 p-6 shadow-sm flex flex-col justify-between overflow-y-auto z-10">
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#F27A1A] bg-[#FFE6D2] px-3 py-1 rounded-full mb-2">
                  Interactive Practice
                </span>
                <h1 className="text-3xl font-bold text-[#0E1116] leading-tight mb-2">
                  Now You Do It.
                </h1>
                <p className="text-base font-semibold text-[#3D4652] leading-relaxed mb-4">
                  Practice the operational steps for {lesson?.title || 'this SOP'} with live feedback from Guruji.
                </p>

                <div className="p-3 bg-[#F7F7F5] rounded-2xl border border-[#E6E8EC] flex justify-around text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#66726B] block">Steps</span>
                    <span className="text-lg font-bold text-[#0E1116]">{lesson?.stepsCount || 5}</span>
                  </div>
                  <div className="w-px bg-[#E6E8EC]" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#66726B] block">Target</span>
                    <span className="text-lg font-bold text-[#1FA55E]">100%</span>
                  </div>
                  <div className="w-px bg-[#E6E8EC]" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#66726B] block">Mode</span>
                    <span className="text-lg font-bold text-[#2F6FED]">Coach</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-[#E6E8EC] bg-white flex items-center justify-center text-[#0E1116] cursor-pointer"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={() => {
                    sounds.playTap();
                    onStartSimulation();
                  }}
                  className="flex-1 h-14 rounded-full bg-[#0E1116] hover:bg-black text-white text-base font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-lg cursor-pointer"
                >
                  I'm Ready → Show Me <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ToolDetailModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
    </div>
  );
}
