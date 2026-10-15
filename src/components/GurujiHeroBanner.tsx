import React from 'react';

interface GurujiHeroBannerProps {
  className?: string;
}

export default function GurujiHeroBanner({ className = '' }: GurujiHeroBannerProps) {
  return (
    <div className={`relative w-full flex items-center justify-center overflow-hidden ${className}`}>
      {/* Background Soft Pastel Gradient & Ambient Halo */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F3EEFF] via-[#EAE5FC] to-[#F7F4FD] pointer-events-none" />

      {/* Subtle curved ambient glow rings in background */}
      <div className="absolute w-[360px] h-[360px] rounded-full border border-purple-200/50 -top-8 -right-16 pointer-events-none" />
      <div className="absolute w-[420px] h-[420px] rounded-full border border-indigo-200/40 -top-16 -left-20 pointer-events-none" />

      {/* Central Concentric Ring Container */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
        {/* Outer Glowing Ring */}
        <div className="absolute inset-0 rounded-full border-[2.5px] border-purple-300/60 shadow-[0_0_30px_rgba(168,85,247,0.12)]" />
        <div className="absolute inset-1.5 rounded-full border border-purple-200/40" />
        <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-white/80 via-white/40 to-purple-100/30 backdrop-blur-xs" />

        {/* Home Page Character Image */}
        <img
          src="/Coachguru.png"
          alt="Coach Guru Home Page Character"
          className="w-full h-full object-contain relative z-10 drop-shadow-[0_16px_24px_rgba(30,27,75,0.16)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/guruji 1.png";
          }}
        />
      </div>
    </div>
  );
}
