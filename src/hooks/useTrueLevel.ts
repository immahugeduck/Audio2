import { useEffect, useState } from 'react';

export interface TrueLevel {
  rmsDb: number; // dBFS of the (post-gain) time-domain signal
  peakDb: number;
}

const SILENT: TrueLevel = { rmsDb: -Infinity, peakDb: -Infinity };

/**
 * Real dBFS level (RMS + sample peak) read from the analyser's time-domain buffer, i.e.
 * AFTER the input-gain stage. Unlike the spectrum-derived metrics this scales 1:1 with gain.
 */
export function useTrueLevel(getTimeDomainData: () => Uint8Array, active: boolean, intervalMs = 70): TrueLevel {
  const [level, setLevel] = useState<TrueLevel>(SILENT);

  useEffect(() => {
    if (!active) {
      setLevel(SILENT);
      return;
    }
    let smoothedPeak = -Infinity;
    const id = window.setInterval(() => {
      const data = getTimeDomainData();
      if (!data || data.length === 0) return;
      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
        const a = Math.abs(v);
        if (a > peak) peak = a;
      }
      const rms = Math.sqrt(sumSq / data.length);
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
      const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
      // slow-release peak marker
      smoothedPeak = Math.max(peakDb, smoothedPeak - 1.2);
      setLevel({ rmsDb, peakDb: smoothedPeak });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [getTimeDomainData, active, intervalMs]);

  return level;
}
