import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, TrendingUp, Star } from 'lucide-react';
const gurujiImg = "/Coachguru.png";

interface MeetGurujiScreenProps {
  onContinue: () => void;
}

export const MeetGurujiScreen: React.FC<MeetGurujiScreenProps> = ({ onContinue }) => {
  return (
    <div 
      className="relative w-full min-h-[100dvh] sm:min-h-[780px] bg-black text-white overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none"
      onClick={onContinue}
    >
      {/* 1. Pure Apple Black Minimal Ambient Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-white/[0.02] blur-[100px]" />
      </div>

      {/* 2. Center Hero Koala Coach Visual with Rounded Dark Glass Card (matching Screenshot 2) */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-4 shrink-0">
        <div className="relative w-76 h-76 sm:w-[380px] sm:h-[380px] flex items-center justify-center">
          {/* Clean Rounded Dark Glass Card Contour */}
          <div className="absolute inset-0 rounded-[44px] bg-white/[0.03] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl" />
          
          {/* 3D Koala Coach Avatar */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="relative z-10 w-full h-full flex items-center justify-center p-3 scale-110 sm:scale-120"
          >
            <img
              src="/Coachguru.png"
              alt="Guruji Koala Coach"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.9)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gurujiImg || "/guruji 1.png";
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* 3. Bottom Content Block: Pure Apple Dark Typography & CTA */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center text-center space-y-4 pb-4 shrink-0 bg-transparent">
        {/* Headline & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            Guruji
          </h1>
          <p className="text-[13px] text-slate-400 font-normal leading-relaxed max-w-[290px] sm:max-w-[320px] mx-auto pt-1">
            Frontline Coach
          </p>
        </div>

        {/* 4. Small Feature Indicators */}
        <div className="flex items-center justify-center gap-3 w-full py-1">
          {/* Indicator 1 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xs">
            <Target className="w-3 h-3 text-sky-400" />
            <span className="text-[10px] font-semibold text-slate-300">Learn</span>
          </div>

          {/* Indicator 2 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xs">
            <Zap className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-semibold text-slate-300">Guide</span>
          </div>

          {/* Indicator 3 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xs">
            <TrendingUp className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-semibold text-slate-300">Track</span>
          </div>

          {/* Indicator 4 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xs">
            <Star className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-semibold text-slate-300">Grow</span>
          </div>
        </div>

        {/* 5. Primary CTA Button: Sleek Translucent Glass Tap to explore */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation();
            onContinue();
          }}
          className="w-full h-12 sm:h-13 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 backdrop-blur-2xl text-white font-semibold text-sm sm:text-base border border-white/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 shadow-lg"
        >
          <span>Tap to explore</span>
          <span className="text-lg">→</span>
        </motion.button>
      </div>
    </div>
  );
};

