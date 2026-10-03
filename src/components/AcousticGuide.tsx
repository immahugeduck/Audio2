import React, { useEffect, useState } from 'react';
import { BookOpen, HelpCircle, Waves, AlertTriangle, Info, Check, Search, X, Sliders, Volume2, ShieldAlert } from 'lucide-react';

interface AcousticGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
  /** Render inline as a page (no modal chrome / close buttons) */
  embedded?: boolean;
}

export const AcousticGuide: React.FC<AcousticGuideProps> = ({ isOpen = true, onClose = () => {}, embedded = false }) => {
  const [activeTab, setActiveTab] = useState<'whatToLookFor' | 'frequencyBlueprint' | 'diagnostics' | 'glossary'>('whatToLookFor');

  // Esc closes the modal form
  useEffect(() => {
    if (embedded || !isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [embedded, isOpen, onClose]);

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={embedded ? '' : 'fixed inset-0 z-[70] bg-ink-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto'}
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-label="Acoustic diagnostic guide"
      onClick={embedded ? undefined : (e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-ink-900 border border-ink-800 rounded-2xl w-full flex flex-col overflow-hidden ${embedded ? '' : 'max-w-4xl shadow-2xl max-h-[90vh]'}`}>
        {/* Header */}
        <div className="p-5 border-b border-ink-800 flex items-center justify-between bg-ink-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-500/10 border border-accent-500/30 text-accent-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Professional Sound Analysis & Diagnostic Guide
              </h3>
              <p className="text-xs text-ink-400">
                Acoustic baseline info, frequency reference blueprints, and noise troubleshooting
              </p>
            </div>
          </div>
          {!embedded && <button
            onClick={onClose}
            aria-label="Close guide"
            id="btn-close-acoustic-guide"
            className="p-2 rounded-xl bg-ink-900 border border-ink-800 text-ink-400 hover:text-white hover:border-ink-700 cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-ink-800 bg-ink-950/50 px-5 gap-2 overflow-x-auto">
          {[
            { id: 'whatToLookFor', label: 'What to Look For', icon: Search },
            { id: 'frequencyBlueprint', label: 'Frequency Spectrum Blueprint', icon: Waves },
            { id: 'diagnostics', label: 'Noise Diagnostics & Fixes', icon: AlertTriangle },
            { id: 'glossary', label: 'Acoustic Terms Glossary', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-accent-500 text-accent-300 bg-accent-500/10'
                    : 'border-transparent text-ink-400 hover:text-ink-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className={`p-6 flex-1 flex flex-col gap-6 text-ink-300 text-xs leading-relaxed ${embedded ? '' : 'overflow-y-auto'}`}>
          {/* TAB 1: WHAT TO LOOK FOR */}
          {activeTab === 'whatToLookFor' && (
            <div className="flex flex-col gap-5">
              <div className="bg-accent-500/10 border border-accent-500/30 rounded-xl p-4 text-accent-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-accent-300">How to Read Sound Analyzer Visuals</h4>
                  <p className="mt-1 text-ink-300">
                    When analyzing audio or room acoustics, observe the balance between <strong className="text-white">steady-state baseline noise</strong> (floor curves) and <strong className="text-white">instantaneous transient spikes</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-ink-950 border border-ink-800 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-ink-100 text-sm">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">1</span>
                    Ground Loops & Power Hum (50 Hz / 60 Hz)
                  </div>
                  <p className="text-ink-400">
                    Look for a narrow, sharp, persistent vertical peak around <strong className="text-ink-200">50 Hz or 60 Hz</strong> (and its harmonics at 120 Hz, 180 Hz).
                  </p>
                  <div className="bg-ink-900 border border-ink-800 rounded-lg p-2.5 text-[11px] text-ink-300">
                    <strong className="text-accent-400">Solution:</strong> Use a ground loop isolator, check balanced XLR cables, or apply a steep 80 Hz high-pass filter.
                  </div>
                </div>

                <div className="bg-ink-950 border border-ink-800 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-ink-100 text-sm">
                    <span className="p-1.5 rounded-lg bg-accent-500/20 text-accent-400">2</span>
                    HVAC & Air Conditioner Fan Noise (100 Hz - 500 Hz)
                  </div>
                  <p className="text-ink-400">
                    Broadband, smooth elevated noise floor bulge in the low-mid frequency bands.
                  </p>
                  <div className="bg-ink-900 border border-ink-800 rounded-lg p-2.5 text-[11px] text-ink-300">
                    <strong className="text-accent-400">Solution:</strong> Turn off room fans during recording or use spectral subtractive noise reduction.
                  </div>
                </div>

                <div className="bg-ink-950 border border-ink-800 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-ink-100 text-sm">
                    <span className="p-1.5 rounded-lg bg-plum-500/20 text-plum-400">3</span>
                    Preamp Hiss & High-Frequency Noise (6 kHz - 18 kHz)
                  </div>
                  <p className="text-ink-400">
                    Elevated flat background floor in the upper registers caused by inexpensive audio interface preamps or wireless interference.
                  </p>
                  <div className="bg-ink-900 border border-ink-800 rounded-lg p-2.5 text-[11px] text-ink-300">
                    <strong className="text-accent-400">Solution:</strong> Reduce mic gain, use dynamic microphones for high-SPL sources, or apply gentle high-shelf attenuation.
                  </div>
                </div>

                <div className="bg-ink-950 border border-ink-800 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-ink-100 text-sm">
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">4</span>
                    Room Reflections & Flutter Echo (500 Hz - 3 kHz)
                  </div>
                  <p className="text-ink-400">
                    In the Spectrogram mode, look for horizontal "trails" or smearing following sharp transient sounds (handclaps, speech).
                  </p>
                  <div className="bg-ink-900 border border-ink-800 rounded-lg p-2.5 text-[11px] text-ink-300">
                    <strong className="text-accent-400">Solution:</strong> Install acoustic absorption panels or diffusers at primary reflection points.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FREQUENCY SPECTRUM BLUEPRINT */}
          {activeTab === 'frequencyBlueprint' && (
            <div className="flex flex-col gap-4">
              <p className="text-ink-400">
                Understanding where key acoustic energy sits in the audible spectrum (20 Hz - 20,000 Hz):
              </p>

              <div className="flex flex-col gap-3">
                {[
                  {
                    band: 'Sub-Bass (20 Hz - 60 Hz)',
                    color: 'border-plum-500/40 bg-plum-500/10 text-plum-300',
                    desc: 'Felt more than heard. Contains kick drum sub, bass synth drop, air conditioner thud, traffic rumble, and ground loop hum.',
                  },
                  {
                    band: 'Bass (60 Hz - 250 Hz)',
                    color: 'border-sage-500/40 bg-sage-500/10 text-sage-300',
                    desc: 'Provides warmth and punch. Fundamental pitch of male speech, bass guitar, cello, and room resonance modes.',
                  },
                  {
                    band: 'Low-Mids (250 Hz - 500 Hz)',
                    color: 'border-accent-500/40 bg-accent-500/10 text-accent-300',
                    desc: 'Contains body and fullness. Excess energy here creates "muddiness" or "boxy" room tone.',
                  },
                  {
                    band: 'Midrange (500 Hz - 2,000 Hz)',
                    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                    desc: 'Human ear is most sensitive here. Contains vocal intelligibility, piano body, snare drum, and horn instruments.',
                  },
                  {
                    band: 'High-Mids (2,000 Hz - 4,000 Hz)',
                    color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                    desc: 'Presence and attack range. Vocal clarity, guitar snap, keyboard click. Too much energy causes listening fatigue.',
                  },
                  {
                    band: 'Highs & Brilliance (4,000 Hz - 20,000 Hz)',
                    color: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
                    desc: 'Air, sparkle, and sibilance ("s", "t" consonant sounds), cymbal sizzle, whistling, and high-frequency preamp hiss.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className={`border rounded-xl p-3.5 ${item.color}`}>
                    <div className="font-bold text-sm tracking-wide mb-1">{item.band}</div>
                    <p className="text-ink-300 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="flex flex-col gap-4">
              <div className="bg-ink-950 border border-ink-800 rounded-xl p-4">
                <h4 className="font-bold text-white text-sm mb-3">Common Noise Profile Patterns & Recommendations</h4>

                <div className="space-y-3">
                  <div className="border-l-2 border-amber-500 pl-3">
                    <span className="font-semibold text-ink-200">NC-45+ High Ambient Background Noise:</span>
                    <p className="text-ink-400 mt-0.5">
                      If the baseline profile shows NC-45 or above, background air handling or environmental noise is leaking into your mic. Use a cardioid dynamic mic (e.g. Shure SM7B) placed closer to your mouth rather than a sensitive condenser.
                    </p>
                  </div>

                  <div className="border-l-2 border-accent-500 pl-3">
                    <span className="font-semibold text-ink-200">High Peak-to-RMS Crest Factor:</span>
                    <p className="text-ink-400 mt-0.5">
                      Indicates dynamic percussive audio (clapping, keys typing, snaps). Excellent for headroom, but requires a fast limiter if recording.
                    </p>
                  </div>

                  <div className="border-l-2 border-plum-500 pl-3">
                    <span className="font-semibold text-ink-200">Low Signal-to-Noise Ratio (&lt; 10 dB):</span>
                    <p className="text-ink-400 mt-0.5">
                      The desired audio signal is barely louder than the room's noise floor. Increase source volume or move closer to the transducer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GLOSSARY */}
          {activeTab === 'glossary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { term: 'RMS (Root Mean Square)', def: 'Average effective signal energy over time, corresponding closely to human loudness perception.' },
                { term: 'Noise Floor', def: 'The measure of quiet room noise or electronic self-noise when no intentional audio source is present.' },
                { term: 'SNR (Signal-to-Noise Ratio)', def: 'The ratio in decibels between desired audio signal peak and background noise floor.' },
                { term: 'NC Rating (Noise Criteria)', def: 'A standard curve system used to specify maximum permissible background noise levels in rooms.' },
                { term: 'Crest Factor (Transient Punch)', def: 'The decibel difference between peak amplitude and average RMS level. High crest factor indicates sharp percussive transients.' },
                { term: 'Transient Spikes', def: 'Short-duration, high-amplitude acoustic impulses (e.g. handclaps, snaps, drum hits, key clicks, electrical pops) that burst significantly above the steady-state noise floor.' },
                { term: 'FFT Size (Fast Fourier Transform)', def: 'The window length used to convert audio waveform samples into frequency bin bands.' },
              ].map((item, idx) => (
                <div key={idx} className="bg-ink-950 border border-ink-800 rounded-xl p-3.5">
                  <div className="font-bold text-accent-300 text-xs mb-1">{item.term}</div>
                  <p className="text-ink-400 text-[11px]">{item.def}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!embedded && <div className="p-4 border-t border-ink-800 bg-ink-950/80 flex justify-end">
          <button
            onClick={onClose}
            id="btn-guide-got-it"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-accent-500 hover:bg-accent-400 text-ink-950 cursor-pointer transition-all"
          >
            Got It
          </button>
        </div>}
      </div>
    </div>
  );
};
