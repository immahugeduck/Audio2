import React, { useId } from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/** The Auralis mark: a spectrum peak carved into an ember-gold squircle. */
export const LogoMark: React.FC<LogoMarkProps> = ({ size = 32, className, title = 'Auralis' }) => {
  const gid = useId().replace(/:/g, '');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`lg-${gid}`} x1="8" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8cf85" />
          <stop offset="0.55" stopColor="#f2b04a" />
          <stop offset="1" stopColor="#ef6f5e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#lg-${gid})`} />
      <g fill="#17110c">
        <rect x="7" y="31" width="6" height="14" rx="3" />
        <rect x="18" y="22" width="6" height="28" rx="3" />
        <rect x="29" y="12" width="6" height="42" rx="3" />
        <rect x="40" y="22" width="6" height="28" rx="3" />
        <rect x="51" y="31" width="6" height="14" rx="3" />
      </g>
      <rect x="18" y="38" width="28" height="3.5" rx="1.75" fill={`url(#lg-${gid})`} />
    </svg>
  );
};

interface WordmarkProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** Mark + serif wordmark lockup. */
export const Wordmark: React.FC<WordmarkProps> = ({ className = '', showTagline = true, size = 'md' }) => {
  const markSize = size === 'lg' ? 44 : size === 'sm' ? 28 : 34;
  const text = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-2xl' : 'text-[1.7rem]';
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={markSize} />
      <div className="flex flex-col leading-none">
        <span className={`font-display ${text} tracking-tight text-ink-50`}>Auralis</span>
        {showTagline && (
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-ink-400">Spectrum Studio</span>
        )}
      </div>
    </div>
  );
};
