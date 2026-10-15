import React from 'react';
import { Slide } from './types';
import { WelcomePage } from './pages/WelcomePage';
import { ObjectivesPage } from './pages/ObjectivesPage';
import { SectionIntroPage } from './pages/SectionIntroPage';
import { TeachStepPage } from './pages/TeachStepPage';
import { ImportantRulePage } from './pages/ImportantRulePage';
import { DoDontPage } from './pages/DoDontPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { DecisionPage } from './pages/DecisionPage';
import { TakeawaysPage } from './pages/TakeawaysPage';
import { CompletionPage } from './pages/CompletionPage';

export function Renderer({
  slide,
  onChoiceSelect,
  feedback,
  onNext,
  slideIndex,
  totalSlides,
  onClose,
}: {
  slide: Slide;
  onChoiceSelect?: (isCorrect: boolean, feedback: string) => void;
  feedback?: string | null;
  onNext: () => void;
  slideIndex?: number;
  totalSlides?: number;
  onClose?: () => void;
}) {
  switch (slide.type) {
    case 'WELCOME':
      return <WelcomePage slide={slide} onNext={onNext} slideIndex={slideIndex} totalSlides={totalSlides} onClose={onClose} />;
    case 'OBJECTIVES':
      return <ObjectivesPage slide={slide} onNext={onNext} />;
    case 'SECTION_INTRO':
      return <SectionIntroPage slide={slide} onNext={onNext} />;
    case 'TEACH_STEP':
      return <TeachStepPage slide={slide} onNext={onNext} />;
    case 'IMPORTANT_RULE':
      return <ImportantRulePage slide={slide} onNext={onNext} />;
    case 'DO_DONT':
      return <DoDontPage slide={slide} onNext={onNext} />;
    case 'REAL_WORLD_SCENARIO':
      return <ScenarioPage slide={slide} onNext={onNext} />;
    case 'DECISION':
      return (
        <DecisionPage
          slide={slide}
          onChoiceSelect={onChoiceSelect!}
          feedback={feedback}
          onNext={onNext}
        />
      );
    case 'KEY_TAKEAWAYS':
      return <TakeawaysPage slide={slide} onNext={onNext} />;
    case 'COMPLETION':
      return <CompletionPage slide={slide} onNext={onNext} />;
    default: {
      const _exhaustiveCheck: never = slide.type;
      throw new Error(`Page type not implemented: ${_exhaustiveCheck}`);
    }
  }
}
