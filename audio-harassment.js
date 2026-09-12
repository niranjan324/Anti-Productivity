/**
 * Anti-Procrastination Tab Executioner
 * audio-harassment.js - Extended Acoustic Harassment & Dual-Oscillator Siren Engine (v4.2.0)
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
 * Triggers a synchronized 7-second continuous dual-oscillator acoustic harassment siren.
 * - Osc 1 (Sawtooth): Escalating pitch sweep ramping 420Hz <-> 1050Hz every 350ms up to 6.4s.
 * - Osc 2 (Square): Discordant 1450Hz micro-bursts (staccato pulses) for auditory friction.
 * - Master Gain: 0.28 volume -> sustains through 6.3s -> exponential decay to 0.0001 at 7.0s.
 * @returns {{ stop: Function }}
 */
function startAcousticHarassmentSiren() {
  stopAcousticHarassmentSiren(); // Stop any currently playing siren

  try {
    const ctx = getHarassmentAudioContext();
    const now = ctx.currentTime;
    const duration = 7.0;
    const sustainEnd = 6.3;

    // Master Gain Node for volume envelope & anti-clipping
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.28, now);
    masterGain.gain.setValueAtTime(0.28, now + sustainEnd);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(ctx.destination);

    // =========================================================================
    // Oscillator 1: Sawtooth Escalating Siren (420Hz <-> 1050Hz every 350ms)
    // =========================================================================
    const sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(420, now);

    const sweepInterval = 0.35;
    const sweepLimit = 6.4;
    const cycles = Math.ceil(sweepLimit / sweepInterval);
    for (let i = 0; i < cycles; i++) {
      const t = now + (i * sweepInterval);
      const targetFreq = (i % 2 === 0) ? 1050 : 420;
      sirenOsc.frequency.linearRampToValueAtTime(targetFreq, Math.min(now + duration, t + sweepInterval));
    }
    sirenOsc.connect(masterGain);

    // =========================================================================
    // Oscillator 2: Square Wave Discordant 1450Hz Strobe Pulses (80ms intervals)
    // =========================================================================
    const beepOsc = ctx.createOscillator();
    beepOsc.type = 'square';
    beepOsc.frequency.setValueAtTime(1450, now);

    const beepGain = ctx.createGain();
    const pulseInterval = 0.08;
    const totalPulses = Math.floor(sustainEnd / pulseInterval);

    for (let i = 0; i < totalPulses; i++) {
      const pulseTime = now + (i * pulseInterval);
      const on = (i % 2 === 0);
      beepGain.gain.setValueAtTime(on ? 0.35 : 0.0, pulseTime);
    }
    beepGain.gain.setValueAtTime(0.0, now + sustainEnd);

    beepOsc.connect(beepGain);
    beepGain.connect(masterGain);

    // Start Oscillators
    sirenOsc.start(now);
    beepOsc.start(now);

    // Schedule Clean Stop at exactly 7.0 seconds
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

