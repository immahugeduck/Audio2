/**
 * Peak-frequency lock tracker with attack / hold / release + hysteresis.
 *
 * Instantaneous FFT peak picking is noisy: a steady tone can briefly dip below
 * the detection threshold or lose the global-max race to a harmonic / noise
 * spike for a single ~100 ms metrics tick. Without temporal hold the UI
 * flash-zeros the peak readout. This tracker keeps a locked frequency stable
 * while the tone is present and reacquires quickly on real pitch changes.
 */

export interface PeakTrackerInput {
  /** Instantaneous peak frequency in Hz (0 if none detected this frame). */
  rawHz: number;
  /** Peak bin magnitude 0–255 from AnalyserNode getByteFrequencyData. */
  rawMagnitude: number;
  /** Optional: magnitude sampled near the currently locked bin (0–255). */
  lockedNeighborhoodMagnitude?: number;
  /** Timestamp in ms (performance.now()). */
  now?: number;
}

export interface PeakTrackerOutput {
  peakFrequencyHz: number;
  isLocked: boolean;
  holdRemainingMs: number;
}

export interface PeakTrackerOptions {
  /** How long to keep displaying a tone after last strong sighting (ms). */
  holdMs?: number;
  /** EMA alpha when acquiring / tracking a matching tone (0–1). */
  attackAlpha?: number;
  /** Relative frequency match to treat as same tone (e.g. 0.06 = ±6%). */
  lockRatio?: number;
  /** Absolute Hz match floor (wide bins at low freq need this). */
  lockHzFloor?: number;
  /** Min magnitude to acquire a new lock. */
  acquireMagnitude?: number;
  /** Min magnitude (global or neighborhood) to refresh an existing hold. */
  holdMagnitude?: number;
  /** New far peak must be at least this fraction of locked amp to steal lock. */
  stealAmplitudeRatio?: number;
  /** Minimum Hz considered a valid musical/tone peak. */
  minHz?: number;
}

const DEFAULTS: Required<PeakTrackerOptions> = {
  holdMs: 2200,
  attackAlpha: 0.42,
  lockRatio: 0.06,
  lockHzFloor: 18,
  acquireMagnitude: 10,
  holdMagnitude: 5,
  stealAmplitudeRatio: 0.55,
  minHz: 16,
};

function freqsMatch(a: number, b: number, ratio: number, floorHz: number): boolean {
  if (a <= 0 || b <= 0) return false;
  const tol = Math.max(floorHz, Math.max(a, b) * ratio);
  return Math.abs(a - b) <= tol;
}

export class PeakFrequencyTracker {
  private opts: Required<PeakTrackerOptions>;
  private lockedHz = 0;
  private lockedMagnitude = 0;
  private emaHz = 0;
  private lastStrongAt = 0;
  private locked = false;

  constructor(options: PeakTrackerOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  reset(): void {
    this.lockedHz = 0;
    this.lockedMagnitude = 0;
    this.emaHz = 0;
    this.lastStrongAt = 0;
    this.locked = false;
  }

  get lockedFrequencyHz(): number {
    return this.locked ? this.emaHz || this.lockedHz : 0;
  }

  update(input: PeakTrackerInput): PeakTrackerOutput {
    const now = input.now ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const {
      holdMs,
      attackAlpha,
      lockRatio,
      lockHzFloor,
      acquireMagnitude,
      holdMagnitude,
      stealAmplitudeRatio,
      minHz,
    } = this.opts;

    const rawHz = input.rawHz >= minHz && isFinite(input.rawHz) ? input.rawHz : 0;
    const rawMag = Math.max(0, input.rawMagnitude || 0);
    const neighborhoodMag =
      input.lockedNeighborhoodMagnitude !== undefined
        ? Math.max(0, input.lockedNeighborhoodMagnitude)
        : 0;

    // Refresh hold if either global raw peak is strong OR energy remains near lock.
    const neighborhoodAlive =
      this.locked && neighborhoodMag >= holdMagnitude;
    const rawStrong = rawHz > 0 && rawMag >= holdMagnitude;
    const rawAcquire = rawHz > 0 && rawMag >= acquireMagnitude;

    if (this.locked) {
      const matchesLock = rawStrong && freqsMatch(rawHz, this.lockedHz, lockRatio, lockHzFloor);
      const farFromLock =
        rawAcquire && !freqsMatch(rawHz, this.lockedHz, lockRatio * 1.5, lockHzFloor);
      const loudEnoughToSteal = rawMag >= this.lockedMagnitude * stealAmplitudeRatio;
      // Also allow steal when the new peak clearly dominates the locked neighborhood
      // (handles analyser smoothing residue at the old bin after a real pitch change).
      const dominatesNeighborhood =
        neighborhoodMag <= 0 || rawMag >= neighborhoodMag * 1.15;
      const lockStale = now - this.lastStrongAt > holdMs * 0.35;

      if (matchesLock) {
        // Same tone — attack-smooth the refined Hz, refresh hold.
        this.emaHz =
          this.emaHz > 0
            ? this.emaHz + (rawHz - this.emaHz) * attackAlpha
            : rawHz;
        this.lockedHz = this.emaHz;
        this.lockedMagnitude = Math.max(this.lockedMagnitude * 0.92, rawMag);
        this.lastStrongAt = now;
      } else if (farFromLock && ((loudEnoughToSteal && dominatesNeighborhood) || lockStale)) {
        // Real pitch change: steal lock before neighborhood-hold can block it.
        this.lockedHz = rawHz;
        this.emaHz = rawHz;
        this.lockedMagnitude = rawMag;
        this.lastStrongAt = now;
        this.locked = true;
      } else if (neighborhoodAlive) {
        // Brief global-max jump or dip, but locked bin still has energy — hold.
        this.lastStrongAt = now;
        this.lockedMagnitude = Math.max(this.lockedMagnitude * 0.95, neighborhoodMag);
      }
      // else: ignore quieter sideband / harmonic flicker

      const age = now - this.lastStrongAt;
      if (age > holdMs) {
        this.locked = false;
        this.lockedHz = 0;
        this.emaHz = 0;
        this.lockedMagnitude = 0;
      }
    } else if (rawAcquire) {
      // Acquire new lock
      this.locked = true;
      this.lockedHz = rawHz;
      this.emaHz = rawHz;
      this.lockedMagnitude = rawMag;
      this.lastStrongAt = now;
    }

    const holdRemainingMs = this.locked
      ? Math.max(0, holdMs - (now - this.lastStrongAt))
      : 0;

    return {
      peakFrequencyHz: this.locked ? this.emaHz || this.lockedHz : 0,
      isLocked: this.locked,
      holdRemainingMs,
    };
  }
}

/**
 * Sample magnitude near a target Hz across a few FFT bins (for lock refresh).
 */
export function sampleNeighborhoodMagnitude(
  frequencyData: Uint8Array,
  sampleRate: number,
  targetHz: number,
  halfWidthBins: number = 2
): number {
  if (!frequencyData.length || targetHz <= 0 || !sampleRate) return 0;
  const binCount = frequencyData.length;
  const hzPerBin = sampleRate / 2 / binCount;
  const center = Math.round(targetHz / hzPerBin);
  let maxVal = 0;
  for (let o = -halfWidthBins; o <= halfWidthBins; o++) {
    const b = center + o;
    if (b >= 0 && b < binCount) {
      if (frequencyData[b] > maxVal) maxVal = frequencyData[b];
    }
  }
  return maxVal;
}
