import React, { useState } from 'react';
import { Slide, SlideType } from '../experiment/types';
import { WelcomePage } from '../experiment/pages/WelcomePage';
import { ObjectivesPage } from '../experiment/pages/ObjectivesPage';
import { SectionIntroPage } from '../experiment/pages/SectionIntroPage';
import { TeachStepPage } from '../experiment/pages/TeachStepPage';
import { DoDontPage } from '../experiment/pages/DoDontPage';
import { ImportantRulePage } from '../experiment/pages/ImportantRulePage';
import { ScenarioPage } from '../experiment/pages/ScenarioPage';
import { DecisionPage } from '../experiment/pages/DecisionPage';
import { TakeawaysPage } from '../experiment/pages/TakeawaysPage';
import { CompletionPage } from '../experiment/pages/CompletionPage';
import { AccentProvider, getAccentForSlideType } from '../experiment/tokens';

// ============================================================================
// THREE DATASETS (SHORT, NORMAL, LONGEST ALLOWED)
// ============================================================================

const DATASETS: Record<'short' | 'normal' | 'longest', Record<SlideType, Slide>> = {
  short: {
    WELCOME: {
      type: 'WELCOME',
      title: 'Welcome title',
      content: 'Welcome content text',
      role: 'Role: frontline spec'
    },
    OBJECTIVES: {
      type: 'OBJECTIVES',
      title: 'Objectives',
      lead: 'Lead text',
      items: ['Goal one', 'Goal two']
    },
    SECTION_INTRO: {
      type: 'SECTION_INTRO',
      title: 'Before starting',
      content: 'Prepare tools',
      fl: ['Tool one', 'Tool two']
    },
    TEACH_STEP: {
      type: 'TEACH_STEP',
      step: 'Step 1 of 2',
      title: 'First step title',
      items: ['Step action one', 'Step action two']
    },
    DO_DONT: {
      type: 'DO_DONT',
      title: 'Do and don\'t',
      dos: ['Do correct'],
      donts: ['Don\'t incorrect']
    },
    IMPORTANT_RULE: {
      type: 'IMPORTANT_RULE',
      title: 'Always double check parameters',
      why: 'Saves time and prevents failures'
    },
    REAL_WORLD_SCENARIO: {
      type: 'REAL_WORLD_SCENARIO',
      title: 'Scenario title',
      content: 'Short scenario situation description'
    },
    DECISION: {
      type: 'DECISION',
      title: 'Select one',
      opts: [
        { t: 'Action yes', ok: 1, why: 'Right' },
        { t: 'Action no', why: 'Wrong' }
      ]
    },
    KEY_TAKEAWAYS: {
      type: 'KEY_TAKEAWAYS',
      title: 'Summary',
      items: ['Takeaway one']
    },
    COMPLETION: {
      type: 'COMPLETION',
      title: 'All done',
      content: 'Completed lesson',
      next: 'Next mode',
      nb: 'Guidance'
    }
  },
  normal: {
    WELCOME: {
      type: 'WELCOME',
      title: 'Housekeeping Room Sanitization',
      content: 'Ensure a safe guest environment through our 5-step sanitization protocol.',
      role: 'Role: housekeeping attendant'
    },
    OBJECTIVES: {
      type: 'OBJECTIVES',
      title: 'What You Will Learn',
      lead: 'By the end of this section, you will be able to:',
      items: [
        'Prepare sanitizer to the correct dilution ratio',
        'Sanitize high-touch surfaces effectively',
        'Handle visible debris and dirt correctly'
      ]
    },
    SECTION_INTRO: {
      type: 'SECTION_INTRO',
      title: 'Before You Sanitize',
      content: 'Get your tools and supplies ready for a safe and effective clean.',
      fl: ['Gloves on', 'Sanitizer 1:10', 'Blue applicator bottle', 'Microfibre cloths']
    },
    TEACH_STEP: {
      type: 'TEACH_STEP',
      step: 'Step 1 of 2',
      title: 'Prepare Sanitizer',
      items: [
        'Dilute the surface sanitizer using a 1:10 ratio',
        'Use the blue applicator bottle',
        'Label the bottle with today’s date'
      ]
    },
    DO_DONT: {
      type: 'DO_DONT',
      title: 'Do and Don’t Guidelines',
      dos: ['Wipe visible dirt with a damp cloth', 'Spray all high-touch surfaces'],
      donts: ['Spray sanitizer directly over dirt', 'Miss high-touch areas like remotes']
    },
    IMPORTANT_RULE: {
      type: 'IMPORTANT_RULE',
      title: 'Improper dilution fails to neutralize viral pathogens effectively.',
      why: 'Safety and efficacy. Always measure. Never guess the ratio.'
    },
    REAL_WORLD_SCENARIO: {
      type: 'REAL_WORLD_SCENARIO',
      title: 'Dust on the Surface',
      content: 'You are about to spray a surface and notice visible dust and debris.'
    },
    DECISION: {
      type: 'DECISION',
      title: 'How do you handle the visible debris?',
      opts: [
        { t: 'Wipe dirt with a damp microfibre cloth first', ok: 1, why: 'Right. Clean first, then sanitize.' },
        { t: 'Spray sanitizer directly over the dirt', why: 'Dirt blocks the sanitizer, so germs survive.' }
      ]
    },
    KEY_TAKEAWAYS: {
      type: 'KEY_TAKEAWAYS',
      title: 'Key Takeaways',
      items: [
        'Dilute sanitizer 1:10 in the blue bottle',
        'Wipe visible dirt before you spray',
        'Spray every high-touch area'
      ]
    },
    COMPLETION: {
      type: 'COMPLETION',
      title: 'Great Job!',
      content: 'You’ve completed the operational overview for this section.',
      next: 'Next: Guide Me',
      nb: 'Practise the steps with a coach beside you.'
    }
  },
  longest: {
    WELCOME: {
      type: 'WELCOME',
      // Title is maximum 60 characters
      title: 'Title is maximum sixty characters allowed under guidelines',
      // Lead is maximum 110 characters
      role: 'Role: frontline operations specialist lead assessment officer',
      content: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow'
    },
    OBJECTIVES: {
      type: 'OBJECTIVES',
      title: 'Title is maximum sixty characters allowed under guidelines',
      lead: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow',
      items: [
        'List item is maximum seventy characters under guidelines for readability',
        'Verify work order parameters and item details before starting process',
        'Validate output quality and confirm parameters match standard SOP'
      ]
    },
    SECTION_INTRO: {
      type: 'SECTION_INTRO',
      title: 'Title is maximum sixty characters allowed under guidelines',
      content: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow',
      fl: [
        'List item is maximum seventy characters under guidelines for readability',
        'Verify work order parameters and item details before starting process',
        'Validate output quality and confirm parameters match standard SOP'
      ]
    },
    TEACH_STEP: {
      type: 'TEACH_STEP',
      step: 'Step 1 of 2 extra long pill', // Pill 28 characters
      title: 'Title is maximum sixty characters allowed under guidelines',
      items: [
        'List item is maximum seventy characters under guidelines for readability',
        'Verify work order parameters and item details before starting process',
        'Validate output quality and confirm parameters match standard SOP'
      ]
    },
    DO_DONT: {
      type: 'DO_DONT',
      title: 'Title is maximum sixty characters allowed under guidelines',
      dos: [
        'List item is maximum seventy characters under guidelines for readability',
        'Verify work order parameters and item details before starting process'
      ],
      donts: [
        'List item is maximum seventy characters under guidelines for readability',
        'Bypass pre-execution safety or identity verifications in SOP'
      ]
    },
    IMPORTANT_RULE: {
      type: 'IMPORTANT_RULE',
      title: 'Title is maximum sixty characters allowed under guidelines',
      why: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow'
    },
    REAL_WORLD_SCENARIO: {
      type: 'REAL_WORLD_SCENARIO',
      title: 'Title is maximum sixty characters allowed under guidelines',
      content: 'Scenario text is maximum 140 characters under the design limits guidelines to ensure there is zero text wrapping or overlap inside cards.'
    },
    DECISION: {
      type: 'DECISION',
      title: 'Title is maximum sixty characters allowed under guidelines',
      opts: [
        { 
          t: 'List item is maximum seventy characters under guidelines for readability', 
          ok: 1, 
          why: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow' 
        },
        { 
          t: 'Bypass pre-execution safety or identity verifications in process', 
          why: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow' 
        }
      ]
    },
    KEY_TAKEAWAYS: {
      type: 'KEY_TAKEAWAYS',
      title: 'Title is maximum sixty characters allowed under guidelines',
      items: [
        'List item is maximum seventy characters under guidelines for readability',
        'Verify work order parameters and item details before starting process',
        'Validate output quality and confirm parameters match standard SOP'
      ]
    },
    COMPLETION: {
      type: 'COMPLETION',
      title: 'Title is maximum sixty characters allowed under guidelines',
      content: 'Lead sentence is maximum 110 characters under design system guidelines so it does not overflow',
      next: 'Next mode is maximum seventy characters allowed for consistency',
      nb: 'Practise the steps with live coach guidance beside you at all times'
    }
  }
};

const PAGES_LIST: { name: string; type: SlideType }[] = [
  { name: '1. Welcome', type: 'WELCOME' },
  { name: '2. Objectives', type: 'OBJECTIVES' },
  { name: '3. Section Intro', type: 'SECTION_INTRO' },
  { name: '4. Teach Step', type: 'TEACH_STEP' },
  { name: '5. Do & Don\'t', type: 'DO_DONT' },
  { name: '6. Critical Rule', type: 'IMPORTANT_RULE' },
  { name: '7. Scenario', type: 'REAL_WORLD_SCENARIO' },
  { name: '8. Decision', type: 'DECISION' },
  { name: '9. Key Takeaways', type: 'KEY_TAKEAWAYS' },
  { name: '10. Completion', type: 'COMPLETION' },
];

export function DesignCheckScreen({ onBack }: { onBack: () => void }) {
  const [selectedDataset, setSelectedDataset] = useState<'short' | 'normal' | 'longest'>('normal');

  const renderPage = (type: SlideType, dataset: 'short' | 'normal' | 'longest') => {
    const slide = DATASETS[dataset][type];
    const accent = getAccentForSlideType(type);

    const onNextPlaceholder = () => console.log('Next clicked');
    const onChoiceSelectPlaceholder = (ok: boolean, fb: string) => console.log('Choice selected:', ok, fb);

    return (
      <AccentProvider value={accent}>
        <div className="bg-[#F4F4F6] p-5 min-h-[300px]">
          {(() => {
            switch (type) {
              case 'WELCOME':
                return <WelcomePage slide={slide} onNext={onNextPlaceholder} />;
              case 'OBJECTIVES':
                return <ObjectivesPage slide={slide} onNext={onNextPlaceholder} />;
              case 'SECTION_INTRO':
                return <SectionIntroPage slide={slide} onNext={onNextPlaceholder} />;
              case 'TEACH_STEP':
                return <TeachStepPage slide={slide} onNext={onNextPlaceholder} />;
              case 'DO_DONT':
                return <DoDontPage slide={slide} onNext={onNextPlaceholder} />;
              case 'IMPORTANT_RULE':
                return <ImportantRulePage slide={slide} onNext={onNextPlaceholder} />;
              case 'REAL_WORLD_SCENARIO':
                return <ScenarioPage slide={slide} onNext={onNextPlaceholder} />;
              case 'DECISION':
                return (
                  <DecisionPage
                    slide={slide}
                    onChoiceSelect={onChoiceSelectPlaceholder}
                    feedback={null}
                    onNext={onNextPlaceholder}
                  />
                );
              case 'KEY_TAKEAWAYS':
                return <TakeawaysPage slide={slide} onNext={onNextPlaceholder} />;
              case 'COMPLETION':
                return <CompletionPage slide={slide} onNext={onNextPlaceholder} />;
              default:
                return null;
            }
          })()}
        </div>
      </AccentProvider>
    );
  };

  return (
    <div className="bg-[#0F1B3D] min-h-screen text-white font-['Plus_Jakarta_Sans']">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#E3E8F4]/10 px-6 flex items-center justify-between bg-[#0F1B3D] shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-full border border-[#E3E8F4]/20 hover:bg-[#3C4660] transition-all cursor-pointer font-bold text-sm"
          >
            ← Back to App
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">Design System Verification Workspace</h1>
        </div>

        {/* Dataset segment control */}
        <div className="flex bg-[#3C4660] p-1 rounded-lg">
          {(['short', 'normal', 'longest'] as const).map((ds) => (
            <button
              key={ds}
              onClick={() => setSelectedDataset(ds)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer capitalize ${
                selectedDataset === ds ? 'bg-[#3B4FE0] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              {ds} text
            </button>
          ))}
        </div>
      </header>

      {/* Grid of Pages at 360px and 390px */}
      <main className="p-8 max-w-7xl mx-auto space-y-12">
        <div className="bg-[#3C4660]/20 border border-[#E3E8F4]/10 rounded-2xl p-6">
          <h2 className="text-lg font-extrabold mb-2 text-[#E1E8FF]">Verification Criteria</h2>
          <p className="text-sm text-slate-300">
            This viewport grid renders all 10 slide templates side-by-side at strictly <strong>360px</strong> and{' '}
            <strong>390px</strong> width columns to verify layout responsiveness and prevent font shrink, clipping, or
            text truncation anomalies.
          </p>
        </div>

        {PAGES_LIST.map((page) => (
          <section key={page.type} className="space-y-4 border-b border-[#E3E8F4]/10 pb-8 last:border-0">
            <h3 className="text-xl font-extrabold text-[#E1E8FF] px-1">{page.name}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* 360px Viewport */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 px-1">Column Width: 360px (Standard Frontline Device)</span>
                <div
                  style={{ width: '360px' }}
                  className="rounded-[28px] border-4 border-[#3C4660] shadow-2xl overflow-hidden bg-[#F4F4F6]"
                >
                  {renderPage(page.type, selectedDataset)}
                </div>
              </div>

              {/* 390px Viewport */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 px-1">Column Width: 390px (Premium Frontline Device)</span>
                <div
                  style={{ width: '390px' }}
                  className="rounded-[28px] border-4 border-[#3C4660] shadow-2xl overflow-hidden bg-[#F4F4F6]"
                >
                  {renderPage(page.type, selectedDataset)}
                </div>
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
