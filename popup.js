/**
 * Anti-Procrastination Tab Executioner (v3.0.0)
 * Milestone 4: UI Polish, Micro-Interactions & Live Pitch Prep
 */

// =============================================================================
// 1. Game Configuration & Targets
// =============================================================================
const CONFIG = Object.freeze({
  BASE_TIME_SECONDS: 20,
  PENALTY_SECONDS: 5,
  COUNTDOWN_INTERVAL_MS: 1000,
  SHAKE_DURATION_MS: 350,
  BUZZER_DURATION_MS: 400,
  EXECUTION_DELAY_MS: 300,
  OPERATORS: ['+', '-', '×']
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

// Mode state: true = Demo Mode (All non-system tabs), false = Strict Mode (Distractions only)
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
let timeLeft = CONFIG.BASE_TIME_SECONDS;
let streakCounter = 0;
let countdownTimer = null;
let audioCtx = null;
let currentProblem = {
  num1: 0,
  num2: 0,
  operator: '+',
  solution: 0
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

/**
 * 880Hz alert buzzer tone (Sawtooth waveform + Gain envelope)
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

/**
 * Positive chime on streak milestone or correct input
 */
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
// 6. Dynamic Math Engine
// =============================================================================

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMathProblem() {
  let a = getRandomInt(3, 25);
  let b = getRandomInt(2, 12);
  const operator = CONFIG.OPERATORS[Math.floor(Math.random() * CONFIG.OPERATORS.length)];
  let solution = 0;

  switch (operator) {
    case '+':
      solution = a + b;
      break;

    case '-':
      if (a < b) {
        [a, b] = [b, a];
      }
      solution = a - b;
      break;

    case '×':
      a = getRandomInt(2, 12);
      b = getRandomInt(2, 12);
      solution = a * b;
      break;
  }

  currentProblem = { num1: a, num2: b, operator, solution };
  return currentProblem;
}

function renderProblem() {
  if (!dom.problemDisplay) return;
  dom.problemDisplay.textContent = `${currentProblem.num1} ${currentProblem.operator} ${currentProblem.num2} = ?`;
}

// =============================================================================
// 7. Dynamic Stress-Level Visual System
// =============================================================================

function syncUI() {
  if (!dom.timerDisplay || !dom.body) return;

  // 1. Oversized Countdown Display
  dom.timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;

  // 2. Streak Badge
  if (dom.streakDisplay) {
    dom.streakDisplay.textContent = String(streakCounter);
  }

  // 3. Stress State Classes
  dom.body.classList.remove('state-warning', 'state-panic', 'state-failed');

  if (currentState === GameStates.FAILED || timeLeft <= 0) {
    dom.body.classList.add('state-failed');
  } else if (timeLeft <= 5) {
    // Panic State: <= 5 seconds (Crimson flash & micro-vibration)
    dom.body.classList.add('state-panic');
  } else if (timeLeft <= 10) {
    // Warning State: 6s - 10s (Amber pulse)
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
      timeLeft = CONFIG.BASE_TIME_SECONDS;
      streakCounter = 0;
      syncUI();
      break;

    case GameStates.ACTIVE:
      startTimerLoop();
      syncUI();
      if (dom.answerInput) dom.answerInput.focus();
      break;

    case GameStates.PENALTY:
      timeLeft = Math.max(0, timeLeft - CONFIG.PENALTY_SECONDS);
      setStatus(`✗ Incorrect! -${CONFIG.PENALTY_SECONDS}s Penalty`, 'error');

      // Trigger 350ms CSS shake on input container
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

/**
 * 350ms smooth CSS horizontal shake on input with red highlight
 */
function triggerTypoPenaltyShake() {
  const targetEl = dom.inputWrapper || dom.answerInput;
  if (!targetEl) return;

  targetEl.classList.remove('shake');
  void targetEl.offsetWidth; // Force reflow
  targetEl.classList.add('shake');

  setTimeout(() => {
    targetEl.classList.remove('shake');
  }, CONFIG.SHAKE_DURATION_MS);
}

/**
 * Green flash & scale-up animation on streak pill
 */
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

    // Safeguard 1: Protected System Protocol Guard
    if (isProtectedUrl(activeTab.url)) {
      setStatus('Protected System Tab Detected: Cannot Terminate', 'warn');
      return;
    }

    // Safeguard 2: Targeting Mode (Demo Mode closes all, Strict Mode closes distractions)
    if (!isDemoMode && !isTargetDistraction(activeTab.url)) {
      setStatus('Non-distracting tab spared. Get back to work.', 'info');
      return;
    }

    // Delay tab removal by 300ms so visual alert & audio buzzer register
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
    timeLeft = CONFIG.BASE_TIME_SECONDS;
    streakCounter += 1;

    playSuccessChime();
    triggerStreakPop();
    setStatus('✓ Correct! +20s Reset', 'info');

    dom.answerInput.value = '';
    dom.answerInput.focus();

    generateMathProblem();
    renderProblem();
    syncUI();
  } else {
    // ---- Incorrect Answer ----
    dom.answerInput.value = '';
    dom.answerInput.focus();
    transitionTo(GameStates.PENALTY);
  }
}

// =============================================================================
// 13. Initialization & Event Binding (Zero inline JS)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  updateModeDisplay();
  generateMathProblem();
  renderProblem();
  transitionTo(GameStates.ACTIVE);

  // Auto-focus input immediately on popup open
  if (dom.answerInput) {
    dom.answerInput.focus();
  }

  // Pitch / Mode Toggle Listener
  if (dom.modeToggleBtn) {
    dom.modeToggleBtn.addEventListener('click', toggleTargetMode);
  }

  // Submit via form submit listener (covers button click & Enter key)
  if (dom.answerForm) {
    dom.answerForm.addEventListener('submit', handleInputEvaluation);
  }
});
