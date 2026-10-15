import React from 'react';

export default function HeroArt({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className={`relative w-full h-[45%] flex items-center justify-center bg-[var(--color-${color})] rounded-b-[var(--radius-sheet)]`}>
      <div className="w-[200px] h-[200px] rounded-full bg-[var(--color-white)] opacity-20 absolute" />
      {children}
    </div>
  );
}
