import React from 'react';

export default function SheetOverArt({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-white)] rounded-t-[var(--radius-sheet)] shadow-[var(--shadow-soft)] -mt-8 p-6 flex-1 relative z-10">
      {children}
    </div>
  );
}
