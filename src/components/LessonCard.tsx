import React from 'react';
import { 
  Scan, 
  Package, 
  Layers, 
  ShieldCheck, 
  ClipboardCheck, 
  ShoppingCart, 
  Sparkles 
} from 'lucide-react';

interface LessonCardProps {
  title: string;
  subtitle: string;
  color?: string;
  icon?: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  artType?: 'scanner' | 'box' | 'tote' | 'safety' | 'clipboard' | 'trolley';
  progress?: number;
  onClick?: () => void;
}

export default function LessonCard({
  title,
  subtitle,
  icon: CustomIcon,
  artType,
  progress = 0,
  onClick,
}: LessonCardProps) {
  // Map specific theme accent colors precisely matching the design reference:
  // - Housekeeping / trolley: Warm Amber (#F59E0B)
  // - Picking / tote: Electric Cyan (#38BDF8)
  // - Safety / shield: Emerald Green (#34D399)
  // - Packing / box: Lavender Purple (#C084FC)
  // - Inventory / clipboard: Indigo (#818CF8)
  const getThemeConfig = () => {
    switch (artType) {
      case 'trolley':
        return {
          stroke: '#F59E0B',
          track: 'rgba(245, 158, 11, 0.25)',
          Icon: ShoppingCart,
        };
      case 'tote':
        return {
          stroke: '#38BDF8',
          track: 'rgba(56, 189, 248, 0.25)',
          Icon: Layers,
        };
      case 'safety':
        return {
          stroke: '#34D399',
          track: 'rgba(52, 211, 153, 0.25)',
          Icon: ShieldCheck,
        };
      case 'box':
        return {
          stroke: '#C084FC',
          track: 'rgba(192, 132, 252, 0.25)',
          Icon: Package,
        };
      case 'clipboard':
        return {
          stroke: '#818CF8',
          track: 'rgba(129, 140, 248, 0.25)',
          Icon: ClipboardCheck,
        };
      case 'scanner':
        return {
          stroke: '#60A5FA',
          track: 'rgba(96, 165, 250, 0.25)',
          Icon: Scan,
        };
      default:
        return {
          stroke: '#38BDF8',
          track: 'rgba(56, 189, 248, 0.25)',
          Icon: Sparkles,
        };
    }
  };

  const { stroke, track, Icon: DefaultIcon } = getThemeConfig();

  // Circular ring geometry
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <button
      onClick={onClick}
      className="group relative text-left w-full p-4 sm:p-5 rounded-[24px] bg-[#0E1016] hover:bg-[#131620] active:scale-[0.98] border border-white/[0.08] hover:border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden min-h-[178px]"
    >
      {/* Top Row: Circular Ring with Themed Icon + Right Percentage Pill */}
      <div className="flex items-center justify-between w-full relative z-10">
        {/* Apple Activity Ring Dial */}
        <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
            {/* Background track circle */}
            <circle
              cx="22"
              cy="22"
              r={radius}
              stroke={track}
              strokeWidth="2.8"
              fill="rgba(0, 0, 0, 0.25)"
            />
            {/* Active progress arc */}
            {progress > 0 && (
              <circle
                cx="22"
                cy="22"
                r={radius}
                stroke={stroke}
                strokeWidth="2.8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>

          {/* Centered Themed Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {CustomIcon ? (
              <CustomIcon size={19} style={{ color: stroke }} />
            ) : (
              <DefaultIcon size={19} style={{ color: stroke }} />
            )}
          </div>
        </div>

        {/* Top-Right Percentage Badge */}
        <div className="px-2.5 py-0.5 rounded-full bg-[#181B24] border border-white/[0.06] text-[11px] font-medium text-white/80 shrink-0">
          {progress}%
        </div>
      </div>

      {/* Middle Text Area */}
      <div className="relative z-10 w-full mt-4">
        <h3 className="text-[15px] sm:text-base font-bold text-white leading-snug tracking-tight line-clamp-2">
          {title}
        </h3>
        <p className="text-xs font-normal text-[#8E8E93] mt-1 line-clamp-1">
          {subtitle}
        </p>

        {/* Bottom Horizontal Progress Bar */}
        <div className="w-full h-[3.5px] bg-white/[0.08] rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </button>
  );
}
