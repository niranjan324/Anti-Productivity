/**
 * Anti-Procrastination Tab Executioner
 * Milestone 2: The Math Engine & Game State Machine
 */

// =============================================================================
// 1. Finite State Machine (FSM) Definitions
// =============================================================================
const GameStates = Object.freeze({
  IDLE: 'IDLE',         // Initial state prior to start or on full reset
  ACTIVE: 'ACTIVE',     // Timer ticking down, accepting user math inputs
  PENALTY: 'PENALTY',   // Triggered on incorrect answer: time deduction & visual shake
  FAILED: 'FAILED'      // Timer hits 0; halts game loop and executes failure trigger
});

// =============================================================================
// 2. Constants & Game Configuration
// =============================================================================
const CONFIG = Object.freeze({
  BASE_TIME_SECONDS: 20,
  PENALTY_SECONDS: 5,
  COUNTDOWN_INTERVAL_MS: 1000,
  SHAKE_DURATION_MS: 300,
  OPERATORS: ['+', '-', '×']
});

// =============================================================================
// 3. Game State Container
// =============================================================================
let currentState = GameStates.IDLE;
let timeLeft = CONFIG.BASE_TIME_SECONDS;
let streakCounter = 0;
let countdownTimer = null;
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
    feedbackArea: document.getElementById('feedback-area')
  };
}

// =============================================================================
// 5. Dynamic Math Engine
// =============================================================================

/**
 * Generates an integer in the inclusive range [min, max].
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a randomized arithmetic equation:
 * - Operands bounded for fast mental arithmetic within 20s.
 * - Subtraction guarantees A >= B to avoid negative numbers.
 * - Multiplication bounds operands to <= 12.
 * @returns {{ num1: number, num2: number, operator: string, solution: number }}
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
      // Guarantee A >= B to avoid negative results
      if (a < b) {
        [a, b] = [b, a];
      }
      solution = a - b;
      break;

    case '×':
      // Bound multiplication operands (A <= 12, B <= 12) for realistic mental math
      a = getRandomInt(2, 12);
      b = getRandomInt(2, 12);
      solution = a * b;
      break;
  }

  currentProblem = { num1: a, num2: b, operator, solution };
  return currentProblem;
}

/**
 * Renders the active math equation to the UI.
 */
function renderProblem() {
  if (!dom.problemDisplay) return;
  dom.problemDisplay.textContent = `${currentProblem.num1} ${currentProblem.operator} ${currentProblem.num2} = ?`;
}

// =============================================================================
// 6. Dynamic Visual UI State Synchronization
// =============================================================================

/**
 * Synchronizes DOM elements and toggles root CSS stress classes based on remaining time.
 */
function syncUI() {
  if (!dom.timerDisplay || !dom.body) return;

  // 1. Update Timer Text
  dom.timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;

  // 2. Update Streak Counter
  if (dom.streakDisplay) {
    dom.streakDisplay.textContent = String(streakCounter);
  }

  // 3. Dynamic Visual Stress State Transitions
  dom.body.classList.remove('state-warning', 'state-panic', 'state-failed');

  if (currentState === GameStates.FAILED || timeLeft <= 0) {
    dom.body.classList.add('state-failed');
  } else if (timeLeft <= 5) {
    // Panic mode: <= 5 seconds
    dom.body.classList.add('state-panic');
  } else if (timeLeft <= 10) {
    // Warning mode: 6s - 10s
    dom.body.classList.add('state-warning');
  }
  // Standard mode (> 10s): No extra stress classes applied
}

/**
 * Displays contextual feedback messages to the user.
 * @param {string} message 
 * @param {'info' | 'warn' | 'error'} type 
 */
function setFeedback(message, type = 'info') {
  if (!dom.feedbackArea) return;
  dom.feedbackArea.textContent = message;
  dom.feedbackArea.className = `feedback-area ${type}`;
}

// =============================================================================
// 7. Timer Cadence & Game Loop
// =============================================================================

/**
 * Starts the 1-second countdown cadence.
 */
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

/**
 * Halts the countdown interval.
 */
function stopTimerLoop() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// =============================================================================
// 8. State Machine Transitions & Actions
// =============================================================================

/**
 * Manages explicit transitions between Finite State Machine states.
 * @param {string} nextState 
 */
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
      // Deduct 5 seconds immediately
      timeLeft = Math.max(0, timeLeft - CONFIG.PENALTY_SECONDS);
      setFeedback(`✗ Incorrect! -${CONFIG.PENALTY_SECONDS}s Penalty`, 'error');

      // Trigger 300ms CSS shake on input
      triggerInputShake();

      // Check if penalty caused immediate time exhaustion
      if (timeLeft <= 0) {
        timeLeft = 0;
        syncUI();
        transitionTo(GameStates.FAILED);
      } else {
        syncUI();
        // Return to ACTIVE state once penalty is applied
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
 * Triggers the 300ms CSS shake animation on the input element.
 */
function triggerInputShake() {
  if (!dom.answerInput) return;

  dom.answerInput.classList.remove('shake');
  // Trigger DOM reflow to restart CSS animation
  void dom.answerInput.offsetWidth;
  dom.answerInput.classList.add('shake');

  setTimeout(() => {
    if (dom.answerInput) {
      dom.answerInput.classList.remove('shake');
    }
  }, CONFIG.SHAKE_DURATION_MS);
}

/**
 * Milestone 2 Placeholder Hook / Tab Execution Trigger.
 * Executed when the countdown hits 0 seconds.
 */
function onTimerExpired() {
  setFeedback('⚡ Countdown hit 0! Tab Execution Initiated...', 'error');

  // Disable controls
  if (dom.answerInput) dom.answerInput.disabled = true;
  if (dom.submitBtn) dom.submitBtn.disabled = true;
  if (dom.problemDisplay) dom.problemDisplay.textContent = 'TAB EXECUTED';

  // Chrome Tabs API Integration (Milestone 3 Bridge)
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab && tab.id) {
        const isProtected = tab.url && /^(chrome|chrome-extension|edge|about|devtools):/.test(tab.url);
        if (!isProtected) {
          chrome.tabs.remove(tab.id).catch((err) => console.error('Tab remove error:', err));
        } else {
          setFeedback('⚠️ Cannot close protected browser tab.', 'warn');
        }
      }
    }).catch((err) => console.error('Tabs query error:', err));
  }
}

// =============================================================================
// 9. User Input Validation & Handling
// =============================================================================

/**
 * Evaluates the user's input against the active math problem.
 */
function handleInputEvaluation() {
  if (currentState === GameStates.FAILED) return;

  if (!dom.answerInput) return;
  const rawInput = dom.answerInput.value.trim();

  // Ignore empty submissions
  if (rawInput === '') return;

  const parsedValue = parseInt(rawInput, 10);

  if (parsedValue === currentProblem.solution) {
    // ---- Correct Answer ----
    timeLeft = CONFIG.BASE_TIME_SECONDS;
    streakCounter += 1;

    setFeedback('✓ Correct! +20s Reset', 'info');

    // Clear input and maintain focus
    dom.answerInput.value = '';
    dom.answerInput.focus();

    // Generate & render next equation
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
// 10. Initialization & Event Binding (Strict Manifest V3 DOMContentLoaded)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize DOM cache
  initDOMReferences();

  // 2. Generate initial math equation
  generateMathProblem();
  renderProblem();

  // 3. Transition to ACTIVE state (starts 20s countdown)
  transitionTo(GameStates.ACTIVE);

  // 4. Attach Event Listeners (Explicit click & Enter key bindings)
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
