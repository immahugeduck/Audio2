import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Mic, MicOff, Github } from 'lucide-react';
import { Wordmark } from './Logo';
import { ROUTES, RouteId, hrefFor } from '../utils/routes';
import { useAnalyzer } from '../context/AnalyzerContext';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  activeRoute: RouteId;
  onNavigate: (id: RouteId) => void;
  /** element that opened the drawer; focus returns here on close */
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

const GROUPS: { id: 'analyze' | 'tools' | 'app'; label: string }[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'tools', label: 'Tools' },
  { id: 'app', label: 'Studio' },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, activeRoute, onNavigate, returnFocusRef }) => {
  const panelRef = useRef<HTMLElement>(null);
  const { engineState, metrics, isLive, enableMicrophone, stopMicrophone } = useAnalyzer();

  // Lock page scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management: move focus in on open, restore on close
  useEffect(() => {
    if (!open) return;
    const trigger = returnFocusRef.current;
    const t = window.setTimeout(() => {
      const active = panelRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      (active ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    }, 30);
    return () => {
      window.clearTimeout(t);
      trigger?.focus();
    };
  }, [open, returnFocusRef]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = (Array.from(panelRef.current.querySelectorAll(FOCUSABLE)) as HTMLElement[]).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (current === first || !panelRef.current.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !panelRef.current.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  const sourceLabel =
    engineState.sourceType === 'mic'
      ? engineState.micInfo?.label || 'Microphone'
      : engineState.sourceType === 'sample'
      ? 'Sample track'
      : engineState.fileName || engineState.sourceType;
  const levelPct = Math.min(100, Math.max(0, (metrics.rmsDb + 90) * (100 / 90)));
  const micOn = engineState.micActive;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
          {/* Backdrop (click outside closes) */}
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            data-testid="drawer-backdrop"
          />

          <motion.aside
            key="panel"
            ref={panelRef}
            id="app-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="absolute inset-y-0 left-0 w-[min(340px,88vw)] flex flex-col bg-ink-900 border-r border-ink-700/70 shadow-[24px_0_80px_-20px_rgba(0,0,0,0.9)]"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <Wordmark size="md" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded-xl text-ink-300 hover:text-ink-50 hover:bg-ink-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="hairline mx-5" />

            <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
              {GROUPS.map((g) => (
                <div key={g.id}>
                  <div className="eyebrow px-3 mb-2">{g.label}</div>
                  <ul className="flex flex-col gap-0.5">
                    {ROUTES.filter((r) => r.group === g.id).map((r) => {
                      const Icon = r.icon;
                      const active = r.id === activeRoute;
                      return (
                        <li key={r.id}>
                          <a
                            href={hrefFor(r.id)}
                            id={`nav-${r.id}`}
                            aria-current={active ? 'page' : undefined}
                            onClick={(e) => {
                              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                              e.preventDefault();
                              onNavigate(r.id);
                              onClose();
                            }}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                              active ? 'bg-accent-400/12 text-ink-50' : 'text-ink-300 hover:bg-ink-800/80 hover:text-ink-50'
                            }`}
                          >
                            {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-accent-400" />}
                            <span
                              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
                                active
                                  ? 'bg-accent-400/15 border-accent-400/30 text-accent-400'
                                  : 'bg-ink-850 border-ink-700/70 text-ink-400 group-hover:text-accent-300'
                              }`}
                            >
                              <Icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className="min-w-0 flex flex-col leading-tight">
                              <span className="text-sm font-semibold truncate">{r.label}</span>
                              <span className="text-[11px] text-ink-500 truncate group-hover:text-ink-400">{r.description}</span>
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Input status footer */}
            <div className="p-4 border-t border-ink-800 bg-ink-950/40">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`w-2 h-2 rounded-full ${isLive ? 'bg-sage-400 shadow-[0_0_8px_var(--color-sage-400)] animate-pulse' : 'bg-ink-600'}`}
                />
                <span className="text-xs font-semibold text-ink-200 truncate flex-1" title={sourceLabel}>
                  {isLive ? 'Listening' : 'Idle'} · {sourceLabel}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sage-400 via-accent-400 to-coral-400 transition-[width] duration-100"
                  style={{ width: isLive ? `${levelPct}%` : '0%' }}
                />
              </div>
              <button
                type="button"
                onClick={() => (micOn ? stopMicrophone() : enableMicrophone())}
                className={`w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors ${
                  micOn
                    ? 'bg-coral-500/10 text-coral-300 border border-coral-500/30 hover:bg-coral-500/20'
                    : 'bg-accent-400 text-ink-950 hover:bg-accent-300'
                }`}
              >
                {micOn ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {micOn ? 'Stop microphone' : 'Start microphone'}
              </button>
              <div className="mt-3 flex items-center justify-between text-[10px] text-ink-500">
                <span>Auralis · Spectrum Studio</span>
                <a
                  href="https://github.com/immahugeduck/Audio2"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-ink-200"
                  aria-label="Source on GitHub"
                >
                  <Github className="w-3 h-3" /> source
                </a>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
