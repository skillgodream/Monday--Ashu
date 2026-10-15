import React, { useState } from 'react';
import { X, Zap, ZapOff, Sparkles, CheckCircle2, Camera, Upload } from 'lucide-react';
import { sounds } from '../utils/audio';
import { extractDocumentContent, ExtractedDocument } from '../utils/documentExtractor';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (extracted: ExtractedDocument) => void;
}

export default function ScanModal({ isOpen, onClose, onScanSuccess }: ScanModalProps) {
  const [torch, setTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sounds.playShutter();
      setIsScanning(true);
      sounds.playCorrect();

      const extracted = await extractDocumentContent(file);

      setTimeout(() => {
        setIsScanning(false);
        onScanSuccess(extracted);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0D14]/92 backdrop-blur-md flex flex-col justify-between p-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white pt-2">
        <button
          onClick={() => {
            sounds.playTap();
            setTorch(!torch);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            torch ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/30' : 'bg-white/15 text-white'
          }`}
          aria-label="Toggle Flashlight"
        >
          {torch ? <Zap size={22} className="fill-current" /> : <ZapOff size={22} />}
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-white/80 bg-white/10 px-4 py-1.5 rounded-full">
          Universal OCR Scanner
        </span>

        <button
          onClick={() => {
            sounds.playTap();
            onClose();
          }}
          className="w-12 h-12 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
          aria-label="Close Scanner"
        >
          <X size={24} />
        </button>
      </div>

      {/* Center Viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center my-6">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-[32px] border-2 border-white/30 flex items-center justify-center overflow-hidden bg-slate-900/40 shadow-2xl">
          {/* Reticle Corner Brackets */}
          <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />

          {/* Animated Laser Scan Beam */}
          <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-pulse top-1/2 -translate-y-1/2" />

          {isScanning ? (
            <div className="z-10 flex flex-col items-center gap-2 bg-emerald-500/90 text-white px-5 py-3 rounded-2xl shadow-xl animate-in zoom-in-95 duration-150">
              <CheckCircle2 size={32} className="text-white" />
              <p className="text-xs font-black uppercase tracking-wider">Extracting SOP Text...</p>
            </div>
          ) : (
            <div className="text-center px-4">
              <Sparkles className="mx-auto mb-2 text-blue-300 animate-bounce" size={28} />
              <p className="text-sm font-semibold text-white/90">Point camera or capture photo</p>
              <p className="text-xs text-white/60 mt-1">Extracts procedures from any printed or digital SOP page</p>
            </div>
          )}
        </div>
      </div>

      {/* Real Photo Capture Action */}
      <div className="bg-white/10 rounded-[28px] p-5 text-white border border-white/10 space-y-3">
        <label className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full flex items-center justify-center gap-3 font-bold text-sm shadow-xl active:scale-98 transition-all cursor-pointer block text-center">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageCapture}
            disabled={isScanning}
          />
          <Camera size={20} />
          <span>Snap Photo or Upload Image of Any SOP</span>
        </label>
      </div>
    </div>
  );
}
