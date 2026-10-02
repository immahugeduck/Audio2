import React, { useId } from 'react';

/* Shared building blocks for the Settings page and new views. */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`card ${className}`} {...rest}>
    {children}
  </div>
);

interface SectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, description, icon, action, children, className = '' }) => (
  <Card className={`p-5 sm:p-6 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-accent-400/10 text-accent-400 border border-accent-400/20 flex items-center justify-center">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink-50 tracking-tight">{title}</h3>
          {description && <p className="text-xs text-ink-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="flex flex-col gap-5">{children}</div>
  </Card>
);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
  disabled?: boolean;
  id?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, format, hint, disabled, id }) => {
  const auto = useId();
  const inputId = id ?? auto;
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={`flex flex-col gap-2 ${disabled ? 'opacity-45 pointer-events-none' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-200">
          {label}
        </label>
        <output htmlFor={inputId} className="font-mono text-xs tabular-nums text-accent-300">
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ['--range-pct' as string]: `${pct}%` }}
        className="w-full"
      />
      {hint && <p className="text-[11px] text-ink-500 leading-snug">{hint}</p>}
    </div>
  );
};

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange, disabled, id }) => {
  const auto = useId();
  const tid = id ?? auto;
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-45' : ''}`}>
      <label htmlFor={tid} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-medium text-ink-200">{label}</span>
        {description && <span className="block text-[11px] text-ink-500 leading-snug mt-0.5">{description}</span>}
      </label>
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors duration-200 ${
          checked ? 'bg-accent-400 border-accent-300' : 'bg-ink-800 border-ink-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full shadow transition-transform duration-200 ease-out ${
            checked ? 'translate-x-5 bg-ink-950' : 'translate-x-0 bg-ink-300'
          }`}
        />
      </button>
    </div>
  );
};

interface SegmentedProps<T extends string | number> {
  label?: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}

export function Segmented<T extends string | number>({ label, value, options, onChange, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <span className="text-[13px] font-medium text-ink-200">{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 p-1 bg-ink-950/70 border border-ink-800 rounded-xl">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={`flex-1 min-w-[52px] px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                active ? 'bg-accent-400 text-ink-950 shadow' : 'text-ink-300 hover:text-ink-50 hover:bg-ink-800'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'secondary', size = 'md', className = '', children, ...rest }) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100';
  const sizes = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const variants = {
    primary: 'bg-accent-400 text-ink-950 hover:bg-accent-300 shadow-[0_8px_24px_-12px_var(--accent-400)]',
    secondary: 'bg-ink-800 text-ink-100 border border-ink-700 hover:bg-ink-700 hover:border-ink-600',
    ghost: 'text-ink-300 hover:text-ink-50 hover:bg-ink-800',
    danger: 'bg-coral-500/10 text-coral-300 border border-coral-500/30 hover:bg-coral-500/20',
  }[variant];
  return (
    <button className={`${base} ${sizes} ${variants} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode; eyebrow?: string }> = ({
  title,
  subtitle,
  actions,
  eyebrow,
}) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
      <h1 className="font-display text-4xl sm:text-5xl leading-none tracking-tight text-ink-50">{title}</h1>
      {subtitle && <p className="text-sm text-ink-400 mt-2 max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }> = ({
  icon,
  title,
  body,
  children,
}) => (
  <div className="flex flex-col items-center text-center gap-3 max-w-sm">
    <span className="w-12 h-12 rounded-2xl bg-accent-400/10 border border-accent-400/25 text-accent-400 flex items-center justify-center">
      {icon}
    </span>
    <h3 className="font-display text-2xl text-ink-50 leading-tight">{title}</h3>
    <p className="text-sm text-ink-300 leading-relaxed">{body}</p>
    {children && <div className="flex flex-wrap items-center justify-center gap-2 mt-1">{children}</div>}
  </div>
);
