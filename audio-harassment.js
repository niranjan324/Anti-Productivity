/**
 * Anti-Procrastination Tab Executioner
 * audio-harassment.js - Extended Acoustic Harassment & Dual-Oscillator Siren Engine (v4.1.0)
 */

let globalHarassmentCtx = null;
let activeHarassmentNodes = null;

function getHarassmentAudioContext() {
  if (!globalHarassmentCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    globalHarassmentCtx = new AudioContextClass();
  }
  if (globalHarassmentCtx.state === 'suspended') {
    globalHarassmentCtx.resume();
  }
  return globalHarassmentCtx;
}

/**
 * Triggers a 5-second continuous dual-oscillator acoustic harassment siren.
 * - Osc 1 (Sawtooth): Police/Air-raid siren ramping 400Hz <-> 950Hz every 350ms.
 * - Osc 2 (Square): High-frequency discordant 1400Hz beeps pulsed at 80ms intervals.
 * - Master Gain: 0.25 volume -> sustains for 4.5s -> exponential ramp to 0.0001 at 5.0s.
 * @returns {{ stop: Function }}
 */
function startAcousticHarassmentSiren() {
  stopAcousticHarassmentSiren(); // Stop any currently playing siren

  try {
    const ctx = getHarassmentAudioContext();
    const now = ctx.currentTime;
    const duration = 5.0;

    // Master Gain Node for volume envelope & anti-clipping
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, now);
    masterGain.gain.setValueAtTime(0.25, now + 4.5);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    // =========================================================================
    // Oscillator 1: Sawtooth Air-Raid Siren (400Hz <-> 950Hz every 350ms)
    // =========================================================================
    const sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(400, now);

    const sweepInterval = 0.35;
    const cycles = Math.ceil(duration / sweepInterval);
    for (let i = 0; i < cycles; i++) {
      const t = now + (i * sweepInterval);
      const targetFreq = (i % 2 === 0) ? 950 : 400;
      sirenOsc.frequency.linearRampToValueAtTime(targetFreq, Math.min(now + duration, t + sweepInterval));
    }
    sirenOsc.connect(masterGain);

    // =========================================================================
    // Oscillator 2: Square Wave Discordant 1400Hz Strobe Pulses (80ms intervals)
    // =========================================================================
    const beepOsc = ctx.createOscillator();
    beepOsc.type = 'square';
    beepOsc.frequency.setValueAtTime(1400, now);

    const beepGain = ctx.createGain();
    const pulseInterval = 0.08;
    const totalPulses = Math.floor(4.5 / pulseInterval);

    for (let i = 0; i < totalPulses; i++) {
      const pulseTime = now + (i * pulseInterval);
      const on = (i % 2 === 0);
      beepGain.gain.setValueAtTime(on ? 0.35 : 0.0, pulseTime);
    }
    beepGain.gain.setValueAtTime(0.0, now + 4.5);

    beepOsc.connect(beepGain);
    beepGain.connect(masterGain);

    // Start Oscillators
    sirenOsc.start(now);
    beepOsc.start(now);

    // Schedule Clean Stop at 5.0 seconds
    sirenOsc.stop(now + duration);
    beepOsc.stop(now + duration);

    activeHarassmentNodes = {
      sirenOsc,
      beepOsc,
      beepGain,
      masterGain,
      timerId: setTimeout(() => {
        stopAcousticHarassmentSiren();
      }, duration * 1000)
    };

    return {
      stop: stopAcousticHarassmentSiren
    };
  } catch (err) {
    console.error('Extended acoustic harassment error:', err);
    return { stop: () => {} };
  }
}

function stopAcousticHarassmentSiren() {
  if (activeHarassmentNodes) {
    try {
      if (activeHarassmentNodes.timerId) clearTimeout(activeHarassmentNodes.timerId);
      activeHarassmentNodes.sirenOsc.stop();
      activeHarassmentNodes.beepOsc.stop();
      activeHarassmentNodes.sirenOsc.disconnect();
      activeHarassmentNodes.beepOsc.disconnect();
      activeHarassmentNodes.masterGain.disconnect();
    } catch (e) {
      // Ignore if already stopped
    }
    activeHarassmentNodes = null;
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.AudioHarassment = {
    startAcousticHarassmentSiren,
    stopAcousticHarassmentSiren
  };
}
