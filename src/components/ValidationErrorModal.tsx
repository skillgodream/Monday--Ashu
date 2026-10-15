import React from 'react';
import { AlertTriangle, X, RefreshCw, FileText } from 'lucide-react';
import { sounds } from '../utils/audio';

interface ValidationErrorModalProps {
  isOpen: boolean;
  filename: string;
  errorReason: string;
  onClose: () => void;
  onTryAnother: () => void;
}

export default function ValidationErrorModal({
  isOpen,
  filename,
  errorReason,
  onClose,
  onTryAnother,
}: ValidationErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-red-100 text-center space-y-5 relative animate-in zoom-in-95 duration-200">
        
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-md shadow-red-500/10">
          <AlertTriangle size={32} />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            Document Validation Error
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 leading-snug">
            Cannot Create Lesson
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-center gap-1">
            <FileText size={13} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[280px]">{filename}</span>
          </p>
        </div>

        {/* Error Explanation Card */}
        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200/80 text-left text-xs font-semibold text-red-900 leading-relaxed space-y-1">
          <p className="font-bold text-red-950">Validation Failed:</p>
          <p>{errorReason}</p>
        </div>

        {/* Informative Guidance */}
        <p className="text-xs font-medium text-slate-500 leading-relaxed">
          Please upload a valid SOP document containing clear operational instructions (minimum 25 words in PDF, DOCX, or text format).
        </p>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            onClick={() => {
              sounds.playTap();
              onTryAnother();
            }}
            className="w-full h-12 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
          >
            <RefreshCw size={16} /> Choose Another SOP Document
          </button>
          
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
