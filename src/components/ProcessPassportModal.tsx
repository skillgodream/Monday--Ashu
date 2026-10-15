import React, { useState } from 'react';
import { X, ShieldCheck, Check, AlertCircle, FileText, Sparkles, BookOpen, UserCheck, Eye, HelpCircle } from 'lucide-react';
import { ProcessPassport, PerceiveObservation } from '../types';
import { sounds } from '../utils/audio';

interface ProcessPassportModalProps {
  isOpen: boolean;
  passport: ProcessPassport;
  perceiveResult: PerceiveObservation;
  onClose: () => void;
  onApprovePassport: (updatedPassport: ProcessPassport) => void;
}

export default function ProcessPassportModal({
  isOpen,
  passport,
  perceiveResult,
  onClose,
  onApprovePassport,
}: ProcessPassportModalProps) {
  const [currentPassport, setCurrentPassport] = useState<ProcessPassport>(passport);
  const [activeTab, setActiveTab] = useState<'passport' | 'perceive' | 'questions' | 'json'>('passport');
  const [trainerNotes, setTrainerNotes] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleApprove = () => {
    sounds.playTap();
    sounds.playCorrect();
    const approved: ProcessPassport = {
      ...currentPassport,
      is_approved: true,
      fields: {
        ...currentPassport.fields,
        plain_definition: { ...currentPassport.fields.plain_definition, status: 'approved' },
        where_it_fits: { ...currentPassport.fields.where_it_fits, status: 'approved' },
        escalation: { ...currentPassport.fields.escalation, status: 'approved' },
        why_it_matters: currentPassport.fields.why_it_matters.map((f) => ({ ...f, status: 'approved' })),
        tools: currentPassport.fields.tools.map((f) => ({ ...f, status: 'approved' })),
        terms: currentPassport.fields.terms.map((f) => ({ ...f, status: 'approved' })),
        golden_rules: currentPassport.fields.golden_rules.map((f) => ({ ...f, status: 'approved' })),
        safety_notes: currentPassport.fields.safety_notes.map((f) => ({ ...f, status: 'approved' })),
      },
      questions_for_trainer: [],
    };
    onApprovePassport(approved);
    sounds.speak('Process passport approved and published by lead trainer.');
    onClose();
  };

  const copyJsonToClipboard = () => {
    sounds.playTap();
    navigator.clipboard.writeText(JSON.stringify(currentPassport, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1116]/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E8EC] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0E1116]">Process Passport (P0)</h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    currentPassport.is_approved
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {currentPassport.is_approved ? 'APPROVED · PUBLISHED' : 'DRAFT · PREVIEW ONLY'}
                </span>
              </div>
              <p className="text-[11px] text-[#66726B] font-medium">
                Org approved basics sheet for {currentPassport.process_name}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#0E1116]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-[#E6E8EC] pb-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('passport')}
            className={`pb-1 px-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'passport'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Passport Fields
          </button>
          <button
            onClick={() => setActiveTab('perceive')}
            className={`pb-1 px-3 border-b-2 transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'perceive'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye size={14} /> P1 Vision
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-1 px-3 border-b-2 transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle size={14} /> Review ({currentPassport.questions_for_trainer.length})
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-1 px-3 border-b-2 transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Raw JSON
          </button>
        </div>

        {/* Tab 1: Passport Fields */}
        {activeTab === 'passport' && (
          <div className="space-y-3.5 text-xs">
            {/* Plain Definition */}
            <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>1. Plain Definition</span>
                <span className="font-mono text-indigo-600">[{currentPassport.fields.plain_definition.basis}]</span>
              </div>
              <p className="font-bold text-[#0E1116] text-sm leading-snug">
                {currentPassport.fields.plain_definition.text}
              </p>
            </div>

            {/* Why It Matters */}
            <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                2. Why It Matters
              </span>
              {currentPassport.fields.why_it_matters.length > 0 ? (
                currentPassport.fields.why_it_matters.map((item, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white border border-[#E6E8EC] font-semibold">
                    <span className="font-bold text-indigo-600 block">{item.who_depends}</span>
                    <span className="text-slate-700">{item.impact}</span>
                  </div>
                ))
              ) : (
                <p className="text-amber-800 bg-amber-50 p-2 rounded-xl font-medium border border-amber-200">
                  ⚠️ Not in sources. Needs trainer input before publishing.
                </p>
              )}
            </div>

            {/* Tools */}
            <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                3. Tools & Devices
              </span>
              <div className="grid grid-cols-2 gap-2">
                {currentPassport.fields.tools.map((t, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-[#E6E8EC]">
                    <span className="font-bold text-[#0E1116] block">{t.name}</span>
                    <span className="text-[11px] text-slate-600 block truncate">{t.purpose}</span>
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">Never: {t.never_do}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Golden Rules */}
            <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                4. Golden Rules (Non-negotiable)
              </span>
              {currentPassport.fields.golden_rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#E6E8EC] font-bold text-[#0E1116]">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <span>{rule.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: P1 Perceive Vision Analysis */}
        {activeTab === 'perceive' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-700 block">Vision Confidence Score</span>
                <span className="text-xl font-black text-indigo-900">
                  {Math.round(perceiveResult.quality.score * 100)}% Quality
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-bold uppercase text-[10px]">
                {perceiveResult.recommended_action}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500 block">Detected Tool Candidates</span>
              {perceiveResult.tool_candidates.map((tc, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0 font-bold">
                  <span>{tc.label}</span>
                  <span className="font-mono text-slate-500">{Math.round(tc.confidence * 100)}% match</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500 block">OCR Readable Text Extracted</span>
              {perceiveResult.readable_text.map((rt, idx) => (
                <p key={idx} className="text-[11px] font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  "{rt.text}"
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Questions for Trainer */}
        {activeTab === 'questions' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
              <span className="font-black uppercase tracking-wider text-[10px] text-amber-700 block">
                Trainer Sign-Off Requirements
              </span>
              <p className="font-medium text-xs">
                To move this process passport from <b>Draft (Preview Only)</b> to <b>Approved (Published)</b>, confirm the items below:
              </p>
            </div>

            {currentPassport.questions_for_trainer.length > 0 ? (
              currentPassport.questions_for_trainer.map((q, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white border border-[#E6E8EC] space-y-1">
                  <span className="font-bold uppercase text-[10px] text-indigo-600 block">
                    Field: {q.field}
                  </span>
                  <p className="font-bold text-[#0E1116]">{q.question}</p>
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-center">
                ✓ All passport fields verified against sources. Ready for approval!
              </div>
            )}

            <textarea
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="Add optional trainer approval notes or floor instructions..."
              className="w-full p-3 rounded-xl border border-[#E6E8EC] text-xs font-medium focus:outline-none focus:border-indigo-500 h-20"
            />
          </div>
        )}

        {/* Tab 4: Raw JSON View */}
        {activeTab === 'json' && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center bg-slate-900 text-slate-200 p-2.5 rounded-t-xl">
              <span className="font-mono text-[10px] uppercase font-bold text-indigo-400">
                P0 Process Passport Output JSON
              </span>
              <button
                onClick={copyJsonToClipboard}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-all"
              >
                {copied ? 'Copied ✓' : 'Copy JSON'}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-emerald-400 rounded-b-xl overflow-x-auto font-mono text-[11px] leading-relaxed max-h-60">
              {JSON.stringify(currentPassport, null, 2)}
            </pre>
          </div>
        )}
        <div className="pt-2 border-t border-[#E6E8EC] space-y-2">
          {!currentPassport.is_approved ? (
            <button
              onClick={handleApprove}
              className="w-full h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <UserCheck size={18} /> Approve & Publish Process Passport
            </button>
          ) : (
            <div className="p-3 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center gap-2">
              <Check size={16} className="text-emerald-600" />
              <span>Approved & Published by Lead Trainer Marcus</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
