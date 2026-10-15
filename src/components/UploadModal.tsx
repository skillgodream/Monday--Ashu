import React, { useState } from 'react';
import { X, Upload, FileText, ArrowRight, Edit3 } from 'lucide-react';
import { sounds } from '../utils/audio';
import { extractDocumentContent, ExtractedDocument } from '../utils/documentExtractor';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (extracted: ExtractedDocument) => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sounds.playTap();
      setSelectedFileName(file.name);
      setIsProcessing(true);
      sounds.playCorrect();

      const extracted = await extractDocumentContent(file);

      setTimeout(() => {
        setIsProcessing(false);
        onUploadSuccess(extracted);
        onClose();
        setSelectedFileName(null);
      }, 300);
    }
  };

  const handlePastedTextSubmit = async () => {
    if (!pastedText.trim()) return;
    sounds.playTap();
    setIsProcessing(true);
    sounds.playCorrect();

    const text = pastedText.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const pageCount = Math.max(1, Math.ceil(wordCount / 220));

    const extracted: ExtractedDocument = {
      filename: 'Custom_Pasted_SOP.txt',
      rawText: text,
      wordCount,
      pageCount,
      fileHash: `hash_${Date.now()}`,
      confirmationText: `1 page · ${wordCount} words`,
      diagnostics: {
        totalChars: text.length,
        readableChars: text.length,
        controlChars: 0,
        replacementChars: 0,
        wordCount,
        pageCount,
      },
      mimeType: 'text/plain',
      extractedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      setIsProcessing(false);
      onUploadSuccess(extracted);
      onClose();
      setPastedText('');
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#121215]/90 border border-white/10 rounded-[32px] p-6 shadow-2xl backdrop-blur-2xl text-white flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center">
              <Upload size={16} />
            </div>
            <h2 className="text-sm font-semibold text-white">Upload SOP</h2>
          </div>

          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-4">
          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('file');
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'file'
                ? 'bg-[#0A84FF] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText size={14} />
            <span>File</span>
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('paste');
            }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-[#0A84FF] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 size={14} />
            <span>Paste Text</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'file' ? (
          <label className="border-2 border-dashed border-white/15 hover:border-[#0A84FF] bg-white/5 hover:bg-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-[0.98]">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
            <div className="w-12 h-12 rounded-2xl bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center mb-3">
              <Upload size={22} />
            </div>
            <p className="text-xs font-semibold text-white">
              {isProcessing
                ? `Extracting ${selectedFileName || 'file'}...`
                : 'Choose or drop SOP file'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">PDF, Word, or Text document</p>
          </label>
        ) : (
          <div className="space-y-3">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste procedure text here..."
              rows={5}
              className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[#0A84FF] resize-none"
            />
            <button
              onClick={handlePastedTextSubmit}
              disabled={!pastedText.trim() || isProcessing}
              className="w-full py-3 rounded-2xl bg-[#0A84FF] hover:bg-[#0071E3] disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{isProcessing ? 'Extracting SOP...' : 'Process Text'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
