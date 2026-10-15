import React from 'react';
const koalaImg = "/Coachguru.png";

interface ClayArtProps {
  type: 'scanner' | 'tote' | 'box' | 'safety' | 'clipboard' | 'trolley' | 'medal' | 'guru' | 'printer' | 'tape';
  size?: number;
  className?: string;
}

export default function ClayArt({ type, size = 120, className = '' }: ClayArtProps) {
  switch (type) {
    case 'scanner':
      return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="bodyGrad" x1="40" y1="20" x2="120" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2A384B" />
              <stop offset="60%" stopColor="#1E2836" />
              <stop offset="100%" stopColor="#111722" />
            </linearGradient>
            <linearGradient id="screenGrad" x1="50" y1="35" x2="105" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="triggerGrad" x1="45" y1="85" x2="65" y2="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <filter id="clayShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#0F172A" floodOpacity="0.22" />
            </filter>
          </defs>
          {/* Contact shadow */}
          <ellipse cx="80" cy="142" rx="46" ry="10" fill="#0E1726" fillOpacity="0.14" />
          {/* Main scanner housing */}
          <g filter="url(#clayShadow)">
            {/* Grip handle */}
            <path d="M72 82 L65 125 C64 130 68 135 74 135 L86 135 C92 135 96 130 95 125 L88 82 Z" fill="#1E293B" />
            {/* Pistol trigger */}
            <rect x="58" y="86" width="16" height="12" rx="5" fill="url(#triggerGrad)" />
            {/* Main top head */}
            <rect x="42" y="24" width="76" height="64" rx="20" fill="url(#bodyGrad)" />
            {/* Yellow bumper bumper guard */}
            <rect x="38" y="20" width="84" height="10" rx="5" fill="#FBBF24" />
            {/* Illuminated screen */}
            <rect x="52" y="34" width="56" height="42" rx="10" fill="url(#screenGrad)" />
            {/* Scan target icon on screen */}
            <circle cx="80" cy="55" r="9" stroke="#064E3B" strokeWidth="2.5" fill="none" strokeDasharray="3 3" />
            <circle cx="80" cy="55" r="3" fill="#064E3B" />
          </g>
        </svg>
      );

    case 'tote':
      return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="toteGrad" x1="30" y1="40" x2="130" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="rimGrad" x1="20" y1="36" x2="140" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          {/* Shadow */}
          <ellipse cx="80" cy="140" rx="52" ry="12" fill="#0E1726" fillOpacity="0.16" />
          {/* Plastic tote body */}
          <path d="M34 52 L44 126 C45 131 49 135 55 135 L105 135 C111 135 115 131 116 126 L126 52 Z" fill="url(#toteGrad)" />
          {/* Reinforced ribbed bands */}
          <path d="M40 78 L120 78" stroke="#1E40AF" strokeWidth="5" strokeLinecap="round" />
          <path d="M43 104 L117 104" stroke="#1E40AF" strokeWidth="5" strokeLinecap="round" />
          {/* White barcode label sticker */}
          <rect x="62" y="86" width="36" height="22" rx="4" fill="#FFFFFF" />
          <rect x="67" y="90" width="3" height="14" fill="#0F172A" />
          <rect x="73" y="90" width="2" height="14" fill="#0F172A" />
          <rect x="78" y="90" width="4" height="14" fill="#0F172A" />
          <rect x="85" y="90" width="2" height="14" fill="#0F172A" />
          <rect x="90" y="90" width="3" height="14" fill="#0F172A" />
          {/* Top thick rim */}
          <rect x="26" y="38" width="108" height="16" rx="8" fill="url(#rimGrad)" />
          {/* Hand grip cutouts */}
          <rect x="66" y="42" width="28" height="8" rx="4" fill="#1E3A8A" fillOpacity="0.45" />
        </svg>
      );

    case 'safety':
      return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="coneGrad" x1="45" y1="20" x2="115" y2="135" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="60%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="144" rx="50" ry="11" fill="#0E1726" fillOpacity="0.18" />
          {/* Base square */}
          <rect x="34" y="124" width="92" height="16" rx="8" fill="#1E293B" />
          {/* Traffic cone body */}
          <path d="M72 24 L42 124 L118 124 L88 24 Z" fill="url(#coneGrad)" />
          {/* Cone top cap rounded */}
          <ellipse cx="80" cy="24" rx="8" ry="4" fill="#FB923C" />
          {/* Reflective white stripes */}
          <path d="M64 54 L55 84 L105 84 L96 54 Z" fill="#F8FAFC" />
          <path d="M51 96 L45 116 L115 116 L109 96 Z" fill="#F8FAFC" />
        </svg>
      );

    case 'box':
      return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="cartonFront" x1="30" y1="60" x2="130" y2="135" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E2A86E" />
              <stop offset="100%" stopColor="#B47B45" />
            </linearGradient>
            <linearGradient id="cartonTop" x1="30" y1="30" x2="130" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5CBA2" />
              <stop offset="100%" stopColor="#D99757" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="142" rx="48" ry="12" fill="#0E1726" fillOpacity="0.16" />
          {/* Box front */}
          <rect x="34" y="60" width="92" height="72" rx="14" fill="url(#cartonFront)" />
          {/* Box top flap */}
          <path d="M34 68 L80 34 L126 68 L80 82 Z" fill="url(#cartonTop)" />
          {/* Reinforced packing tape stripe */}
          <rect x="74" y="36" width="12" height="96" rx="4" fill="#78350F" fillOpacity="0.32" />
          {/* Fragile/Up arrows label */}
          <rect x="44" y="80" width="22" height="28" rx="4" fill="#FEF3C7" />
          <path d="M55 86 L50 94 L53 94 L53 102 L57 102 L57 94 L60 94 Z" fill="#B45309" />
        </svg>
      );

    case 'clipboard':
      return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="clipBoard" x1="35" y1="35" x2="125" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="142" rx="44" ry="10" fill="#0E1726" fillOpacity="0.14" />
          {/* Board */}
          <rect x="36" y="32" width="88" height="106" rx="16" fill="url(#clipBoard)" />
          {/* White paper */}
          <rect x="44" y="44" width="72" height="88" rx="10" fill="#FFFFFF" />
          {/* Check rows */}
          <rect x="52" y="58" width="10" height="10" rx="3" fill="#10B981" />
          <path d="M54 63 L56 65 L60 59" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <rect x="68" y="61" width="40" height="4" rx="2" fill="#E2E8F0" />

          <rect x="52" y="76" width="10" height="10" rx="3" fill="#10B981" />
          <path d="M54 81 L56 83 L60 77" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <rect x="68" y="79" width="36" height="4" rx="2" fill="#E2E8F0" />

          <rect x="52" y="94" width="10" height="10" rx="3" fill="#10B981" />
          <path d="M54 99 L56 101 L60 95" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          <rect x="68" y="97" width="30" height="4" rx="2" fill="#E2E8F0" />

          {/* Metal top clamp */}
          <rect x="62" y="24" width="36" height="16" rx="6" fill="#E2E8F0" />
          <circle cx="80" cy="30" r="3" fill="#64748B" />
        </svg>
      );

    case 'medal':
      return (
        <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <defs>
            <linearGradient id="goldGrad" x1="45" y1="50" x2="115" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <linearGradient id="ribbonLeft" x1="45" y1="18" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="144" rx="42" ry="10" fill="#0E1726" fillOpacity="0.18" />
          {/* Ribbons */}
          <path d="M56 18 L76 72 L62 76 L42 22 Z" fill="url(#ribbonLeft)" />
          <path d="M104 18 L84 72 L98 76 L118 22 Z" fill="#2563EB" />
          {/* Gold Coin Medal */}
          <circle cx="80" cy="94" r="40" fill="url(#goldGrad)" />
          <circle cx="80" cy="94" r="33" stroke="#FEF08A" strokeWidth="3" fill="none" />
          {/* Star in center */}
          <path d="M80 75 L84 87 L97 87 L87 95 L91 107 L80 100 L69 107 L73 95 L63 87 L76 87 Z" fill="#FFFFFF" />
        </svg>
      );

    case 'guru':
    default:
      return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
          <img
            src="/Coachguru.png"
            alt="Coach Guru Home Page Character"
            className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = koalaImg;
            }}
          />
        </div>
      );
  }
}

