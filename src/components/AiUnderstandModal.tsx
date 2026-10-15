import React, { useEffect, useState } from 'react';
import { Eye, Brain, Sparkles, Check, ArrowRight, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { sounds } from '../utils/audio';

interface AiUnderstandModalProps {
  sopTitle: string;
  confirmationText?: string;
  filename?: string;
  isOpen: boolean;
  onComplete: () => void;
}

export default function AiUnderstandModal({
  sopTitle,
  confirmationText = 'We read 1 page · 320 words',
  filename,
  isOpen,
  onComplete,
}: AiUnderstandModalProps) {
  const [phase, setPhase] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) {
      setPhase(0);
      setIsTransitioning(false);
      return;
    }

    // Step 1: Observe (0 to 600ms)
    const t1 = setTimeout(() => {
      setPhase(1);
    }, 600);

    // Step 2: Understand (600 to 1200ms)
    const t2 = setTimeout(() => {
      setPhase(2);
      sounds.playCorrect();
    }, 1200);

    // Prepare to transition instead of immediate complete
    const t3 = setTimeout(() => {
      setIsTransitioning(true);
      onCompleteRef.current();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1116]/75 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
        
        {/* Animated AI Core Icon */}
        <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#1773E2] to-[#7A5AF8] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 relative">
          {isTransitioning ? (
             <Sparkles size={32} className="animate-pulse" />
          ) : (
            <>
              {phase === 0 && <Eye size={32} className="animate-pulse" />}
              {phase === 1 && <Brain size={32} className="animate-bounce" />}
              {phase === 2 && <Sparkles size={32} />}
            </>
          )}
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2F6FED] bg-[#DCEBFF] px-3 py-1 rounded-full">
            {isTransitioning ? 'Assembling training...' : 'AI Pipeline Processing'}
          </span>
          
          <h2 className="text-xl font-bold text-[#0E1116] mt-2 leading-snug">
            {isTransitioning ? 'Building your experience' : sopTitle}
          </h2>

          {/* Extraction Confirmation Display */}
          {!isTransitioning && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
              <FileText size={12} className="text-emerald-600 shrink-0" />
              <span>{confirmationText}</span>
            </div>
          )}
          {filename && !isTransitioning && (
            <p className="text-[10px] text-slate-400 font-semibold mt-1 truncate max-w-[240px] mx-auto">
              Source: {filename}
            </p>
          )}
        </div>

        {/* 3 Step Sequence */}
        {!isTransitioning && (
          <div className="w-full space-y-2 text-left">
            {/* Step 1: Observe */}
            <div
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                phase >= 0
                  ? 'bg-[#DDF3E6] border-[#1FA55E]/40 text-[#14532D]'
                  : 'bg-[#F7F7F5] border-[#E6E8EC] text-[#66726B]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  phase >= 1 ? 'bg-[#1FA55E] text-white' : 'bg-emerald-200 text-emerald-800'
                }`}
              >
                {phase >= 1 ? <Check size={12} /> : '1'}
              </div>
              <div>
                <span className="text-xs font-bold block">1. Extracted Text & Content</span>
                <span className="text-[10px] font-semibold opacity-85 block">{confirmationText}</span>
              </div>
            </div>

            {/* Step 2: Understand */}
            <div
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                phase >= 1
                  ? 'bg-[#DCEBFF] border-[#2F6FED]/40 text-[#1E3A8A]'
                  : 'bg-[#F7F7F5] border-[#E6E8EC] text-[#66726B]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  phase >= 2 ? 'bg-[#2F6FED] text-white' : 'bg-blue-200 text-blue-800'
                }`}
              >
                {phase >= 2 ? <Check size={12} /> : '2'}
              </div>
              <div>
                <span className="text-xs font-bold block">2. Generated Passport & Blueprint</span>
                <span className="text-[10px] font-semibold opacity-85 block">Grounding steps in extracted source</span>
              </div>
            </div>

            {/* Step 3: 4 Learning Modes */}
            <div
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                phase >= 2
                  ? 'bg-[#FFF2C9] border-[#F27A1A]/40 text-[#854D0E]'
                  : 'bg-[#F7F7F5] border-[#E6E8EC] text-[#66726B]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  phase >= 2 ? 'bg-[#F27A1A] text-white' : 'bg-amber-200 text-amber-800'
                }`}
              >
                3
              </div>
              <div>
                <span className="text-xs font-bold block">3. 4-Stage Learning Experience</span>
                <span className="text-[10px] font-semibold opacity-85 block">Training deck · Show Me · Guide Me · Test Me</span>
              </div>
            </div>
          </div>
        )}
        
        {isTransitioning && (
           <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-4">
              <motion.div 
                className="h-full bg-indigo-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "linear" }}
              />
           </div>
        )}
      </div>
    </div>
  );
}

