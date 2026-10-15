import React from 'react';
import { Award, CheckCircle2, TrendingUp, Zap, RotateCcw } from 'lucide-react';
import { Lesson } from '../types';
import ClayArt from './ClayArt';
import { sounds } from '../utils/audio';

interface ProgressViewProps {
  lessons: Lesson[];
  onStartSimulation: (lessonId: string) => void;
}

export default function ProgressView({ lessons, onStartSimulation }: ProgressViewProps) {
  const avgMastery = Math.round(
    lessons.reduce((acc, curr) => acc + curr.masteryPercentage, 0) / lessons.length
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 pt-4 pb-28 space-y-5 text-white relative z-10 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Your Progress</h1>
        <p className="text-sm font-normal text-white/60 mt-1">
          Mastery metrics & floor readiness evaluation
        </p>
      </div>

      {/* Hero Readiness Card - Apple Translucent Dark Glass */}
      <div className="bg-[#0E1017]/85 backdrop-blur-2xl rounded-3xl p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            FLOOR READY
          </span>
          <span className="text-xs font-medium text-white/60">Level 2 Certified</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.12)" strokeWidth="7" fill="transparent" />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#FFFFFF"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 - (avgMastery / 100) * 2 * Math.PI * 40}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">{avgMastery}%</span>
              <span className="text-[9px] uppercase font-bold text-white/50">Mastery</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Warehouse Floor Qualification</h2>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              3 of 4 core modules mastered with high accuracy. Ready for active shift picking.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.playTap();
            onStartSimulation('picking-101');
          }}
          className="w-full h-12 rounded-2xl bg-white text-black font-bold text-sm mt-5 flex items-center justify-center gap-2 hover:bg-white/90 active:scale-98 transition-all shadow-md cursor-pointer"
        >
          <RotateCcw size={16} /> Run Shift Readiness Drill
        </button>
      </div>

      {/* Module Breakdown List */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
          Module Competency Breakdown
        </h3>
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-4 bg-[#0E1017]/80 hover:bg-[#151923]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-md flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <ClayArt type={lesson.artType} size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-white/60">
                    <span>{lesson.stepsCount} steps</span>
                    <span>·</span>
                    <span className="text-emerald-400 font-medium">
                      {lesson.masteryPercentage}% mastery
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playTap();
                  onStartSimulation(lesson.id);
                }}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white active:scale-95 transition-all cursor-pointer"
              >
                Practice
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Badges Earned */}
      <div className="bg-[#0E1017]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Award size={18} className="text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
            Earned Badges
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-white">
          <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Zero Short Error</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <span>Sub-2min Pick Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
