import React from 'react';
import * as LucideIcons from 'lucide-react';

export type IconKey =
  | 'ShieldAlert'
  | 'ScanBarcode'
  | 'Thermometer'
  | 'Microscope'
  | 'Boxes'
  | 'FileCheck'
  | 'Droplets'
  | 'Sparkles'
  | 'SprayCan'
  | 'Syringe'
  | 'ClipboardCheck'
  | 'Users'
  | 'CheckCircle'
  | 'AlertTriangle'
  | 'Zap'
  | 'Scale'
  | 'Truck'
  | 'Lock'
  | 'Settings'
  | 'Target'
  | 'Lightbulb'
  | 'ArrowRight'
  | 'GraduationCap'
  | 'PartyPopper'
  | 'Prohibited'
  | 'bottle'
  | 'spray'
  | 'room'
  | 'warn'
  | 'wipe'
  | 'check'
  | 'x'
  | 'bulb'
  | 'arrow'
  | 'cap'
  | 'party'
  | 'slash'
  | string;

// Legacy alias map to modern Lucide components
const legacyAliasMap: Record<string, string> = {
  bottle: 'Droplets',
  spray: 'SprayCan',
  room: 'Home',
  warn: 'AlertTriangle',
  wipe: 'Sparkles',
  check: 'CheckCircle',
  x: 'XCircle',
  bulb: 'Lightbulb',
  arrow: 'ArrowRight',
  cap: 'GraduationCap',
  party: 'PartyPopper',
  slash: 'Ban',
  target: 'Target',
};

export const TeachMeIcon: React.FC<{
  name: IconKey | string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}> = ({ name, className = '', style, size = 20 }) => {
  const normalizedKey = (name || 'CheckCircle').trim();
  
  // Resolve alias or normalize pascal case
  let targetIconName = legacyAliasMap[normalizedKey.toLowerCase()] || normalizedKey;

  // Convert snake_case or kebab-case to PascalCase (e.g. scan_barcode -> ScanBarcode)
  if (targetIconName.includes('-') || targetIconName.includes('_')) {
    targetIconName = targetIconName
      .split(/[-_]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  // Attempt to load from LucideIcons library
  const LucideComponent = (LucideIcons as any)[targetIconName] || 
    (LucideIcons as any)[targetIconName.charAt(0).toUpperCase() + targetIconName.slice(1)] || 
    LucideIcons.CheckCircle;

  return <LucideComponent className={className} style={style} size={size} />;
};

export const SlideImage: React.FC<{
  img?: string;
  alt?: string;
  icon: IconKey | string;
  typeModifier?: string;
  fl?: string[];
  slash?: boolean | number;
}> = ({ img, alt, icon, typeModifier = '', fl, slash }) => {
  return (
    <div className={`im ${typeModifier}`.trim()}>
      {img ? (
        <img src={img} alt={alt || ''} />
      ) : (
        <TeachMeIcon name={icon} className="ic" size={24} />
      )}
      {fl && fl.length > 0 && (
        <div className="fl">
          {fl.map((item, idx) => (
            <div key={idx}>
              <span className="tk">
                <TeachMeIcon name="check" className="ic" size={14} />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
      {Boolean(slash) && (
        <div className="slash">
          <TeachMeIcon name="Ban" className="ic" size={24} />
        </div>
      )}
    </div>
  );
};
