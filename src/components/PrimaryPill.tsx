import React from 'react';

export default function PrimaryPill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full h-[56px] flex items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-ink)] text-[var(--color-white)] text-[18px] font-semibold active:scale-98 transition-transform"
    >
      {children}
    </button>
  );
}
