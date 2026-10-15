import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Check,
  CheckCircle2
} from 'lucide-react';
import { Lesson } from '../types';

interface ShowMeVideoModalProps {
  isOpen: boolean;
  lesson: Lesson;
  onClose: () => void;
  onContinueToGuideMe?: () => void;
}

export interface OperationalScene {
  stepNumber: number;
  title: string;
  section: string;
  instruction: string;
  keyVerification: string;
  durationSeconds: number;
  imageUrl: string;
}

// Default Aviation Fallback (used only when specific aviation lesson is selected or fallback)
const DEFAULT_AVIATION_SCENES: OperationalScene[] = [
  {
    stepNumber: 1,
    title: "Prepare the Boarding Operation",
    section: "Section 2 — Prepare",
    instruction: "Verify assigned flight number, gate status, scheduled departure time, and confirm communication channel with supervisor and equipment readiness.",
    keyVerification: "What is checked, where information is verified, and what readiness looks like.",
    durationSeconds: 10,
    imageUrl: "/demonstration_scenes/scene_1.png",
  },
  {
    stepNumber: 2,
    title: "Authorise and Begin Boarding",
    section: "Section 3 — Perform",
    instruction: "Receive authorised instruction before initiating passenger boarding, deliver the required boarding announcement, and provide clear boarding instructions.",
    keyVerification: "The sequence from supervisor authorisation to passenger communication.",
    durationSeconds: 10,
    imageUrl: "/demonstration_scenes/scene_2.png",
  },
  {
    stepNumber: 3,
    title: "Verify Boarding Documents",
    section: "Sections 3, 4 and 6",
    instruction: "Check boarding documents using the approved verification process. When a document mismatch is detected, pause boarding and seek authorised resolution.",
    keyVerification: "The verification action and the boundary between routine processing and escalation.",
    durationSeconds: 12,
    imageUrl: "/demonstration_scenes/scene_3.png",
  },
  {
    stepNumber: 4,
    title: "Apply the Stop-and-Escalate Rule",
    section: "Sections 4, 7 and Mandatory Safety",
    instruction: "When a safety, security, or integrity concern occurs: STOP operations immediately → PROTECT people and security → INFORM authorised supervisor → RESUME only when cleared.",
    keyVerification: "The compliant stop-and-escalate response without improvisation.",
    durationSeconds: 12,
    imageUrl: "/demonstration_scenes/scene_4.png",
  },
];

/**
 * Dynamically derives domain-specific demonstration scenes from the current Lesson object
 */
function getScenesForLesson(lesson?: Lesson): OperationalScene[] {
  if (!lesson) return DEFAULT_AVIATION_SCENES;

  const lessonTitleLower = (lesson.title || '').toLowerCase();
  const descriptionLower = (lesson.description || '').toLowerCase();
  const fullText = `${lessonTitleLower} ${descriptionLower}`;

  const getImageForScene = (idx: number, text: string) => {
    const combined = `${fullText} ${text.toLowerCase()}`;
    if (combined.includes('housekeeping') || combined.includes('sanitiz') || combined.includes('room') || combined.includes('cleaning') || combined.includes('disinfect')) {
      const images = [
        '/Guruji_Real_Photo_Visual_Library_500/023_safety_ppe_equipment.webp',
        '/Guruji_Real_Photo_Visual_Library_500/009_hospitality_room_cleaning.webp',
        '/Guruji_Real_Photo_Visual_Library_500/010_hospitality_bed_making.webp',
        '/Guruji_Real_Photo_Visual_Library_500/012_hospitality_handwashing.webp',
      ];
      return images[idx % images.length];
    }
    if (combined.includes('warehouse') || combined.includes('pick') || combined.includes('pack') || combined.includes('tote') || combined.includes('inventory')) {
      const images = [
        '/Guruji_Real_Photo_Visual_Library_500/005_warehouse_inventory_check.webp',
        '/Guruji_Real_Photo_Visual_Library_500/029_technology_qr_scan.webp',
        '/Guruji_Real_Photo_Visual_Library_500/004_warehouse_packing_box.webp',
        '/Guruji_Real_Photo_Visual_Library_500/006_warehouse_pallet_jack.webp',
      ];
      return images[idx % images.length];
    }
    if (combined.includes('safety') || combined.includes('chemical') || combined.includes('ppe') || combined.includes('hazard') || combined.includes('spill')) {
      const images = [
        '/Guruji_Real_Photo_Visual_Library_500/023_safety_ppe_equipment.webp',
        '/Guruji_Real_Photo_Visual_Library_500/026_safety_spill_cleanup.webp',
        '/Guruji_Real_Photo_Visual_Library_500/024_safety_fire_extinguisher.webp',
        '/Guruji_Real_Photo_Visual_Library_500/025_safety_emergency_exit.webp',
      ];
      return images[idx % images.length];
    }
    if (combined.includes('retail') || combined.includes('cashier') || combined.includes('store') || combined.includes('shelf')) {
      const images = [
        '/Guruji_Real_Photo_Visual_Library_500/002_retail_cashier_scanning_product.webp',
        '/Guruji_Real_Photo_Visual_Library_500/003_retail_shelf_restocking.webp',
        '/Guruji_Real_Photo_Visual_Library_500/001_retail_store_front.webp',
        '/Guruji_Real_Photo_Visual_Library_500/029_technology_qr_scan.webp',
      ];
      return images[idx % images.length];
    }
    if (combined.includes('manufactur') || combined.includes('machine') || combined.includes('assembly') || combined.includes('factory')) {
      const images = [
        '/Guruji_Real_Photo_Visual_Library_500/016_manufacturing_machine_operation.webp',
        '/Guruji_Real_Photo_Visual_Library_500/017_manufacturing_quality_check.webp',
        '/Guruji_Real_Photo_Visual_Library_500/018_maintenance_repair.webp',
        '/Guruji_Real_Photo_Visual_Library_500/023_safety_ppe_equipment.webp',
      ];
      return images[idx % images.length];
    }
    if (combined.includes('boarding') || combined.includes('aviation') || combined.includes('flight') || combined.includes('passenger')) {
      const images = [
        '/demonstration_scenes/scene_1.png',
        '/demonstration_scenes/scene_2.png',
        '/demonstration_scenes/scene_3.png',
        '/demonstration_scenes/scene_4.png',
      ];
      return images[idx % images.length];
    }

    const generalImages = [
      '/Guruji_Real_Photo_Visual_Library_500/005_warehouse_inventory_check.webp',
      '/Guruji_Real_Photo_Visual_Library_500/017_manufacturing_quality_check.webp',
      '/Guruji_Real_Photo_Visual_Library_500/023_safety_ppe_equipment.webp',
      '/Guruji_Real_Photo_Visual_Library_500/027_admin_document_filing.webp',
    ];
    return generalImages[idx % generalImages.length];
  };

  // 1. Check videoPlan.clips
  if (lesson.videoPlan?.clips && lesson.videoPlan.clips.length > 0) {
    return lesson.videoPlan.clips.map((clip, idx) => ({
      stepNumber: clip.clip_index || idx + 1,
      title: clip.title || `Demonstration Step ${idx + 1}`,
      section: clip.step_ref || `Section ${idx + 1}`,
      instruction: clip.critical_action || clip.purpose || clip.key_action || `Execute operational step ${idx + 1}`,
      keyVerification: clip.what_the_learner_should_understand || clip.control_or_decision || `Verify compliance with ${lesson.title}`,
      durationSeconds: clip.duration_seconds || 10,
      imageUrl: getImageForScene(idx, `${clip.title} ${clip.critical_action || ''}`),
    }));
  }

  // 2. Check operationalBlueprint.operational_steps
  if (lesson.operationalBlueprint?.operational_steps && lesson.operationalBlueprint.operational_steps.length > 0) {
    return lesson.operationalBlueprint.operational_steps.slice(0, 4).map((s, idx) => ({
      stepNumber: idx + 1,
      title: s.task_title || s.action_verb || `Operational Step ${idx + 1}`,
      section: s.source?.page_or_section || `Section ${idx + 1}`,
      instruction: s.instruction,
      keyVerification: s.why_it_matters || `Mandatory requirement: ${s.source?.source_text || s.instruction}`,
      durationSeconds: 10,
      imageUrl: getImageForScene(idx, s.instruction),
    }));
  }

  // 3. Check stepObjects
  if (lesson.stepObjects && lesson.stepObjects.length > 0) {
    return lesson.stepObjects.slice(0, 4).map((s, idx) => ({
      stepNumber: idx + 1,
      title: s.title || `Operational Step ${idx + 1}`,
      section: `Step ${idx + 1}`,
      instruction: s.question || s.coach_say || s.screen?.info || `Execute ${s.title}`,
      keyVerification: s.why || `SOP Requirement for ${lesson.title}`,
      durationSeconds: 10,
      imageUrl: getImageForScene(idx, s.title),
    }));
  }

  return DEFAULT_AVIATION_SCENES;
}

export const ShowMeVideoModal: React.FC<ShowMeVideoModalProps> = ({
  isOpen,
  lesson,
  onClose,
  onContinueToGuideMe,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Dynamically generated scenes matching the exact active SOP lesson
  const demonstrationScenes = getScenesForLesson(lesson);

  const currentScene = demonstrationScenes[currentStepIndex] || demonstrationScenes[0];
  const totalSteps = demonstrationScenes.length;

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStepIndex(0);
    setIsPlaying(true);
    setIsSequenceComplete(false);
    setPlaybackProgress(0);
    startTimeRef.current = Date.now();
  }, [isOpen, lesson?.id]);

  useEffect(() => {
    if (!isOpen || !isPlaying || isSequenceComplete) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    startTimeRef.current = Date.now() - playbackProgress * currentScene.durationSeconds * 1000;

    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const progress = Math.min(1, elapsed / currentScene.durationSeconds);
      setPlaybackProgress(progress);

      if (progress >= 1) {
        clearInterval(progressTimerRef.current!);
        handleAdvanceToNextScene();
      }
    }, 100);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, isPlaying, currentStepIndex, isSequenceComplete, currentScene.durationSeconds]);

  const handleAdvanceToNextScene = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setPlaybackProgress(0);
      startTimeRef.current = Date.now();
    } else {
      setIsPlaying(false);
      setIsSequenceComplete(true);
      setPlaybackProgress(1);
    }
  };

  const handleReplay = () => {
    setCurrentStepIndex(0);
    setPlaybackProgress(0);
    setIsSequenceComplete(false);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
  };

  const handleSelectStep = (idx: number) => {
    setCurrentStepIndex(idx);
    setPlaybackProgress(0);
    setIsSequenceComplete(false);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
  };

  const togglePlayPause = () => {
    if (isSequenceComplete) {
      handleReplay();
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-2 sm:p-5 select-none animate-in fade-in duration-200">
      
      {/* Container */}
      <div className="w-full max-w-4xl h-[94vh] sm:h-[88vh] bg-[#0A0D14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between relative">
        
        {/* 1. CLEAN APPLE HEADER (NO header text, NO title, NO step counter, ONLY small back icon) */}
        <header className="px-5 py-3 flex items-center justify-between border-b border-white/[0.06] bg-black/30 shrink-0">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft size={16} />
          </button>
          <div>{/* Empty space - Clean header with no text */}</div>
        </header>

        {/* 2. BODY CONTAINER: EXACT 60:40 HEIGHT RATIO (Video : Text) */}
        <div className="flex-1 overflow-hidden p-4 sm:p-5 flex flex-col gap-4 min-h-0 relative">
          
          {/* A. VIDEO STAGE: Exactly 60% Height Ratio */}
          <div className="h-[60%] flex-[6] w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group flex items-center justify-center shrink-0 min-h-0">
            <img
              src={currentScene.imageUrl}
              alt={currentScene.title}
              className={`w-full h-full object-cover transition-transform duration-10000 ease-out ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />

            {/* Subtle Controls Overlay on Hover or Pause */}
            <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between transition-opacity duration-200 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className="w-8 h-8 rounded-full bg-white/25 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="translate-x-0.5" />}
                </button>

                <button
                  onClick={handleReplay}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Replay sequence"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              <div className="text-[11px] font-mono text-zinc-300 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10">
                {Math.round(playbackProgress * currentScene.durationSeconds)}s / {currentScene.durationSeconds}s
              </div>
            </div>
          </div>

          {/* B. INSTRUCTION TEXT CARD: Exactly 40% Height Ratio */}
          <div className="h-[40%] flex-[4] overflow-y-auto bg-[#0E121E]/90 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-2 shrink-0 min-h-0">
            <div className="space-y-2">
              {/* Section Header */}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold tracking-widest text-blue-400 uppercase text-[11px]">
                  {currentScene.section}
                </span>
                <span className="font-mono text-zinc-400 text-[11px]">
                  Scene {currentStepIndex + 1} of {totalSteps} • {currentScene.durationSeconds}s
                </span>
              </div>

              {/* Step Title */}
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                {currentScene.title.replace(/^Scene\s+\d+:\s*/i, '').trim() || currentScene.title}
              </h3>

              {/* Operational Directive */}
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal">
                {currentScene.instruction}
              </p>
            </div>

            {/* Learner Focus Footer */}
            <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Learner Focus
              </span>
              <p className="text-xs text-zinc-300 leading-normal truncate">
                {currentScene.keyVerification}
              </p>
            </div>
          </div>

        </div>

        {/* 3. TIMELINE PROGRESS BAR FOOTER */}
        <footer className="px-5 py-3 border-t border-white/[0.06] bg-black/50 shrink-0 flex flex-col gap-2">
          {/* Horizontal Segment Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {demonstrationScenes.map((sc, idx) => {
              const isPassed = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const progressFill = isPassed ? 100 : isCurrent ? playbackProgress * 100 : 0;

              return (
                <button
                  key={sc.stepNumber}
                  onClick={() => handleSelectStep(idx)}
                  className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer hover:bg-white/20 transition-all"
                  title={`Scene ${idx + 1}: ${sc.title}`}
                >
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                    style={{ width: `${progressFill}%` }}
                  />
                </button>
              );
            })}
          </div>

          {/* Horizontal Scrollable Scene Pills (Single Row) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {demonstrationScenes.map((sc, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPassed = idx < currentStepIndex;
              const cleanTitle = sc.title.replace(/^Scene\s+\d+:\s*/i, '').trim();

              return (
                <button
                  key={sc.stepNumber}
                  onClick={() => handleSelectStep(idx)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0 flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isPassed
                      ? 'bg-white/10 text-zinc-300 hover:bg-white/15'
                      : 'bg-white/5 text-zinc-500 hover:bg-white/10'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">{String(idx + 1).padStart(2, '0')}.</span>
                  <span>{cleanTitle.length > 25 ? cleanTitle.slice(0, 22) + '…' : cleanTitle}</span>
                </button>
              );
            })}
          </div>
        </footer>

        {/* 4. ENDING SCREEN / COMPLETION OVERLAY (EXACTLY MATCHES SCREENSHOT 1) */}
        {isSequenceComplete && (
          <div className="absolute inset-0 z-50 bg-[#0E1116]/90 backdrop-blur-2xl flex flex-col items-center justify-between p-6 sm:p-8 animate-in fade-in duration-300">
            {/* Top Bar with small close chevron icon */}
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Center Content Matching Screenshot 1 layout */}
            <div className="flex flex-col items-center justify-center text-center max-w-md my-auto space-y-5">
              {/* Clean Tick Mark (Checkmark) Icon Badge - No spinning circles */}
              <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 flex items-center justify-center mb-2 shadow-xl shadow-indigo-500/20 backdrop-blur-md">
                <Check size={42} className="stroke-[3]" />
              </div>

              {/* Headline - Replaced "Analyzing document..." with "Completed document..." */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Completed document...
              </h2>

              {/* Subtitle */}
              <p className="text-sm text-zinc-300 leading-relaxed max-w-xs">
                Building your operational training experience.
              </p>

              {/* Action Pill Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                {onContinueToGuideMe ? (
                  <button
                    onClick={onContinueToGuideMe}
                    className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Make the Decision</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-8 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer"
                  >
                    Done
                  </button>
                )}

                <button
                  onClick={handleReplay}
                  className="px-6 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/15 text-white text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Replay</span>
                </button>
              </div>
            </div>

            {/* Bottom spacer */}
            <div className="h-6"></div>
          </div>
        )}

      </div>
    </div>
  );
};
