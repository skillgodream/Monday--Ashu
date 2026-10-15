import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'glow';
  size?: 'default' | 'sm' | 'lg' | 'pill' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default:
        'bg-slate-900 text-white hover:bg-black shadow-md hover:shadow-lg dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200',
      secondary:
        'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
      outline:
        'border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-900 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800',
      ghost:
        'hover:bg-slate-100 text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
      glass:
        'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/15 shadow-sm active:scale-98',
      glow:
        'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 text-white shadow-[0_0_25px_rgba(122,90,248,0.35)] hover:shadow-[0_0_35px_rgba(122,90,248,0.55)]',
    };

    const sizes = {
      default: 'h-11 px-5 py-2 text-sm',
      sm: 'h-9 px-3.5 text-xs',
      lg: 'h-14 px-8 text-base',
      pill: 'h-14 px-8 text-base rounded-full',
      icon: 'h-11 w-11 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-bold tracking-tight rounded-2xl transition-all duration-300 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
