import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  FileText,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Lesson } from '../types';
import { ExtractedDocument } from '../utils/documentExtractor';
import { sounds } from '../utils/audio';

import { generateSopDeck } from '../utils/progressiveSopEngine';

interface SopGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedDoc: ExtractedDocument | null;
  onDeckCreated: (lesson: Lesson) => void;
  onUploadNew?: () => void;
}

export function SopGenerationModal({
  isOpen,
  onClose,
  extractedDoc,
  onDeckCreated,
  onUploadNew,
}: SopGenerationModalProps) {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen || !extractedDoc) return null;

  const handleGenerate = async () => {
    sounds.playTap();
    setIsGenerating(true);
    setErrorText(null);

    try {
      const lesson = await generateSopDeck(
        extractedDoc,
        'auto',
        'opt-standard',
        ''
      );

      sounds.playCorrect();
      setIsGenerating(false);
      onDeckCreated(lesson);
    } catch (err: any) {
      console.error('[SopGenerationModal] Generation error:', err);
      setIsGenerating(false);
      setErrorText(err?.message || 'Failed to generate deck. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-200 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">
                {extractedDoc.filename.replace(/\.(pdf|txt|docx)$/i, '')}
              </h2>
            </div>
          </div>
          <button
            onClick={() => { sounds.playTap(); onClose(); }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white">
            <Sparkles size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Ready to generate</h3>
            <p className="text-sm text-slate-400">Gemini will analyze your SOP and structure the training automatically.</p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <button
            onClick={() => { sounds.playTap(); onClose(); }}
            disabled={isGenerating}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-xs text-black bg-white hover:bg-white/90 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <span>Generate Training Deck</span>}
          </button>
        </div>

      </div>
    </div>
  );
}
