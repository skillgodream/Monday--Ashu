import React from 'react';
import { Home, BookOpen, BarChart2, User, ShieldCheck } from 'lucide-react';
import { TabType } from '../types';
import { sounds } from '../utils/audio';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export default function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const items: { id: TabType; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'pilot', label: 'Pilot', icon: ShieldCheck },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md h-[68px] rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-around px-3 z-40 bg-black/65 backdrop-blur-2xl border border-white/12 text-white transition-all duration-300">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => {
              sounds.playTap();
              onSelectTab(item.id);
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-full transition-all duration-200 active:scale-95 cursor-pointer ${
              isActive
                ? 'text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-white/15 text-white border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.15)]'
                  : 'bg-transparent'
              }`}
            >
              <Icon size={19} className={isActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
            </div>
            <span
              className={`text-[10px] tracking-tight ${
                isActive ? 'font-extrabold text-white' : 'font-medium text-white/50'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
