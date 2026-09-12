/**
 * Anti-Procrastination Tab Executioner (v3.2.0)
 * Milestone 4.1: Exponential Cognitive Inflation & Complex Mental Arithmetic Engine
 */

// =============================================================================
// 1. Constants & Targeting Configuration
// =============================================================================
const CONFIG = Object.freeze({
  COUNTDOWN_INTERVAL_MS: 1000,
  SHAKE_DURATION_MS: 350,
  BUZZER_DURATION_MS: 400,
  EXECUTION_DELAY_MS: 300,
  TIER_FLASH_DURATION_MS: 400
});

// Distracting domains for Strict Mode
const TARGET_DOMAINS = [
  'youtube.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'twitch.tv',
  'netflix.com'
];

let isDemoMode = true;

// =============================================================================
// 2. Finite State Machine (FSM)
// =============================================================================
const GameStates = Object.freeze({
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  PENALTY: 'PENALTY',
  FAILED: 'FAILED'
});

// =============================================================================
// 3. State Variables
// =============================================================================
let currentState = GameStates.IDLE;
let streakCounter = 0;
let currentTierLevel = 1;
let timeLeft = 22;
let countdownTimer = null;
let audioCtx = null;
let currentProblem = {
  displayString: '',
  solution: 0,
  sublabel: '',
  tierLevel: 1,
  allocatedTime: 22,
  penaltySeconds: 5
};

// =============================================================================
// 4. DOM Cache
// =============================================================================
let dom = {};

function initDOMReferences() {
  dom = {
    body: document.body,
    timerDisplay: document.getElementById('timer-display'),
    problemDisplay: document.getElementById('problem-display'),
    equationSublabel: document.getElementById('equation-sublabel'),
    decayHint: document.getElementById('decay-hint'),
    penaltyHint: document.getElementById('penalty-hint'),
    answerInput: document.getElementById('answer-input'),
    submitBtn: document.getElementById('submit-btn'),
    streakDisplay: document.getElementById('streak-display'),
    streakBadge: document.getElementById('streak-badge'),
    tierBadge: document.getElementById('tier-badge'),
    statusMessage: document.getElementById('status-message'),
    targetIndicator: document.getElementById('target-indicator'),
    modeToggleBtn: document.getElementById('mode-toggle-btn'),
    modeLabel: document.getElementById('mode-label'),
    inputWrapper: document.getElementById('input-wrapper'),
    answerForm: document.getElementById('answer-form')
  };
}

// =============================================================================
// 5. Zero-Dependency Web Audio & Psychoacoustic Modulator
// =============================================================================

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Psychoacoustic Stress Pulse: Modulates pitch continuously from 440Hz -> 1200Hz as time runs out.
 */
function playUrgencyTone(remainingTime) {
  if (remainingTime > 6 || remainingTime <= 0) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Map time 6s -> 1s to frequency 440Hz -> 1200Hz
    const urgencyRatio = Math.max(0, Math.min(1, (6 - remainingTime) / 5));
    const frequency = 440 + (urgencyRatio * 760); // 440Hz to 1200Hz

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (err) {
    // Non-critical audio warning
  }
}

/**
 * Piercing 880Hz alert buzzer tone on 0s execution
 */
function playBuzzerSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const durationSec = CONFIG.BUZZER_DURATION_MS / 1000;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  } catch (err) {
    console.error('Audio synthesizer error:', err);
  }
}

function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (err) {
    // Non-fatal
  }
}

// =============================================================================
// 6. Problem Generation & UI Synchronization
// =============================================================================

function generateAndRenderProblem(streak) {
  // Leverage math-engine.js module
  currentProblem = window.MathEngine.generateExponentialProblem(streak);
  renderActiveProblem();
}

function updateTierUI(tierLevel) {
  if (!dom.tierBadge) return;

  const tierMetadata = {
    1: { label: 'WARMUP ⚡', class: 'tier-1', hint: 'Tier 1: Linear Warmup (2-Digit & Tables)' },
    2: { label: 'COMPOUND ⚡⚡', class: 'tier-2', hint: 'Tier 2: Nested Precedence & Compound Products' },
    3: { label: 'MODULO / POWERS 🔥', class: 'tier-3', hint: 'Tier 3: Modulo, Square Roots & Exponents' },
    4: { label: 'ALGEBRA MATRIX 🧠', class: 'tier-4', hint: 'Tier 4: Single-Variable Inversion' },
    5: { label: 'APEX SINGULARITY ☣️', class: 'tier-5', hint: 'Tier 5: 2×2 Matrix Determinants & Base Conv' }
  };

  const currentMeta = tierMetadata[tierLevel] || tierMetadata[1];

  if (tierLevel !== currentTierLevel) {
    currentTierLevel = tierLevel;
    dom.tierBadge.classList.add('tier-level-up');
    setTimeout(() => {
      if (dom.tierBadge) dom.tierBadge.classList.remove('tier-level-up');
    }, CONFIG.TIER_FLASH_DURATION_MS);
  }

  dom.tierBadge.textContent = currentMeta.label;
  dom.tierBadge.className = `tier-badge ${currentMeta.class}`;
  dom.tierBadge.title = `Difficulty: ${currentMeta.hint} (Click to cycle tier)`;

  if (dom.equationSublabel && currentProblem.sublabel) {
    dom.equationSublabel.textContent = currentProblem.sublabel;
  }

  if (dom.decayHint) {
    dom.decayHint.textContent = `BASE: ${currentProblem.allocatedTime}s`;
  }

  if (dom.penaltyHint) {
    dom.penaltyHint.textContent = `⚠️ Wrong Answer = -${currentProblem.penaltySeconds}s Penalty | 0s = Tab Execution`;
  }
}

function renderActiveProblem() {
  if (!dom.problemDisplay) return;
  dom.problemDisplay.textContent = currentProblem.displayString;
  updateTierUI(currentProblem.tierLevel);
}

/**
 * Interactive tier jumper: cycles between Tiers 1 through 5
 */
function cycleDifficultyTier() {
  const nextTier = (currentTierLevel % 5) + 1;
  const tierStreakMap = { 1: 0, 2: 3, 3: 6, 4: 9, 5: 12 };
  streakCounter = tierStreakMap[nextTier] || 0;

  generateAndRenderProblem(streakCounter);
  timeLeft = currentProblem.allocatedTime;

  syncUI();
  saveSessionState();

  setStatus(`Switched to Tier ${nextTier}: ${dom.tierBadge.textContent}`, 'info');
  triggerStreakPop();
}

// =============================================================================
// 7. Dynamic Stress-Level Visual System
// =============================================================================

function syncUI() {
  if (!dom.timerDisplay || !dom.body) return;

  dom.timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;

  if (dom.streakDisplay) {
    dom.streakDisplay.textContent = String(streakCounter);
  }

  dom.body.classList.remove('state-warning', 'state-panic', 'state-failed');

  if (currentState === GameStates.FAILED || timeLeft <= 0) {
    dom.body.classList.add('state-failed');
  } else if (timeLeft <= 5) {
    dom.body.classList.add('state-panic');
  } else if (timeLeft <= 10) {
    dom.body.classList.add('state-warning');
  }
}

function setStatus(message, type = 'info') {
  if (!dom.statusMessage) return;
  dom.statusMessage.textContent = message;
  dom.statusMessage.className = `status-message ${type}`;
}

// =============================================================================
// 8. Demo / Targeting Mode Toggle
// =============================================================================

function toggleTargetMode() {
  isDemoMode = !isDemoMode;
  updateModeDisplay();
}

function updateModeDisplay() {
  if (isDemoMode) {
    if (dom.modeLabel) dom.modeLabel.textContent = 'DEMO MODE';
    if (dom.targetIndicator) {
      dom.targetIndicator.textContent = 'TARGET: ALL ACTIVE TABS';
      dom.targetIndicator.style.color = '#38bdf8';
      dom.targetIndicator.style.borderColor = 'rgba(56, 189, 248, 0.3)';
      dom.targetIndicator.style.background = 'rgba(56, 189, 248, 0.12)';
    }
  } else {
    if (dom.modeLabel) dom.modeLabel.textContent = 'STRICT MODE';
    if (dom.targetIndicator) {
      dom.targetIndicator.textContent = 'TARGET: SOCIAL MEDIA ONLY';
      dom.targetIndicator.style.color = '#a78bfa';
      dom.targetIndicator.style.borderColor = 'rgba(167, 139, 250, 0.3)';
      dom.targetIndicator.style.background = 'rgba(167, 139, 250, 0.12)';
    }
  }
}

// =============================================================================
// 9. Session Persistence (chrome.storage)
// =============================================================================

function loadSessionState(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['savedStreak'], (result) => {
      if (result && typeof result.savedStreak === 'number') {
        streakCounter = result.savedStreak;
      }
      callback();
    });
  } else {
    callback();
  }
}

function saveSessionState() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ savedStreak: streakCounter });
  }
}

function resetSessionState() {
  streakCounter = 0;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ savedStreak: 0 });
  }
}

// =============================================================================
// 10. Timer Cadence & Game Loop
// =============================================================================

function startTimerLoop() {
  stopTimerLoop();

  countdownTimer = setInterval(() => {
    if (currentState === GameStates.FAILED) {
      stopTimerLoop();
      return;
    }

    timeLeft -= 1;

    // Psychoacoustic feedback when countdown is under 6 seconds
    if (timeLeft <= 6 && timeLeft > 0) {
      playUrgencyTone(timeLeft);
    }

    if (timeLeft <= 0) {
      timeLeft = 0;
      syncUI();
      transitionTo(GameStates.FAILED);
    } else {
      syncUI();
    }
  }, CONFIG.COUNTDOWN_INTERVAL_MS);
}

function stopTimerLoop() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// =============================================================================
// 11. State Machine Transitions & Micro-Interactions
// =============================================================================

function transitionTo(nextState) {
  currentState = nextState;

  switch (currentState) {
    case GameStates.IDLE:
      stopTimerLoop();
      streakCounter = 0;
      currentTierLevel = 1;
      timeLeft = currentProblem.allocatedTime || 22;
      syncUI();
      break;

    case GameStates.ACTIVE:
      startTimerLoop();
      syncUI();
      if (dom.answerInput) dom.answerInput.focus();
      break;

    case GameStates.PENALTY: {
      const penalty = currentProblem.penaltySeconds || 5;
      timeLeft = Math.max(0, timeLeft - penalty);
      setStatus(`✗ Incorrect! -${penalty}s Penalty`, 'error');

      triggerTypoPenaltyShake();

      if (timeLeft <= 0) {
        timeLeft = 0;
        syncUI();
        transitionTo(GameStates.FAILED);
      } else {
        syncUI();
        currentState = GameStates.ACTIVE;
      }
      break;
    }

    case GameStates.FAILED:
      stopTimerLoop();
      resetSessionState();
      syncUI();
      onTimerExpired();
      break;
  }
}

function triggerTypoPenaltyShake() {
  const targetEl = dom.inputWrapper || dom.answerInput;
  if (!targetEl) return;

  targetEl.classList.remove('shake');
  void targetEl.offsetWidth;
  targetEl.classList.add('shake');

  setTimeout(() => {
    targetEl.classList.remove('shake');
  }, CONFIG.SHAKE_DURATION_MS);
}

function triggerStreakPop() {
  if (!dom.streakBadge) return;
  dom.streakBadge.classList.remove('streak-pop');
  void dom.streakBadge.offsetWidth;
  dom.streakBadge.classList.add('streak-pop');

  setTimeout(() => {
    if (dom.streakBadge) dom.streakBadge.classList.remove('streak-pop');
  }, 250);
}

// =============================================================================
// 12. Tab Termination & Safety Guards
// =============================================================================

function isProtectedUrl(url) {
  if (!url) return true;
  const protectedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:'];
  return protectedProtocols.some((protocol) => url.startsWith(protocol));
}

function isTargetDistraction(url) {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return TARGET_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function onTimerExpired() {
  stopTimerLoop();
  playBuzzerSound();

  if (dom.answerInput) dom.answerInput.disabled = true;
  if (dom.submitBtn) dom.submitBtn.disabled = true;
  if (dom.problemDisplay) dom.problemDisplay.textContent = 'TAB EXECUTED';

  setStatus('🚨 TERMINATING ACTIVE TAB...', 'alert');

  if (typeof chrome === 'undefined' || !chrome.tabs) {
    setStatus('⚠️ Chrome Tabs API unavailable in test environment.', 'warn');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0 || !tabs[0]) {
      setStatus('⚠️ No active tab detected to terminate.', 'warn');
      return;
    }

    const activeTab = tabs[0];

    if (isProtectedUrl(activeTab.url)) {
      setStatus('Protected System Tab Detected: Cannot Terminate', 'warn');
      return;
    }

    if (!isDemoMode && !isTargetDistraction(activeTab.url)) {
      setStatus('Non-distracting tab spared. Get back to work.', 'info');
      return;
    }

    setTimeout(() => {
      chrome.tabs.remove(activeTab.id, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn('Tab removal note:', chrome.runtime.lastError.message);
        }
      });
    }, CONFIG.EXECUTION_DELAY_MS);
  });
}

// =============================================================================
// 13. User Input Evaluation
// =============================================================================

function handleInputEvaluation(e) {
  if (e) e.preventDefault();

  if (currentState === GameStates.FAILED) return;

  if (!dom.answerInput) return;
  const rawInput = dom.answerInput.value.trim();

  if (rawInput === '') return;

  // Extract clean integer (handles negative integers, "x=10", "10", "0x3F => 63")
  const cleanInput = rawInput.replace(/[^0-9\-]/g, '');
  const parsedValue = parseInt(cleanInput, 10);

  if (!isNaN(parsedValue) && parsedValue === currentProblem.solution) {
    // ---- Correct Answer: Exponential escalation ----
    streakCounter += 1;
    saveSessionState();

    generateAndRenderProblem(streakCounter);
    timeLeft = currentProblem.allocatedTime;

    playSuccessChime();
    triggerStreakPop();
    setStatus(`✓ Correct! +${currentProblem.allocatedTime}s Reset (Tier ${currentProblem.tierLevel})`, 'info');

    dom.answerInput.value = '';
    dom.answerInput.focus();

    syncUI();
  } else {
    // ---- Incorrect Answer: Exponential Penalty ----
    dom.answerInput.value = '';
    dom.answerInput.focus();
    transitionTo(GameStates.PENALTY);
  }
}

// =============================================================================
// 14. Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  updateModeDisplay();

  // Load persistent streak or default to 0
  loadSessionState(() => {
    generateAndRenderProblem(streakCounter);
    timeLeft = currentProblem.allocatedTime;
    syncUI();
    transitionTo(GameStates.ACTIVE);
  });

  if (dom.answerInput) {
    dom.answerInput.focus();
  }

  if (dom.tierBadge) {
    dom.tierBadge.addEventListener('click', cycleDifficultyTier);
  }

  if (dom.modeToggleBtn) {
    dom.modeToggleBtn.addEventListener('click', toggleTargetMode);
  }

  if (dom.answerForm) {
    dom.answerForm.addEventListener('submit', handleInputEvaluation);
  }
  if (dom.submitBtn) {
    dom.submitBtn.addEventListener('click', handleInputEvaluation);
  }
});
