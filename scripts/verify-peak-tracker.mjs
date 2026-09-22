/**
 * Offline verification of PeakFrequencyTracker behavior (no Web Audio needed).
 * Run: node scripts/verify-peak-tracker.mjs
 */

function freqsMatch(a, b, ratio, floorHz) {
  if (a <= 0 || b <= 0) return false;
  const tol = Math.max(floorHz, Math.max(a, b) * ratio);
  return Math.abs(a - b) <= tol;
}

class PeakFrequencyTracker {
  constructor(options = {}) {
    this.opts = {
      holdMs: 2200,
      attackAlpha: 0.42,
      lockRatio: 0.06,
      lockHzFloor: 18,
      acquireMagnitude: 10,
      holdMagnitude: 5,
      stealAmplitudeRatio: 0.55,
      minHz: 16,
      ...options,
    };
    this.lockedHz = 0;
    this.lockedMagnitude = 0;
    this.emaHz = 0;
    this.lastStrongAt = 0;
    this.locked = false;
  }
  get lockedFrequencyHz() {
    return this.locked ? this.emaHz || this.lockedHz : 0;
  }
  update(input) {
    const now = input.now;
    const {
      holdMs, attackAlpha, lockRatio, lockHzFloor,
      acquireMagnitude, holdMagnitude, stealAmplitudeRatio, minHz,
    } = this.opts;
    const rawHz = input.rawHz >= minHz && isFinite(input.rawHz) ? input.rawHz : 0;
    const rawMag = Math.max(0, input.rawMagnitude || 0);
    const neighborhoodMag = input.lockedNeighborhoodMagnitude !== undefined
      ? Math.max(0, input.lockedNeighborhoodMagnitude) : 0;
    const neighborhoodAlive = this.locked && neighborhoodMag >= holdMagnitude;
    const rawStrong = rawHz > 0 && rawMag >= holdMagnitude;
    const rawAcquire = rawHz > 0 && rawMag >= acquireMagnitude;

    if (this.locked) {
      const matchesLock = rawStrong && freqsMatch(rawHz, this.lockedHz, lockRatio, lockHzFloor);
      const farFromLock =
        rawAcquire && !freqsMatch(rawHz, this.lockedHz, lockRatio * 1.5, lockHzFloor);
      const loudEnoughToSteal = rawMag >= this.lockedMagnitude * stealAmplitudeRatio;
      const dominatesNeighborhood =
        neighborhoodMag <= 0 || rawMag >= neighborhoodMag * 1.15;
      const lockStale = now - this.lastStrongAt > holdMs * 0.35;

      if (matchesLock) {
        this.emaHz = this.emaHz > 0 ? this.emaHz + (rawHz - this.emaHz) * attackAlpha : rawHz;
        this.lockedHz = this.emaHz;
        this.lockedMagnitude = Math.max(this.lockedMagnitude * 0.92, rawMag);
        this.lastStrongAt = now;
      } else if (farFromLock && ((loudEnoughToSteal && dominatesNeighborhood) || lockStale)) {
        this.lockedHz = rawHz;
        this.emaHz = rawHz;
        this.lockedMagnitude = rawMag;
        this.lastStrongAt = now;
        this.locked = true;
      } else if (neighborhoodAlive) {
        this.lastStrongAt = now;
        this.lockedMagnitude = Math.max(this.lockedMagnitude * 0.95, neighborhoodMag);
      }

      if (now - this.lastStrongAt > holdMs) {
        this.locked = false;
        this.lockedHz = 0;
        this.emaHz = 0;
        this.lockedMagnitude = 0;
      }
    } else if (rawAcquire) {
      this.locked = true;
      this.lockedHz = rawHz;
      this.emaHz = rawHz;
      this.lockedMagnitude = rawMag;
      this.lastStrongAt = now;
    }
    return {
      peakFrequencyHz: this.locked ? this.emaHz || this.lockedHz : 0,
      isLocked: this.locked,
    };
  }
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK:", msg);
  }
}

const t = new PeakFrequencyTracker();
let now = 1000;

let out = t.update({ rawHz: 440, rawMagnitude: 180, now });
assert(out.isLocked && Math.abs(out.peakFrequencyHz - 440) < 1, "acquires 440 Hz lock");

for (let i = 0; i < 15; i++) {
  now += 100;
  out = t.update({ rawHz: 0, rawMagnitude: 0, lockedNeighborhoodMagnitude: 40, now });
}
assert(out.isLocked && Math.abs(out.peakFrequencyHz - 440) < 5, "holds through 1.5s of global dips with neighborhood energy");

now += 100;
out = t.update({ rawHz: 880, rawMagnitude: 60, lockedNeighborhoodMagnitude: 120, now });
assert(out.isLocked && Math.abs(out.peakFrequencyHz - 440) < 30, "ignores quieter harmonic at 880");

now += 100;
out = t.update({ rawHz: 523.25, rawMagnitude: 200, lockedNeighborhoodMagnitude: 80, now });
assert(out.isLocked && Math.abs(out.peakFrequencyHz - 523.25) < 5, "steals lock on strong new tone ~523 Hz");

now += 2500;
out = t.update({ rawHz: 0, rawMagnitude: 0, lockedNeighborhoodMagnitude: 0, now });
assert(!out.isLocked && out.peakFrequencyHz === 0, "releases after hold timeout with silence");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll peak-tracker checks passed.");
