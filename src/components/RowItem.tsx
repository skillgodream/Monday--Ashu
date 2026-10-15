import React from 'react';

export default function RowItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--color-divider)]">
      <div className="flex items-center gap-3">
        <div className="text-[var(--color-secondary)]"><Icon size={24} /></div>
        <span className="text-[18px] font-semibold text-[var(--color-ink)]">{label}</span>
      </div>
      <span className="text-[18px] font-semibold text-[var(--color-secondary)]">{value}</span>
    </div>
  );
}
