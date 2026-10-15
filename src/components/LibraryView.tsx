import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Lesson, CategoryType } from '../types';
import LessonCard from './LessonCard';
import { sounds } from '../utils/audio';

interface LibraryViewProps {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson) => void;
}

export default function LibraryView({ lessons, onSelectLesson }: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('All');

  const categories: CategoryType[] = ['All', 'Picking', 'Packing', 'Safety', 'Inventory'];

  const filteredLessons = lessons.filter((lesson) => {
    const matchesCategory = activeCategory === 'All' || lesson.category === activeCategory;
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4.5 sm:px-5 pt-3 pb-28 text-white relative z-10 animate-in fade-in duration-200">
      {/* 1. Header Typography */}
      <div className="mb-5 px-0.5">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Lesson Library</h1>
        <p className="text-sm font-normal text-[#8E8E93] mt-1 tracking-tight">
          Complete warehouse curriculum & drills
        </p>
      </div>

      {/* 2. Search Bar (Centered text & clean dark pill container) */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search lessons, tools, or procedures..."
          className="w-full h-12 px-4 rounded-2xl bg-[#14161E] border border-white/[0.08] text-sm text-center font-normal text-white placeholder:text-[#636366] placeholder:text-center focus:outline-none focus:border-white/20 transition-all shadow-inner"
        />
      </div>

      {/* 3. Category Filter Pills */}
      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                sounds.playTap();
                setActiveCategory(cat);
              }}
              className={`px-5 py-2 rounded-full text-sm shrink-0 transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-[#181A22] text-[#8E8E93] hover:text-white border border-white/[0.06] font-normal'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. Verified 2-Column Cards Grid */}
      {filteredLessons.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              title={lesson.title}
              subtitle={lesson.subtitle}
              color={lesson.color}
              artType={lesson.artType}
              progress={lesson.progress}
              onClick={() => {
                sounds.playTap();
                onSelectLesson(lesson);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#0E1016] rounded-3xl border border-white/10 p-6">
          <Sparkles className="mx-auto text-white/40 mb-3" size={32} />
          <p className="text-base font-bold text-white">No lessons found</p>
          <p className="text-xs text-[#8E8E93] mt-1">Try another search term or select "All"</p>
        </div>
      )}
    </div>
  );
}
