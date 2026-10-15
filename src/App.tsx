/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, BookOpen, Sparkles, ChevronRight, X } from 'lucide-react';
import BottomNav from './components/BottomNav';
import ScanModal from './components/ScanModal';
import UploadModal from './components/UploadModal';
import AiUnderstandModal from './components/AiUnderstandModal';
import WelcomeJourneyModal from './components/WelcomeJourneyModal';
import ExperiencedCheckModal from './components/ExperiencedCheckModal';
import AskTrainerModal from './components/AskTrainerModal';
import MicroLessonSheet from './components/MicroLessonSheet';
import LessonOverview from './components/LessonOverview';
import SimulatorScreen from './components/SimulatorScreen';
import LibraryView from './components/LibraryView';
import ProgressView from './components/ProgressView';
import ProfileView from './components/ProfileView';
import PilotDashboardView from './components/PilotDashboardView';
import { AdminContentStudio } from './components/AdminContentStudio';
import { ManagerTeamStudio } from './components/ManagerTeamStudio';
import { LearnerHomeView } from './components/LearnerHomeView';
import BentoArchitectureShowcase from './components/BentoArchitectureShowcase';
import ValidationErrorModal from './components/ValidationErrorModal';
import { MeetGurujiScreen } from './screens/MeetGurujiScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DesignCheckScreen } from './screens/DesignCheckScreen';
import { ContentCardScreen } from './screens/ContentCardScreen';

import { INITIAL_LESSONS } from './data/lessonsData';
import ProcessPassportModal from './components/ProcessPassportModal';
import { buildProcessPassport, perceiveImage } from './utils/blueprintEngine';
import { ProcessPassport, PerceiveObservation, TabType, Lesson, ExperienceLevel } from './types';
import { sounds } from './utils/audio';
import { ExperiencePlayer } from './experiment/ExperiencePlayer';
import { planSlides } from './experiment/Planner';
import { ExtractedDocument } from './utils/documentExtractor';
import { validateSourceFidelity } from './utils/sourceValidator';
import { generateDomainNeutralLesson } from './utils/domainNeutralGenerator';
import { getApiHeaders } from './utils/apiHelper';
import { ShowMeVideoModal } from './components/ShowMeVideoModal';
import { SopGenerationModal } from './components/SopGenerationModal';
import { AnalyzingModal } from './components/AnalyzingModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HeaderUserWidget } from './components/HeaderUserWidget';
import { AuthModal } from './components/AuthModal';

function AppContent() {
  const { role } = useAuth();
  const [isDesignCheck, setIsDesignCheck] = useState<boolean>(
    window.location.hash === '#design-check' ||
    window.location.pathname === '/design-check'
  );
  const [isContentCard, setIsContentCard] = useState<boolean>(
    window.location.hash === '#content-card' ||
    window.location.pathname === '/content-card'
  );

  React.useEffect(() => {
    const handleHashChange = () => {
      setIsDesignCheck(
        window.location.hash === '#design-check' ||
        window.location.pathname === '/design-check'
      );
      setIsContentCard(
        window.location.hash === '#content-card' ||
        window.location.pathname === '/content-card'
      );
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [showBentoShowcase, setShowBentoShowcase] = useState<boolean>(false);
  const [isSopOptionsOpen, setIsSopOptionsOpen] = useState<boolean>(false);

  // Navigation & Flow State:
  const [isScanOpen, setIsScanOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [extractedDocForModal, setExtractedDocForModal] = useState<ExtractedDocument | null>(null);

  // Validation Error State:
  const [validationError, setValidationError] = useState<{ filename: string; reason: string } | null>(null);

  // AI Pipeline State:
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analyzingSop, setAnalyzingSop] = useState<{
    title: string;
    lesson: Lesson;
    confirmationText?: string;
    filename?: string;
  } | null>(null);

  const [activePassport, setActivePassport] = useState<ProcessPassport>(() =>
    buildProcessPassport('Warehouse Order Picking', 'Picker')
  );
  const [perceiveObservation, setPerceiveObservation] = useState<PerceiveObservation>(() =>
    perceiveImage('SOP_Page.png')
  );
  const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);

  // Onboarding Journey States:
  const [welcomeLesson, setWelcomeLesson] = useState<Lesson | null>(null);
  const [isExperiencedCheckOpen, setIsExperiencedCheckOpen] = useState<boolean>(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Active Learning Mode States:
  const [isIntroDeckOpen, setIsIntroDeckOpen] = useState<boolean>(false);
  const [isVideoDemoOpen, setIsVideoDemoOpen] = useState<boolean>(false);
  const [activeSimulator, setActiveSimulator] = useState<Lesson | null>(null);
  const [simulatorPhase, setSimulatorPhase] = useState<number>(1);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Omnipresent Stage Controls:
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState<boolean>(false);
  const [isMicroLessonOpen, setIsMicroLessonOpen] = useState<boolean>(false);
  const [currentContextTitle, setCurrentContextTitle] = useState<string>('Standard Operating Procedure');

  const isPipelineProcessingRef = useRef<boolean>(false);

  // Apple Dark Theme Canvas Background Management (black and translucent cards)
  React.useEffect(() => {
    const targetColor = '#000000';
    document.body.style.backgroundColor = targetColor;
    document.documentElement.style.backgroundColor = targetColor;
  }, []);

  /**
   * AUTHORITATIVE SOP PIPELINE HANDLER
   * Extracted Document -> Validation -> Domain Neutral Generator -> Lesson Generation -> Play Lesson
   */
  const handleProcessExtractedDocument = useCallback(async (extractedDoc: ExtractedDocument) => {
    if (isPipelineProcessingRef.current) {
      console.warn('[SOP Pipeline] Transition already in progress, ignoring duplicate trigger.');
      return;
    }
    isPipelineProcessingRef.current = true;
    setIsProcessing(true);
    console.log('[SOP Pipeline START] Processing extracted document:', extractedDoc.filename);

    try {
      // 1. CLEAR PREVIOUS SESSION STATE (Cross-session contamination protection)
      setSelectedLesson(null);
      setActiveSimulator(null);
      setWelcomeLesson(null);
      setIsIntroDeckOpen(false);
      setIsExperiencedCheckOpen(false);
      setValidationError(null);

      // 2. SOURCE FIDELITY VALIDATION
      const validation = validateSourceFidelity(extractedDoc);

      if (!validation.isValid) {
        console.error('[SOP Pipeline REJECTED]:', validation.errorReason);
        setValidationError({
          filename: extractedDoc.filename,
          reason: validation.errorReason || 'Unusable or corrupt document.',
        });
        return; // STOP IMMEDIATELY! finally block will clear isProcessing
      }

      // 3. GENERATE OPERATIONAL BLUEPRINT VIA SERVER LLM OR LOCAL BRAIN
      let opBlueprint;
      try {
        const bpController = new AbortController();
        const bpTimeout = setTimeout(() => bpController.abort(), 60000);
        const res = await fetch('/api/gemini/generate-blueprint', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            rawText: extractedDoc.rawText,
            fileBase64: extractedDoc.fileBase64,
            mimeType: extractedDoc.mimeType,
            filename: extractedDoc.filename,
            fileHash: extractedDoc.fileHash,
            pageCount: extractedDoc.pageCount,
            wordCount: extractedDoc.wordCount,
          }),
          signal: bpController.signal,
        });
        clearTimeout(bpTimeout);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.success && data.blueprint && data.blueprint.operational_steps) {
            console.log('[SOP Pipeline SUCCESS] Generated Deep Operational Blueprint via Gemini Server LLM');
            opBlueprint = data.blueprint;
          } else {
            console.warn('[SOP Pipeline] Server LLM returned:', data.error || data.reason || data.message);
          }
        } else {
          console.warn('[SOP Pipeline] Server returned HTTP', res.status, res.statusText);
        }
      } catch (err: any) {
        console.warn('[SOP Pipeline] Server LLM blueprint error or timeout:', err?.message || err);
      }

      // Secondary Fallback via /api/coach
      if (!opBlueprint) {
        try {
          console.log('[SOP Pipeline] Trying secondary endpoint /api/coach for blueprint generation...');
          const coachController = new AbortController();
          const coachTimeout = setTimeout(() => coachController.abort(), 60000);
          const coachRes = await fetch('/api/coach', {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              prompt: `Transform this SOP ("${extractedDoc.filename}") into a high-fidelity OPERATIONAL BLUEPRINT. For EACH operational step, generate a realistic workplace scenario question, 3 nuanced choices with compliant rationale and realistic failure modes (subtitle), pro coach tip, and hint. Return JSON with document_identity, role, process, purpose, scope, operational_steps (instruction, category, why_it_matters, scenario_question, task_title, target_code, choices: [{id, title, subtitle, isCorrect}], coach_tip, hint, critical_control, source), decision_points, critical_controls, safety_rules, tools_and_systems, terminology. Document text:\n"""\n${extractedDoc.rawText.slice(0, 32000)}\n"""`,
              systemInstruction: 'You are an expert instructional designer and workplace assessment engineer. Generate deep, authentic frontline questions grounded strictly in the SOP with realistic failure distractors. Respond strictly with valid JSON.',
              maxOutputTokens: 6000,
            }),
            signal: coachController.signal,
          });
          clearTimeout(coachTimeout);
          if (coachRes.ok) {
            const coachData = await coachRes.json().catch(() => ({}));
            if (coachData.operational_steps) {
              console.log('[SOP Pipeline SUCCESS via /api/coach] Generated Operational Blueprint');
              opBlueprint = coachData;
            }
          }
        } catch (coachErr: any) {
          console.warn('[SOP Pipeline] /api/coach fallback error or timeout:', coachErr?.message || coachErr);
        }
      }

      // 4. DOMAIN-NEUTRAL BLUEPRINT & LESSON GENERATION
      const { lesson, passport, blueprint } = generateDomainNeutralLesson(extractedDoc, opBlueprint);

      // 5. SECONDARY FIDELITY CHECK ON GENERATED LESSON
      const lessonValidation = validateSourceFidelity(extractedDoc, lesson, blueprint, passport);
      if (!lessonValidation.isValid) {
        console.error('[SOP Pipeline REJECTED Lesson]:', lessonValidation.errorReason);
        setValidationError({
          filename: extractedDoc.filename,
          reason: lessonValidation.errorReason || 'Generated lesson failed source fidelity validation.',
        });
        return; // STOP IMMEDIATELY! finally block will clear isProcessing
      }

      // Update state with newly generated document-driven lesson
      setCurrentContextTitle(lesson.title);
      setActivePassport(passport);
      setPerceiveObservation(perceiveImage(`${extractedDoc.filename}`));

      setLessons((prev) => {
        const exists = prev.some((l) => l.id === lesson.id);
        if (exists) {
          return prev.map((l) => (l.id === lesson.id ? lesson : l));
        }
        return [lesson, ...prev];
      });

      setSelectedLesson(lesson);

      setAnalyzingSop({
        title: lesson.title,
        lesson,
        confirmationText: extractedDoc.confirmationText,
        filename: extractedDoc.filename,
      });
    } catch (err: any) {
      console.error('[SOP Pipeline ERROR]:', err);
      setValidationError({
        filename: extractedDoc.filename,
        reason: `Failed to process document: ${err?.message || 'Processing error'}`,
      });
    } finally {
      setIsProcessing(false);
      isPipelineProcessingRef.current = false;
    }
  }, []);

  // Preset SOP selection from Library / Demo
  const handleSelectSop = (lessonId: string, customTitle?: string) => {
    const lesson = lessons.find((l) => l.id === lessonId) || lessons[0];
    const title = customTitle || lesson.title;
    setCurrentContextTitle(title);

    // Clear previous simulation state
    setSelectedLesson(null);
    setActiveSimulator(null);
    setIsIntroDeckOpen(false);

    if (lesson.sourceMeta?.rawText) {
      handleProcessExtractedDocument({
        filename: lesson.sourceMeta.filename,
        rawText: lesson.sourceMeta.rawText,
        wordCount: lesson.sourceMeta.wordCount,
        pageCount: lesson.sourceMeta.pageCount,
        fileHash: lesson.sourceMeta.fileHash,
        confirmationText: lesson.sourceMeta.confirmationText,
        diagnostics: {
          totalChars: lesson.sourceMeta.rawText.length,
          readableChars: lesson.sourceMeta.rawText.length,
          controlChars: 0,
          replacementChars: 0,
          wordCount: lesson.sourceMeta.wordCount,
          pageCount: lesson.sourceMeta.pageCount,
        },
        mimeType: 'text/plain',
        extractedAt: new Date().toISOString(),
      });
    } else {
      setSelectedLesson(lesson);
      setAnalyzingSop({
        title,
        lesson,
        confirmationText: 'Loaded verified SOP checklist',
        filename: lesson.title,
      });
    }
  };

  const handleAiUnderstandComplete = () => {
    if (analyzingSop) {
      setSelectedLesson(analyzingSop.lesson);
      setAnalyzingSop(null);
    }
  };



  // Learner Journey Start-point Branching:
  const handleSelectExperienceLevel = (level: ExperienceLevel) => {
    const target = welcomeLesson || lessons[0];
    setWelcomeLesson(null);

    if (level === 'experienced') {
      setIsExperiencedCheckOpen(true);
    } else {
      setSelectedLesson(target);
      setIsIntroDeckOpen(true);
    }
  };

  const handleExperiencedCheckPass = () => {
    const target = welcomeLesson || selectedLesson || lessons[0];
    setIsExperiencedCheckOpen(false);
    setSelectedLesson(target);
    handleStartSimulation(0, target);
  };

  const handleExperiencedCheckFail = () => {
    const target = welcomeLesson || selectedLesson || lessons[0];
    setIsExperiencedCheckOpen(false);
    setSelectedLesson(target);
    setIsIntroDeckOpen(true);
  };

  const handleStartSimulation = (phase: number = 1, targetLesson?: Lesson) => {
    const lesson = targetLesson || selectedLesson || lessons[0];
    setSimulatorPhase(phase);
    setActiveSimulator(lesson);
    setSelectedLesson(lesson);
    setIsIntroDeckOpen(false);
  };

  const handleSimulationFinish = (score: number) => {
    if (!activeSimulator) return;
    setLessons((prev) =>
      prev.map((l) =>
        l.id === activeSimulator.id
          ? {
              ...l,
              progress: Math.min(100, Math.max(l.progress, score)),
              masteryPercentage: Math.min(100, Math.max(l.masteryPercentage, score)),
            }
          : l
      )
    );
  };

  const handleResetData = () => {
    setLessons(INITIAL_LESSONS);
  };

  if (isDesignCheck) {
    return <DesignCheckScreen onBack={() => { window.location.hash = ''; setIsDesignCheck(false); }} />;
  }

  if (isContentCard) {
    return <ContentCardScreen lesson={selectedLesson || undefined} onBack={() => { window.location.hash = ''; setIsContentCard(false); }} />;
  }

  return (
    <div className="flex flex-col min-h-screen font-sans relative bg-black text-white selection:bg-white/20 selection:text-white transition-colors duration-300 overflow-x-hidden">
      {/* Ambient Apple VisionOS Specular Glow Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full bg-white/[0.03] blur-[140px]" />
        <div className="absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.03] blur-[120px]" />
        <div className="absolute bottom-20 -left-20 w-[450px] h-[450px] rounded-full bg-slate-500/[0.03] blur-[130px]" />
      </div>

      {/* LMS Enterprise Navigation & Persona Status Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-black/80 border-b border-white/10 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">Guru Coach</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">LMS</span>
          </div>
          <HeaderUserWidget />
        </div>
      </header>

      {/* Main Tab Views & Bottom Navigation (only rendered when NOT in an active lesson, deck, or simulation) */}
      {!selectedLesson && !activeSimulator && !isIntroDeckOpen && (
        <>
          {activeTab === 'home' && (role === 'learner' ? (
            <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full animate-in fade-in duration-200">
              <LearnerHomeView
                onSelectSop={(lessonId, title, mode) => {
                  handleSelectSop(lessonId, title);
                  if (mode === 'show_me') setIsVideoDemoOpen(true);
                  else if (mode === 'guide_me') handleStartSimulation(1);
                  else if (mode === 'test_me') handleStartSimulation(2);
                  else setIsIntroDeckOpen(true);
                }}
                onExploreLibrary={() => setActiveTab('library')}
                onOpenTrainerModal={() => setIsTrainerModalOpen(true)}
              />
            </main>
          ) : (
            <main className="flex-1 flex flex-col max-w-lg mx-auto w-full animate-in fade-in duration-200">
              <MeetGurujiScreen
                onContinue={() => {
                  sounds.playTap();
                  setIsSopOptionsOpen(true);
                }}
              />

              {/* Modern Ultra-Sleek Glass SOP Selection Drawer (Redesigned Modern UI) */}
              {isSopOptionsOpen && (
                <div className="fixed inset-0 z-50 bg-[#070A14]/80 backdrop-blur-2xl flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                  <div className="w-full max-w-md bg-[#0D1226]/95 backdrop-blur-3xl border-t sm:border border-white/10 rounded-t-[36px] sm:rounded-[36px] p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] space-y-4 animate-in slide-in-from-bottom-8 duration-300 text-white">
                    {/* Header: Clean & Minimal, No header badge icons or static text pills */}
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-xl font-bold tracking-tight text-white">
                        Choose SOP
                      </h3>
                      <button
                        onClick={() => setIsSopOptionsOpen(false)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Action Cards Grid: Visual, Non-Text-Heavy, Modern Layout */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Option 1: Housekeeping Featured SOP */}
                      <button
                        onClick={() => {
                          sounds.playTap();
                          setIsSopOptionsOpen(false);
                          handleSelectSop('housekeeping_sanitization', 'Housekeeping: Room Sanitization');
                        }}
                        className="col-span-2 relative overflow-hidden bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-2xl p-4 transition-all flex items-center justify-between group cursor-pointer text-left shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white text-lg shadow-inner group-hover:scale-105 transition-transform">
                            🧹
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                              Demo
                            </span>
                            <span className="text-sm font-bold text-white block leading-tight">
                              Room Sanitization
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </button>

                      {/* Option 2: Scan SOP */}
                      <button
                        onClick={() => {
                          sounds.playTap();
                          setIsSopOptionsOpen(false);
                          setIsScanOpen(true);
                        }}
                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-4 backdrop-blur-md transition-all flex flex-col justify-between items-start group cursor-pointer text-left h-32"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Camera
                          </span>
                          <span className="text-sm font-bold text-white block leading-tight">
                            Scan SOP
                          </span>
                        </div>
                      </button>

                      {/* Option 3: Upload SOP */}
                      <button
                        onClick={() => {
                          sounds.playTap();
                          setIsSopOptionsOpen(false);
                          setIsUploadOpen(true);
                        }}
                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-4 backdrop-blur-md transition-all flex flex-col justify-between items-start group cursor-pointer text-left h-32"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="mt-2">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Document
                          </span>
                          <span className="text-sm font-bold text-white block leading-tight">
                            Upload PDF
                          </span>
                        </div>
                      </button>

                      {/* Option 4: Browse Library */}
                      <button
                        onClick={() => {
                          sounds.playTap();
                          setIsSopOptionsOpen(false);
                          setActiveTab('library');
                        }}
                        className="col-span-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
                      >
                        <BookOpen className="w-4 h-4 text-slate-300" />
                        <span>Browse Library →</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          ))}

          {activeTab === 'library' && (
            <main className="flex-1 flex flex-col max-w-lg mx-auto w-full animate-in fade-in duration-200">
              <LibraryView
                lessons={lessons}
                onSelectLesson={(lesson) => {
                  handleSelectSop(lesson.id, lesson.title);
                }}
              />
            </main>
          )}

          {activeTab === 'progress' && (
            <main className="flex-1 flex flex-col max-w-lg mx-auto w-full animate-in fade-in duration-200">
              <ProgressView
                lessons={lessons}
                onStartSimulation={(lessonId) => {
                  const found = lessons.find((l) => l.id === lessonId) || lessons[0];
                  handleSelectSop(found.id, found.title);
                }}
              />
            </main>
          )}

          {activeTab === 'pilot' && (
            <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full animate-in fade-in duration-200">
              <PilotDashboardView
                onBackToHome={() => setActiveTab('home')}
                onSelectLearnerSop={(learner) => {
                  handleSelectSop(learner.assignedSopId, learner.assignedSopTitle);
                }}
              />
            </main>
          )}

          {activeTab === 'manager' && (
            <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full animate-in fade-in duration-200 pb-24">
              <ManagerTeamStudio />
            </main>
          )}

          {activeTab === 'admin' && (
            <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full animate-in fade-in duration-200 pb-24">
              <AdminContentStudio />
            </main>
          )}

          {activeTab === 'profile' && (
            <main className="flex-1 flex flex-col max-w-lg mx-auto w-full animate-in fade-in duration-200">
              <ProfileView
                onResetData={handleResetData}
                onOpenBentoShowcase={() => setShowBentoShowcase(true)}
                onOpenPassport={() => setIsPassportModalOpen(true)}
              />
            </main>
          )}

          {/* Floating Bottom Navigation Bar (Hidden on Home tab) */}
          {activeTab !== 'home' && (
            <BottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
          )}
        </>
      )}

      {/* Ensure LessonOverview and following stages are visible */}
      {selectedLesson && !activeSimulator && !isIntroDeckOpen && !isExperiencedCheckOpen && !isVideoDemoOpen && (
        <LessonOverview
          lesson={selectedLesson}
          onBack={() => {
            setSelectedLesson(null);
            setWelcomeLesson(null);
          }}
          onOpenIntroDeck={() => setIsIntroDeckOpen(true)}
          onStartSimulation={(phase) => handleStartSimulation(phase)}
          onOpenVideoDemo={() => setIsVideoDemoOpen(true)}
          onAskTrainer={() => setIsTrainerModalOpen(true)}
        />
      )}

      {/* 1. STARTING OPTION: Scan the SOP Modal */}
      <ScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanSuccess={(extractedDoc) => {
          setIsScanOpen(false);
          setIsAnalyzing(true);
          setTimeout(() => {
            setIsAnalyzing(false);
            setExtractedDocForModal(extractedDoc);
          }, 2000);
        }}
      />

      {/* 2. UPLOAD FILE / PASTE SOP TEXT MODAL */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(extractedDoc) => {
          setIsUploadOpen(false);
          setIsAnalyzing(true);
          setTimeout(() => {
            setIsAnalyzing(false);
            setExtractedDocForModal(extractedDoc);
          }, 2000);
        }}
      />

      {/* Analyzing Modal */}
      <AnalyzingModal 
        isOpen={isAnalyzing} 
        onCancel={() => setIsAnalyzing(false)} 
      />

      {/* 3. SOP GENERATION MODE SELECTION (AUTO-CREATE vs INSTRUCT MODE) */}
      <SopGenerationModal
        isOpen={extractedDocForModal !== null}
        onClose={() => setExtractedDocForModal(null)}
        extractedDoc={extractedDocForModal}
        onDeckCreated={(lesson) => {
          setExtractedDocForModal(null);
          setSelectedLesson(lesson);
          setLessons((prev) => [lesson, ...prev.filter((l) => l.id !== lesson.id)]);
        }}
        onUploadNew={() => {
          setExtractedDocForModal(null);
          setIsUploadOpen(true);
        }}
      />

      {/* SOURCE FIDELITY VALIDATION ERROR MODAL */}
      <ValidationErrorModal
        isOpen={validationError !== null}
        filename={validationError?.filename || 'Document'}
        errorReason={validationError?.reason || 'Content cannot be used.'}
        onClose={() => setValidationError(null)}
        onTryAnother={() => {
          setValidationError(null);
          setIsUploadOpen(true);
        }}
      />

      {/* TRANSITION: AI Observes -> Understands SOP -> Ready */}
      <AiUnderstandModal
        isOpen={analyzingSop !== null}
        sopTitle={analyzingSop?.title || ''}
        confirmationText={analyzingSop?.confirmationText}
        filename={analyzingSop?.filename}
        onComplete={handleAiUnderstandComplete}
      />

      {/* STEP 1: WELCOME ONBOARDING JOURNEY: New / Some / Experienced */}
      {welcomeLesson && (
        <WelcomeJourneyModal
          lesson={welcomeLesson}
          isOpen={welcomeLesson !== null}
          onClose={() => setWelcomeLesson(null)}
          onSelectLevel={handleSelectExperienceLevel}
          onAskTrainer={() => setIsTrainerModalOpen(true)}
        />
      )}

      {/* STEP 2 (Experienced branch): 4-Question Check */}
      <ExperiencedCheckModal
        isOpen={isExperiencedCheckOpen}
        lesson={welcomeLesson || selectedLesson}
        onClose={() => setIsExperiencedCheckOpen(false)}
        onPass={handleExperiencedCheckPass}
        onFail={handleExperiencedCheckFail}
        onAskTrainer={() => setIsTrainerModalOpen(true)}
      />

      {/* STEP 3: 4 LEARNING MODES SCREEN (Know It, Show Me, Guide Me, Test Me) 
          Handled globally via selectedLesson state */}
      
      {/* MODE 1: TRAINING DECK (Universal Teach Me Slide Deck) */}
      {isIntroDeckOpen && selectedLesson && (
        <ExperiencePlayer
          plan={planSlides(selectedLesson)}
          onClose={() => setIsIntroDeckOpen(false)}
          onComplete={() => {
            setIsIntroDeckOpen(false);
            handleStartSimulation(1);
          }}
        />
      )}

      {/* MODE 2: SHOW ME (Google Veo On-Demand AI Video Demonstration) */}
      {isVideoDemoOpen && selectedLesson && (
        <ShowMeVideoModal
          isOpen={isVideoDemoOpen}
          lesson={selectedLesson}
          onClose={() => setIsVideoDemoOpen(false)}
          onContinueToGuideMe={() => {
            setIsVideoDemoOpen(false);
            handleStartSimulation(1);
          }}
        />
      )}


      {/* MODES 2, 3, 4: SHOW ME (0), GUIDE ME (1), TEST ME (2) */}
      {activeSimulator && (
        <SimulatorScreen
          initialPhase={simulatorPhase}
          lesson={activeSimulator}
          sourceMeta={activeSimulator.sourceMeta}
          onClose={() => setActiveSimulator(null)}
          onFinish={handleSimulationFinish}
          onOpenBasics={() => {
            setIsIntroDeckOpen(true);
          }}
          onAskTrainer={() => setIsTrainerModalOpen(true)}
        />
      )}

      {/* OMNIPRESENT: Ask My Trainer Modal */}
      <AskTrainerModal
        isOpen={isTrainerModalOpen}
        onClose={() => setIsTrainerModalOpen(false)}
        currentStepTitle={currentContextTitle}
      />

      {/* P0/P1/P2 Process Passport Trainer Review Modal */}
      <ProcessPassportModal
        isOpen={isPassportModalOpen}
        passport={activePassport}
        perceiveResult={perceiveObservation}
        onClose={() => setIsPassportModalOpen(false)}
        onApprovePassport={(approved) => {
          setActivePassport(approved);
        }}
      />

      {/* OMNIPRESENT: On The Floor Quick Micro-Lessons */}
      <MicroLessonSheet
        isOpen={isMicroLessonOpen}
        onClose={() => setIsMicroLessonOpen(false)}
        onOpenBasics={() => {
          setIsIntroDeckOpen(true);
        }}
        onAskTrainer={() => setIsTrainerModalOpen(true)}
      />

      {/* Fullscreen Bento Architecture Showcase */}
      {showBentoShowcase && (
        <div className="fixed inset-0 z-50 bg-[#F7F7F5] dark:bg-[#0A0D12] overflow-y-auto animate-in fade-in duration-200">
          <BentoArchitectureShowcase onClose={() => setShowBentoShowcase(false)} />
        </div>
      )}
      {isProcessing && (
        <div className="fixed inset-0 z-[60] bg-[#0E1116]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
           <div className="w-16 h-16 border-4 border-white/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
           <h2 className="text-xl font-bold text-white mb-2">Analyzing document...</h2>
           <p className="text-sm text-slate-300 max-w-xs mb-6">Building your operational training experience.</p>
           <button
             onClick={() => {
               setIsProcessing(false);
               isPipelineProcessingRef.current = false;
             }}
             className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
           >
             Cancel
           </button>
        </div>
      )}

      {/* Enterprise Authentication & Persona Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
