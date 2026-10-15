import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[22rem]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  children,
  className,
  header,
  icon: Icon,
  title,
  description,
  badge,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title?: string;
  description?: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-[32px] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300',
        // Volumetric Glassmorphism / Linear styling:
        'bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_12px_36px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]',
        'dark:bg-slate-900/40 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:hover:border-white/20',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Background Accent Shimmer Glow */}
      <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-2xl group-hover:from-indigo-500/20 group-hover:via-purple-500/20 transition-all duration-500 pointer-events-none" />

      {/* Top Header / Visual Asset */}
      {header && <div className="relative z-10 w-full mb-6">{header}</div>}

      {/* Content Slot */}
      {children}

      {/* Footer Meta */}
      {(title || description || Icon) && (
        <div className="relative z-10 mt-auto pt-4 space-y-2">
          <div className="flex items-center justify-between">
            {Icon && (
              <div className="w-12 h-12 rounded-2xl bg-slate-900/5 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-slate-900 dark:text-white transition-transform group-hover:scale-105 duration-300">
                <Icon size={24} />
              </div>
            )}
            {badge && (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/10">
                {badge}
              </span>
            )}
          </div>

          {title && (
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white mt-3">
              {title}
            </h3>
          )}

          {description && (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
