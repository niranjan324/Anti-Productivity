/**
 * Anti-Procrastination Tab Executioner (v2.0.0)
 * Milestone 3: Tab Targeting & Termination Logic
 * 
 * Features:
 * - Finite State Machine (IDLE, ACTIVE, PENALTY, FAILED)
 * - Dynamic Arithmetic Problem Engine
 * - Zero-Dependency Web Audio 880Hz Sawtooth Alarm Synthesizer
 * - Chrome Tabs API Active Tab Querying & Execution Sequence
 * - System Protocol URL Safeguards & Domain Filter Enforcement
 */

// =============================================================================
// 1. Configuration & Targeting Mode Settings
// =============================================================================
const CONFIG = Object.freeze({
  BASE_TIME_SECONDS: 20,
  PENALTY_SECONDS: 5,
  COUNTDOWN_INTERVAL_MS: 1000,
  SHAKE_DURATION_MS: 300,
  BUZZER_DURATION_MS: 400,
  EXECUTION_DELAY_MS: 300,
  OPERATORS: ['+', '-', '×']
});

// Distracting domains list (checked when ENFORCE_ALL_TABS is false)
const TARGET_DOMAINS = [
  'youtube.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'twitch.tv',
  'netflix.com'
];

// Toggle true to terminate any non-system tab, or false to only terminate TARGET_DOMAINS
const ENFORCE_ALL_TABS = true;

// =============================================================================
// 2. Finite State Machine (FSM) States
// =============================================================================
const GameStates = Object.freeze({
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  PENALTY: 'PENALTY',
  FAILED: 'FAILED'
});

// =============================================================================
// 3. State Container
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
// 4. DOM Element References
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
    statusMessage: document.getElementById('status-message')
  };
}

// =============================================================================
// 5. Zero-Dependency Web Audio Synthesizer
// =============================================================================

/**
 * Initializes and returns a Web Audio Context.
 * Resumes audio context if paused by Chrome autoplay policies.
 * @returns {AudioContext}
 */
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
 * Synthesizes an 880Hz alert buzzer tone using native Web Audio API.
 * Uses a sawtooth waveform and a GainNode at 0.2 volume to prevent speaker clipping.
 * Plays for exactly 400ms without requiring external audio files.
 */
function playBuzzerSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const durationSec = CONFIG.BUZZER_DURATION_MS / 1000;

    // 1. Create Oscillator (Sound Generator)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now); // 880Hz shrill A5 tone

    // 2. Create GainNode (Volume Control)
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, now); // 0.2 gain to prevent clipping
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    // 3. Connect Graph: Oscillator -> Gain -> Hardware Output
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 4. Execute 400ms synthesis window
    osc.start(now);
    osc.stop(now + durationSec);
  } catch (err) {
    console.error('Web Audio buzzer error:', err);
  }
}

// =============================================================================
// 6. Dynamic Math Engine
// =============================================================================

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates bounded arithmetic problems for rapid mental calculation.
 */
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
      // Guarantee A >= B to prevent negative numbers
      if (a < b) {
        [a, b] = [b, a];
      }
      solution = a - b;
      break;

    case '×':
      // Bound multiplication operands for fast mental math
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
// 7. Visual UI State Synchronization
// =============================================================================

function syncUI() {
  if (!dom.timerDisplay || !dom.body) return;

  // 1. Update Timer Text
  dom.timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;

  // 2. Update Streak
  if (dom.streakDisplay) {
    dom.streakDisplay.textContent = String(streakCounter);
  }

  // 3. Update Visual Stress Classes
  dom.body.classList.remove('state-warning', 'state-panic', 'state-failed');

  if (currentState === GameStates.FAILED || timeLeft <= 0) {
    dom.body.classList.add('state-failed');
  } else if (timeLeft <= 5) {
    dom.body.classList.add('state-panic');
  } else if (timeLeft <= 10) {
    dom.body.classList.add('state-warning');
  }
}

/**
 * Displays status feedback messages in the popup.
 * @param {string} message 
 * @param {'info' | 'warn' | 'error' | 'alert'} type 
 */
function setStatus(message, type = 'info') {
  if (!dom.statusMessage) return;
  dom.statusMessage.textContent = message;
  dom.statusMessage.className = `status-message ${type}`;
}

// =============================================================================
// 8. Timer Cadence & Game Loop
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
// 9. State Machine Transitions
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
      // Instantly deduct penalty seconds
      timeLeft = Math.max(0, timeLeft - CONFIG.PENALTY_SECONDS);
      setStatus(`✗ Incorrect! -${CONFIG.PENALTY_SECONDS}s Penalty`, 'error');

      // 300ms CSS Shake
      triggerInputShake();

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
      // Halt game loop immediately
      stopTimerLoop();
      syncUI();
      onTimerExpired();
      break;
  }
}

function triggerInputShake() {
  if (!dom.answerInput) return;

  dom.answerInput.classList.remove('shake');
  void dom.answerInput.offsetWidth; // Force reflow
  dom.answerInput.classList.add('shake');

  setTimeout(() => {
    if (dom.answerInput) {
      dom.answerInput.classList.remove('shake');
    }
  }, CONFIG.SHAKE_DURATION_MS);
}

// =============================================================================
// 10. Tab Targeting & Termination Engine (Milestone 3)
// =============================================================================

/**
 * Checks if a given URL belongs to protected internal browser schemes.
 * @param {string} url 
 * @returns {boolean}
 */
function isProtectedUrl(url) {
  if (!url) return true;
  const protectedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:'];
  return protectedProtocols.some((protocol) => url.startsWith(protocol));
}

/**
 * Checks if a given URL matches any configured target distracting domains.
 * @param {string} url 
 * @returns {boolean}
 */
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

/**
 * Executes the failure sequence when countdown expires.
 * Choreography:
 * 1. Clear countdown interval immediately.
 * 2. Trigger 880Hz alert buzzer sound.
 * 3. Update UI to alert state.
 * 4. Delay tab removal by 300ms so visual/audio alert registers.
 * 5. Handle protected tabs and domain filter safeguards.
 */
function onTimerExpired() {
  // Step 1: Halt interval
  stopTimerLoop();

  // Step 2: Trigger Synthesized 880Hz Buzzer
  playBuzzerSound();

  // Disable UI inputs
  if (dom.answerInput) dom.answerInput.disabled = true;
  if (dom.submitBtn) dom.submitBtn.disabled = true;
  if (dom.problemDisplay) dom.problemDisplay.textContent = 'TAB EXECUTED';

  // Step 3: Update UI text with alert styling
  setStatus('🚨 TERMINATING ACTIVE TAB...', 'alert');

  // Query active tab in the current window using Chrome Manifest V3 Tabs API
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    setStatus('⚠️ Chrome Tabs API unavailable in current environment.', 'warn');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Handle cases where tabs array is empty or inaccessible
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

    // Safeguard 2: Targeting Mode Configuration Check
    if (!ENFORCE_ALL_TABS && !isTargetDistraction(activeTab.url)) {
      setStatus('Non-distracting tab spared. Get back to work.', 'info');
      return;
    }

    // Step 4: Delay tab removal by 300ms so user hears the buzzer & sees alert
    setTimeout(() => {
      chrome.tabs.remove(activeTab.id, () => {
        // Step 5: Check chrome.runtime.lastError silently
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn('Tab removal note:', chrome.runtime.lastError.message);
        }
      });
    }, CONFIG.EXECUTION_DELAY_MS);
  });
}

// =============================================================================
// 11. User Input Evaluation
// =============================================================================

function handleInputEvaluation() {
  if (currentState === GameStates.FAILED) return;

  if (!dom.answerInput) return;
  const rawInput = dom.answerInput.value.trim();

  if (rawInput === '') return;

  const parsedValue = parseInt(rawInput, 10);

  if (parsedValue === currentProblem.solution) {
    // ---- Correct Answer ----
    timeLeft = CONFIG.BASE_TIME_SECONDS;
    streakCounter += 1;

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
// 12. Initialization (Strict Manifest V3 DOMContentLoaded)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  generateMathProblem();
  renderProblem();
  transitionTo(GameStates.ACTIVE);

  if (dom.submitBtn) {
    dom.submitBtn.addEventListener('click', handleInputEvaluation);
  }

  if (dom.answerInput) {
    dom.answerInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleInputEvaluation();
      }
    });
  }
});
