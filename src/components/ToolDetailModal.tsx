import React from 'react';
import { X, Volume2, Info, Target, AlertTriangle } from 'lucide-react';
import { ToolItem } from '../types';
import ClayArt from './ClayArt';
import { sounds } from '../utils/audio';

interface ToolDetailModalProps {
  tool: ToolItem | null;
  onClose: () => void;
}

export default function ToolDetailModal({ tool, onClose }: ToolDetailModalProps) {
  if (!tool) return null;

  const handleSpeak = () => {
    sounds.playTap();
    sounds.speak(`${tool.name}. ${tool.whatItIs}. What it is for: ${tool.whatItsFor}. Never do: ${tool.neverDo}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1116]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#F7F7F5] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200">
        {/* Top Tinted Field with Clay Art */}
        <div className="relative bg-[#FFE6D2] p-6 pt-8 flex flex-col items-center justify-center">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/60 hover:bg-white text-[#0E1116] flex items-center justify-center shadow-sm transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <button
            onClick={handleSpeak}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/60 hover:bg-white text-[#F27A1A] flex items-center justify-center shadow-sm transition-all"
            aria-label="Listen"
          >
            <Volume2 size={20} />
          </button>

          <ClayArt type={tool.iconName as 'scanner' | 'tote' | 'box'} size={110} />

          {tool.badge && (
            <span className="mt-3 px-3 py-1 rounded-full bg-white/80 text-xs font-bold text-[#3D4652] tracking-wide">
              {tool.badge}
            </span>
          )}

          <h2 className="text-2xl font-bold text-[#0E1116] mt-2 text-center">{tool.name}</h2>
          <p className="text-sm font-semibold text-[#66726B]">{tool.shortDesc}</p>
        </div>

        {/* White Sheet Below with Structured Rows */}
        <div className="bg-white rounded-t-[32px] -mt-5 p-6 flex-1 overflow-y-auto space-y-4 shadow-sm">
          {/* Row 1: What it is */}
          <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D4652]">
              <Info size={16} className="text-[#2F6FED]" />
              <span>What it is</span>
            </div>
            <p className="text-base font-semibold text-[#0E1116] leading-relaxed pt-1">
              {tool.whatItIs}
            </p>
          </div>

          {/* Row 2: What it's for */}
          <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E6E8EC] space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3D4652]">
              <Target size={16} className="text-[#1FA55E]" />
              <span>What it's for</span>
            </div>
            <p className="text-base font-semibold text-[#0E1116] leading-relaxed pt-1">
              {tool.whatItsFor}
            </p>
          </div>

          {/* Row 3: Never do (Red emphasis) */}
          <div className="p-4 rounded-2xl bg-[#FBE0EA]/60 border border-[#FBE0EA] space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E5484D]">
              <AlertTriangle size={16} className="text-[#E5484D]" />
              <span>Never do</span>
            </div>
            <p className="text-base font-semibold text-[#991B1B] leading-relaxed pt-1">
              {tool.neverDo}
            </p>
          </div>

          {/* Solid Action Pill */}
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-full h-14 rounded-full bg-[#0E1116] text-white font-bold text-lg hover:bg-black active:scale-98 transition-transform shadow-lg mt-2"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
