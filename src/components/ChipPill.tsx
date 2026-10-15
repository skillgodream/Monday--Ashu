import React from 'react';

export default function ChipPill({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  return (
    <div className={`px-3 py-1 rounded-[var(--radius-pill)] bg-[var(--color-${color})] text-[var(--color-white)] text-[14px] font-semibold inline-block`}>
      {children}
    </div>
  );
}
