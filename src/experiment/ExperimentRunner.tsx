import React, { useState } from 'react';
import { mockLessons } from './MockData';
import { planSlides } from './Planner';
import { ExperiencePlayer } from './ExperiencePlayer';
import { SlidePlan } from './types';

export function ExperimentRunner({ onBack }: { onBack?: () => void }) {
  const [activePlan, setActivePlan] = useState<SlidePlan | null>(null);

  return (
    <div className="p-6 bg-[#F4F6FC] min-h-screen">
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-[#0F1B3D]">Teach Me: Reference Experience</h1>
          <p className="text-sm text-[#3C4660]">1:1 Port of teach-me-slides-reference.html</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-[#D5DCEC] rounded-full text-sm font-bold text-[#0F1B3D] hover:bg-slate-50 transition-all shadow-sm"
          >
            ← Back to App
          </button>
        )}
      </div>

      {activePlan && (
        <ExperiencePlayer plan={activePlan} onClose={() => setActivePlan(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {mockLessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => setActivePlan(planSlides(lesson))}
            className="p-6 bg-white rounded-2xl shadow-sm border border-[#D5DCEC] hover:border-[#3B4FE0] text-left transition-all group"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-[#3B4FE0] mb-1">
              Lesson
            </div>
            <h2 className="text-lg font-black text-[#0F1B3D]">{lesson.title}</h2>
            <p className="text-sm text-[#3C4660] mt-1 line-clamp-2">{lesson.description}</p>
            <div className="mt-4 text-xs font-bold text-[#3B4FE0] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Teach Me Experience →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
