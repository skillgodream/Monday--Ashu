import React from 'react';

interface AppleVisionBackgroundProps {
  children: React.ReactNode;
  showHaloRing?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AppleVisionBackground: React.FC<AppleVisionBackgroundProps> = ({
  children,
  showHaloRing = true,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative w-full overflow-hidden bg-[#FAF8FE] flex flex-col justify-between ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(at 85% 15%, rgba(192, 132, 252, 0.22) 0px, transparent 48%),
          radial-gradient(at 15% 25%, rgba(251, 191, 36, 0.18) 0px, transparent 45%),
          radial-gradient(at 20% 85%, rgba(56, 189, 248, 0.16) 0px, transparent 50%),
          linear-gradient(180deg, #F9F7FD 0%, #F1EEF9 55%, #E9E5F5 100%)
        `,
      }}
    >
      {/* 1. Multi-Layer Ambient Lighting Orbs (VisionOS Aura) */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-fuchsia-400/25 to-purple-600/25 blur-3xl pointer-events-none transform translate-x-12 -translate-y-12" />
      <div className="absolute top-12 left-0 w-72 h-72 rounded-full bg-gradient-to-br from-amber-300/20 to-orange-400/15 blur-3xl pointer-events-none transform -translate-x-16" />
      <div className="absolute bottom-32 left-4 w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-400/18 to-blue-500/15 blur-3xl pointer-events-none" />

      {/* 2. Curving Glass Light Ribbons & SVG Iridescent Specular Halo */}
      {showHaloRing && (
        <svg
          viewBox="0 0 400 800"
          className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="haloViolet" x1="100" y1="200" x2="300" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C084FC" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="ribbonGold" x1="0" y1="100" x2="400" y2="600" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#F472B6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Curving Glass Light Ribbons */}
          <path
            d="M-50 180 C 120 120, 280 240, 450 160"
            stroke="url(#ribbonGold)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M-20 220 C 150 170, 260 320, 430 240"
            stroke="url(#haloViolet)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Large Concentric Halo Circles behind Character */}
          <circle cx="200" cy="330" r="148" stroke="white" strokeWidth="2.5" strokeOpacity="0.75" />
          <circle cx="200" cy="330" r="156" stroke="url(#haloViolet)" strokeWidth="1.5" strokeDasharray="6 8" />
          <circle cx="200" cy="330" r="172" stroke="white" strokeWidth="1" strokeOpacity="0.35" />
        </svg>
      )}

      {/* 3. Foreground Screen Content */}
      <div className="relative z-10 flex flex-col justify-between flex-1 w-full">
        {children}
      </div>
    </div>
  );
};
