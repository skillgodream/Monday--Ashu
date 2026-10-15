import React, { createContext, useContext } from 'react';

// ============================================================================
// 1. DESIGN TOKENS (Light-themed, Premium E-learning Dashboard)
// ============================================================================

export type AccentType = 'indigo' | 'sage' | 'lavender' | 'rose';
export type PanelType = 'default' | 'do' | 'dont' | 'takeaway' | 'subtle';
export type TextStyleType =
  | 'welcome-title'
  | 'slide-title'
  | 'panel-heading'
  | 'body'
  | 'list-item'
  | 'caption'
  | 'pill'
  | 'button'
  | 'counter'
  | 'metadata';

export const tokens = {
  colors: {
    canvas: '#F4F4F6', // Soft clean light gray canvas
    card: '#FFFFFF', // Pure white parent containers and content cards
    charcoal: '#1A1A1A', // Crisp dark charcoal headline text (never pure black)
    slate: '#2D2D2D', // Dark slate secondary/body text
    muted: '#71717A', // Muted slate for metadata
    line: '#ECECF0', // Subtle hairline border
    accent: {
      indigo: { bg: '#EEF1FA', text: '#2D3748', border: '#DCE2F5' },
      sage: { bg: '#EDF5F0', text: '#22543D', border: '#D1E7DD' },
      lavender: { bg: '#F3F1FB', text: '#3F377A', border: '#E4E0F7' },
      rose: { bg: '#FDF2F4', text: '#6B2D38', border: '#F8D7DD' },
    },
    action: {
      primary: '#1E293B', // Deep solid charcoal fill for primary button
      primaryHover: '#0F172A',
      secondary: '#FFFFFF',
      secondaryText: '#475569',
      secondaryBorder: '#E2E8F0',
    },
    semantic: {
      green: { text: '#1E3A2F', bg: '#F0F7F4', border: '#D3E8DF' },
      red: { text: '#4A1E25', bg: '#FDF4F5', border: '#F8D7DA' },
      amber: { text: '#593D17', bg: '#FDF9F0', border: '#F8EECD' },
    },
  },
  spacing: {
    containerPadding: '24px',
    cardPadding: '20px',
    blockGap: '16px',
  },
  radius: {
    cards: '24px',
    containers: '32px',
    pills: '9999px',
    buttons: '9999px',
  },
  shadows: {
    diffused: '0px 8px 30px rgba(0, 0, 0, 0.04)',
    ambient: '0px 20px 40px rgba(0, 0, 0, 0.06)',
    card: '0px 4px 20px rgba(0, 0, 0, 0.03)',
  },
};

// ============================================================================
// ACCENT CONTEXT
// ============================================================================

const AccentContext = createContext<AccentType>('indigo');

export const useAccent = () => useContext(AccentContext);

export const AccentProvider: React.FC<{ value: AccentType; children: React.ReactNode }> = ({ value, children }) => {
  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
};

export function getAccentForSlideType(type: string): AccentType {
  switch (type) {
    case 'WELCOME':
    case 'OBJECTIVES':
      return 'indigo';
    case 'SECTION_INTRO':
      return 'sage';
    case 'TEACH_STEP':
      return 'lavender';
    case 'DO_DONT':
    case 'IMPORTANT_RULE':
      return 'rose';
    case 'REAL_WORLD_SCENARIO':
    case 'DECISION':
      return 'indigo';
    case 'KEY_TAKEAWAYS':
      return 'lavender';
    case 'COMPLETION':
      return 'sage';
    default:
      return 'indigo';
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export function toSentenceCase(text: string): string {
  if (!text || typeof text !== 'string') return text;

  const lower = text.trim().toLowerCase();
  if (!lower) return '';

  let sentence = lower.charAt(0).toUpperCase() + lower.slice(1);

  // Capitalize after sentence terminators
  sentence = sentence.replace(/([.!?]\s+)([a-z])/g, (_m, sep, char) => sep + char.toUpperCase());

  // Preserve domain-specific abbreviations and acronyms
  const preservationMap: Record<string, string> = {
    guruji: 'Guruji',
    sop: 'SOP',
    nfbc: 'NFBC',
    dob: 'DOB',
    fifo: 'FIFO',
    ppe: 'PPE',
    'room sanitization': 'Room Sanitization',
    do: 'Do',
    dont: "Don't",
  };

  Object.entries(preservationMap).forEach(([lowerWord, displayWord]) => {
    const regex = new RegExp(`\\b${lowerWord}\\b`, 'gi');
    sentence = sentence.replace(regex, displayWord);
  });

  return sentence;
}

// ============================================================================
// 2. PRIMITIVE COMPONENTS (Clean, Light-Themed, Anti-Gamification)
// ============================================================================

export const Text: React.FC<{
  styleName: TextStyleType;
  children: React.ReactNode;
  emphasis?: string;
  className?: string;
}> = ({ styleName, children, emphasis, className = '' }) => {
  const stylesMap: Record<TextStyleType, string> = {
    'welcome-title': "font-['Plus_Jakarta_Sans',sans-serif] text-[32px] leading-[38px] font-extrabold text-[#1A1A1A] tracking-tight",
    'slide-title': "font-['Plus_Jakarta_Sans',sans-serif] text-[22px] sm:text-[24px] leading-[30px] font-bold text-[#1A1A1A] tracking-tight",
    'panel-heading': "font-['Plus_Jakarta_Sans',sans-serif] text-[17px] leading-[22px] font-bold text-[#1A1A1A] tracking-tight",
    'body': "font-['Plus_Jakarta_Sans',sans-serif] text-[13px] sm:text-[14px] leading-[20px] font-normal text-[#2D2D2D]",
    'list-item': "font-['Plus_Jakarta_Sans',sans-serif] text-[13px] sm:text-[14px] leading-[19px] font-semibold text-[#1A1A1A]",
    'caption': "font-['Plus_Jakarta_Sans',sans-serif] text-[12px] leading-[16px] font-medium text-[#71717A]",
    'pill': "font-['Plus_Jakarta_Sans',sans-serif] text-[11px] leading-[14px] font-semibold tracking-normal",
    'button': "font-['Plus_Jakarta_Sans',sans-serif] text-[14px] leading-[18px] font-bold tracking-tight",
    'counter': "font-['Plus_Jakarta_Sans',sans-serif] text-[12px] leading-[16px] font-semibold tabular-nums text-[#71717A] whitespace-nowrap shrink-0",
    'metadata': "font-['Plus_Jakarta_Sans',sans-serif] text-[11px] sm:text-[12px] leading-[16px] font-medium text-[#71717A] tracking-wide",
  };

  const baseClass = stylesMap[styleName] || stylesMap['body'];

  if (typeof children !== 'string') {
    return <span className={`${baseClass} ${className}`}>{children}</span>;
  }

  const sentenceText = toSentenceCase(children);

  if (!emphasis || !sentenceText.toLowerCase().includes(emphasis.toLowerCase())) {
    return <span className={`${baseClass} ${className}`}>{sentenceText}</span>;
  }

  const empLower = emphasis.toLowerCase();
  const index = sentenceText.toLowerCase().indexOf(empLower);
  if (index === -1) {
    return <span className={`${baseClass} ${className}`}>{sentenceText}</span>;
  }

  const before = sentenceText.slice(0, index);
  const matched = sentenceText.slice(index, index + emphasis.length);
  const after = sentenceText.slice(index + emphasis.length);

  return (
    <span className={`${baseClass} ${className}`}>
      {before}
      <span className="bg-[#EAEAF0] rounded-sm px-1 py-0.5 text-[#1A1A1A]">{matched}</span>
      {after}
    </span>
  );
};

export const Pill: React.FC<{
  children: string;
  className?: string;
}> = ({ children, className = '' }) => {
  const accent = useAccent();

  const accentStyles: Record<AccentType, string> = {
    indigo: 'text-[#2D3748] bg-[#EEF1FA] border border-[#DCE2F5]',
    sage: 'text-[#22543D] bg-[#EDF5F0] border border-[#D1E7DD]',
    lavender: 'text-[#3F377A] bg-[#F3F1FB] border border-[#E4E0F7]',
    rose: 'text-[#6B2D38] bg-[#FDF2F4] border border-[#F8D7DD]',
  };

  const resolvedColors = accentStyles[accent] || accentStyles.indigo;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap select-none max-w-[28ch] overflow-hidden text-ellipsis ${resolvedColors} ${className}`}
    >
      <Text styleName="pill">{children}</Text>
    </span>
  );
};

/**
 * Clean, modern section header for SOP steps:
 * Bold prominent title, clean metadata text with typographic separators, pure white card with soft shadow
 */
export const SopHeader: React.FC<{
  tag: string;
  title: string;
  metadata?: string[];
  icon?: React.ReactNode;
  className?: string;
}> = ({ tag, title, metadata = [], icon, className = '' }) => {
  return (
    <div
      className={`bg-white rounded-[24px] p-5 sm:p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] flex items-center justify-between gap-4 text-left select-none ${className}`}
    >
      <div className="flex-1 min-w-0">
        {/* Horizontal Metadata Row with typographic separators */}
        <div className="flex items-center gap-2 text-xs text-[#71717A] font-medium mb-1.5 flex-wrap">
          <span className="text-[#4B5EAA] font-semibold">{toSentenceCase(tag)}</span>
          {metadata.map((item, idx) => (
            <React.Fragment key={idx}>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Prominent Section Headline */}
        <h2 className="text-xl sm:text-[22px] font-bold text-[#1A1A1A] tracking-tight leading-snug">
          {toSentenceCase(title)}
        </h2>
      </div>

      {/* Subtle Right Icon/Affordance Container */}
      {icon && (
        <div className="w-11 h-11 rounded-2xl bg-[#F4F4F6] border border-black/[0.04] text-[#475569] flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
};

/**
 * List Row: Subtle minimalist icon on left, main title, right-aligned secondary detail
 */
export const Row: React.FC<{
  icon?: React.ReactNode;
  isTick?: boolean;
  isCross?: boolean;
  secondaryDetail?: string;
  children: string;
  className?: string;
}> = ({ icon, isTick, isCross, secondaryDetail, children, className = '' }) => {
  let leadingIcon: React.ReactNode = icon;

  if (!leadingIcon) {
    if (isTick) {
      leadingIcon = (
        <div className="w-5 h-5 rounded-full bg-[#EDF5F0] border border-[#D1E7DD] text-[#22543D] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    } else if (isCross) {
      leadingIcon = (
        <div className="w-5 h-5 rounded-full bg-[#FDF2F4] border border-[#F8D7DD] text-[#6B2D38] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    } else {
      // Minimalist geometric outline shape (subtle circle)
      leadingIcon = (
        <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 shrink-0 mt-1.5" />
      );
    }
  }

  return (
    <div
      className={`flex items-start justify-between gap-3 p-3.5 sm:p-4 bg-white rounded-[20px] border border-black/[0.04] shadow-[0px_2px_8px_rgba(0,0,0,0.02)] hover:border-black/[0.08] transition-colors ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="shrink-0 mt-0.5">{leadingIcon}</div>
        <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[13px] sm:text-sm font-semibold text-[#2D2D2D] leading-relaxed">
          {toSentenceCase(children)}
        </span>
      </div>

      {secondaryDetail && (
        <span className="text-[11px] font-medium text-[#71717A] shrink-0 pt-0.5 pl-2">
          {secondaryDetail}
        </span>
      )}
    </div>
  );
};

export const Panel: React.FC<{
  type?: PanelType;
  children: React.ReactNode;
  className?: string;
}> = ({ type = 'default', children, className = '' }) => {
  const bgStyles: Record<PanelType, string> = {
    default: 'bg-white border border-black/[0.04] shadow-[0px_8px_30px_rgba(0,0,0,0.04)] text-[#2D2D2D]',
    do: 'bg-[#EDF5F0] border border-[#D1E7DD] text-[#22543D]',
    dont: 'bg-[#FDF2F4] border border-[#F8D7DD] text-[#6B2D38]',
    takeaway: 'bg-[#F3F1FB] border border-[#E4E0F7] text-[#3F377A]',
    subtle: 'bg-[#F4F4F6] border border-black/[0.04] text-[#2D2D2D]',
  };

  const resolvedBg = bgStyles[type] || bgStyles.default;

  return (
    <div className={`p-5 rounded-[24px] ${resolvedBg} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Rich Media Integration: Elegant container clipping imagery with rounded corners and high-blur shadow
 */
export const ImageSlot: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
  textContext?: string;
}> = ({ src, alt = 'Visual illustration', className = '', textContext }) => {
  let resolvedSrc = src;
  const isUnsplash = src?.includes('unsplash.com') || src?.includes('picsum.photos');

  if (!resolvedSrc || isUnsplash) {
    resolvedSrc = undefined;
  }

  if (!resolvedSrc) {
    return (
      <div
        className={`relative aspect-[16/10] w-full max-h-[220px] rounded-[24px] bg-[#EEF1FA] border border-black/[0.04] flex flex-col items-center justify-center p-5 select-none shrink-0 overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.03)] ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-xs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
        <span className="mt-2 text-xs font-semibold text-[#475569] select-none text-center px-4 max-w-xs">
          {toSentenceCase(alt || 'Visual representation')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[16/10] w-full max-h-[220px] rounded-[24px] overflow-hidden bg-slate-100 border border-black/[0.04] shrink-0 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] ${className}`}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover rounded-[24px] transition-opacity duration-300"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className =
              'absolute inset-0 flex flex-col items-center justify-center bg-[#EEF1FA] text-slate-500 p-4';
            fallbackDiv.innerHTML = `
              <div class="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-xs">
                <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="4"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <path d="m21 15-5-5L5 21"></path>
                </svg>
              </div>
              <span class="mt-2 text-xs font-semibold text-slate-600 text-center">${toSentenceCase(alt || 'Visual Reference')}</span>
            `;
            parent.appendChild(fallbackDiv);
          }
        }}
      />
    </div>
  );
};

/**
 * Modern pill-shaped or fully rounded action button:
 * Deep solid fill for primary, text/subtle border for secondary
 */
export const Button: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: 'primary' | 'secondary' | 'ghost';
}> = ({ onClick, disabled, children, className = '', type = 'primary' }) => {
  let styleClasses = '';

  if (type === 'primary') {
    styleClasses =
      'bg-[#1E293B] text-white hover:bg-[#0F172A] active:scale-[0.99] disabled:bg-slate-300 disabled:text-slate-500 shadow-[0px_4px_16px_rgba(30,41,59,0.15)]';
  } else if (type === 'secondary') {
    styleClasses =
      'bg-white text-[#2D2D2D] border border-black/[0.08] hover:bg-slate-50 active:scale-[0.99] disabled:opacity-40 shadow-[0px_2px_8px_rgba(0,0,0,0.02)]';
  } else {
    styleClasses = 'bg-transparent text-[#71717A] hover:text-[#1A1A1A] hover:bg-black/[0.03] disabled:opacity-40';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] px-8 py-3 rounded-full flex items-center justify-center gap-2 select-none font-bold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${styleClasses} ${className}`}
    >
      {typeof children === 'string' ? <Text styleName="button">{children}</Text> : children}
    </button>
  );
};
