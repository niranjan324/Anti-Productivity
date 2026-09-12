/**
 * Anti-Procrastination Tab Executioner (v3.1.0)
 * Feature: Dynamic Arithmetic Inflation & Difficulty Scaling
 */

// =============================================================================
// 1. Game Configuration & Settings
// =============================================================================
const CONFIG = Object.freeze({
  PENALTY_SECONDS: 5,
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
let timeLeft = 20;
let countdownTimer = null;
let audioCtx = null;
let currentProblem = {
  displayString: '',
  solution: 0,
  tierLevel: 1,
  allocatedTime: 20
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
// 5. Zero-Dependency Web Audio Synthesizer
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

function playBuzzerSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const durationSec = CONFIG.BUZZER_DURATION_MS / 1000;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, now);
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
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

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
// 6. Dynamic Arithmetic Inflation Engine
// =============================================================================

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates an adaptive math problem based on current survival streak.
 * 
 * Difficulty Tiers:
 * - Tier 1: Warmup (Streak 0-3) -> Simple Add/Sub [20s base]
 * - Tier 2: Escalation (Streak 4-7) -> Double Digit Add/Sub or Standard Multi [18s base]
 * - Tier 3: Cognitive Overload (Streak 8-11) -> 3-term Arithmetic or Heavy Product [15s base]
 * - Tier 4: Supercharged Algebra (Streak 12+) -> Ax ± B = C solving for x [15s base]
 * 
 * @param {number} streak
 * @returns {{ displayString: string, solution: number, tierLevel: number, allocatedTime: number }}
 */
function generateInflatedProblem(streak) {
  let displayString = '';
  let solution = 0;
  let tierLevel = 1;
  let allocatedTime = 20;

  if (streak <= 3) {
    // ---- Tier 1: Warmup (Streak 0 - 3) ----
    tierLevel = 1;
    allocatedTime = 20;
    const isAdd = Math.random() > 0.5;
    let a = getRandomInt(3, 20);
    let b = getRandomInt(2, 15);

    if (isAdd) {
      solution = a + b;
      displayString = `${a} + ${b} = ?`;
    } else {
      if (a < b) [a, b] = [b, a]; // Guarantee non-negative
      solution = a - b;
      displayString = `${a} - ${b} = ?`;
    }

  } else if (streak <= 7) {
    // ---- Tier 2: Escalation (Streak 4 - 7) ----
    tierLevel = 2;
    allocatedTime = 18;
    const opChoice = Math.random();

    if (opChoice < 0.35) {
      // Large Addition
      const a = getRandomInt(15, 60);
      const b = getRandomInt(10, 40);
      solution = a + b;
      displayString = `${a} + ${b} = ?`;
    } else if (opChoice < 0.7) {
      // Large Subtraction
      let a = getRandomInt(15, 60);
      let b = getRandomInt(10, 40);
      if (a < b) [a, b] = [b, a];
      solution = a - b;
      displayString = `${a} - ${b} = ?`;
    } else {
      // Standard Multiplication (3 to 12)
      const a = getRandomInt(3, 12);
      const b = getRandomInt(3, 12);
      solution = a * b;
      displayString = `${a} × ${b} = ?`;
    }

  } else if (streak <= 11) {
    // ---- Tier 3: Cognitive Overload (Streak 8 - 11) ----
    tierLevel = 3;
    allocatedTime = 15;
    const isChaining = Math.random() > 0.45;

    if (isChaining) {
      // 3-term Arithmetic Chaining: (A ± B) ± C
      const a = getRandomInt(8, 25);
      const b = getRandomInt(5, 20);
      const c = getRandomInt(3, 15);
      const op1 = Math.random() > 0.5 ? '+' : '-';
      const op2 = Math.random() > 0.5 ? '+' : '-';

      let intermediate = (op1 === '+') ? (a + b) : (a - b);
      if (intermediate < 0) {
        // Prevent negative intermediate
        intermediate = a + b;
        solution = (op2 === '+') ? (intermediate + c) : Math.max(0, intermediate - c);
        displayString = `${a} + ${b} ${op2} ${c} = ?`;
      } else {
        solution = (op2 === '+') ? (intermediate + c) : (intermediate - c);
        if (solution < 0) {
          solution = intermediate + c;
          displayString = `${a} ${op1} ${b} + ${c} = ?`;
        } else {
          displayString = `${a} ${op1} ${b} ${op2} ${c} = ?`;
        }
      }
    } else {
      // Heavy Product: Two-digit by single-digit
      const a = getRandomInt(13, 25);
      const b = getRandomInt(4, 9);
      solution = a * b;
      displayString = `${a} × ${b} = ?`;
    }

  } else {
    // ---- Tier 4: Supercharged Single-Variable Algebra (Streak 12+) ----
    tierLevel = 4;
    allocatedTime = 15;
    const isAddition = Math.random() > 0.5;
    const a = getRandomInt(2, 6);
    const x = getRandomInt(2, 10); // Target solution
    const b = getRandomInt(1, 15);

    if (isAddition) {
      // Ax + B = C
      const c = (a * x) + b;
      displayString = `Find x: ${a}x + ${b} = ${c}`;
    } else {
      // Ax - B = C
      const c = (a * x) - b;
      if (c >= 0) {
        displayString = `Find x: ${a}x - ${b} = ${c}`;
      } else {
        // Fallback to addition if negative C
        const cAdd = (a * x) + b;
        displayString = `Find x: ${a}x + ${b} = ${cAdd}`;
      }
    }

    solution = x;
  }

  currentProblem = { displayString, solution, tierLevel, allocatedTime };
  return currentProblem;
}

/**
 * Updates Tier Badge label, styling, and level-up animation.
 */
function updateTierUI(tierLevel) {
  if (!dom.tierBadge) return;

  const tierMetadata = {
    1: { label: 'WARMUP', class: 'tier-1' },
    2: { label: 'ACCELERATED', class: 'tier-2' },
    3: { label: 'HIGH STRESS', class: 'tier-3' },
    4: { label: 'ALGEBRA HAZARD', class: 'tier-4' }
  };

  const currentMeta = tierMetadata[tierLevel] || tierMetadata[1];

  // Detect Level-Up Escalation
  if (tierLevel !== currentTierLevel) {
    currentTierLevel = tierLevel;
    dom.tierBadge.classList.add('tier-level-up');
    setTimeout(() => {
      if (dom.tierBadge) dom.tierBadge.classList.remove('tier-level-up');
    }, CONFIG.TIER_FLASH_DURATION_MS);
  }

  dom.tierBadge.textContent = currentMeta.label;
  dom.tierBadge.className = `tier-badge ${currentMeta.class}`;
}

function renderActiveProblem() {
  if (!dom.problemDisplay) return;
  dom.problemDisplay.textContent = currentProblem.displayString;
  updateTierUI(currentProblem.tierLevel);
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
// 9. Timer Cadence & Game Loop
// =============================================================================

function startTimerLoop() {
  stopTimerLoop();

  countdownTimer = setInterval(() => {
    if (currentState === GameStates.FAILED) {
      stopTimerLoop();
      return;
    }

    timeLeft -= 1;

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
// 10. State Machine Transitions & Micro-Interactions
// =============================================================================

function transitionTo(nextState) {
  currentState = nextState;

  switch (currentState) {
    case GameStates.IDLE:
      stopTimerLoop();
      streakCounter = 0;
      currentTierLevel = 1;
      timeLeft = currentProblem.allocatedTime || 20;
      syncUI();
      break;

    case GameStates.ACTIVE:
      startTimerLoop();
      syncUI();
      if (dom.answerInput) dom.answerInput.focus();
      break;

    case GameStates.PENALTY:
      // Deduct penalty seconds without resetting streak counter
      timeLeft = Math.max(0, timeLeft - CONFIG.PENALTY_SECONDS);
      setStatus(`✗ Incorrect! -${CONFIG.PENALTY_SECONDS}s Penalty`, 'error');

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

    case GameStates.FAILED:
      stopTimerLoop();
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
// 11. Tab Termination & Safety Guards
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
// 12. User Input Evaluation
// =============================================================================

function handleInputEvaluation(e) {
  if (e) e.preventDefault();

  if (currentState === GameStates.FAILED) return;

  if (!dom.answerInput) return;
  const rawInput = dom.answerInput.value.trim();

  if (rawInput === '') return;

  const parsedValue = parseInt(rawInput, 10);

  if (parsedValue === currentProblem.solution) {
    // ---- Correct Answer ----
    streakCounter += 1;

    // Generate new inflated problem and reset to its allocated base timer
    generateInflatedProblem(streakCounter);
    timeLeft = currentProblem.allocatedTime;

    playSuccessChime();
    triggerStreakPop();
    setStatus(`✓ Correct! +${currentProblem.allocatedTime}s Reset`, 'info');

    dom.answerInput.value = '';
    dom.answerInput.focus();

    renderActiveProblem();
    syncUI();
  } else {
    // ---- Incorrect Answer ----
    dom.answerInput.value = '';
    dom.answerInput.focus();
    transitionTo(GameStates.PENALTY);
  }
}

// =============================================================================
// 13. Initialization (Strict Manifest V3 DOMContentLoaded)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  updateModeDisplay();

  // Generate initial Tier 1 Warmup equation
  generateInflatedProblem(streakCounter);
  timeLeft = currentProblem.allocatedTime;
  renderActiveProblem();

  transitionTo(GameStates.ACTIVE);

  if (dom.answerInput) {
    dom.answerInput.focus();
  }

  if (dom.modeToggleBtn) {
    dom.modeToggleBtn.addEventListener('click', toggleTargetMode);
  }

  if (dom.answerForm) {
    dom.answerForm.addEventListener('submit', handleInputEvaluation);
  }
});
