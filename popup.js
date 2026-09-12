/**
 * Anti-Procrastination Tab Executioner (v4.2.0)
 * Terminal Interceptor GUI Controller & Post-Mortem Shame Screen Integration
 */

// =============================================================================
// 1. Constants & Mockery Database
// =============================================================================
const CONFIG = Object.freeze({
  COUNTDOWN_INTERVAL_MS: 1000,
  SHAKE_DURATION_MS: 300,
  EXECUTION_DELAY_MS: 300,
  TIER_POP_DURATION_MS: 250,
  LOCKOUT_SECONDS: 7
});

const TARGET_DOMAINS = [
  'youtube.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'twitch.tv',
  'netflix.com'
];

const MOCKERY_QUOTES = [
  '“Your ancestors fought sabertooth tigers and you just lost to two-digit addition.”',
  '“Closing tabs because you can’t close the mental gap.”',
  '“Silicon wins again. Enjoy your clean browser.”',
  '“Your focus died faster than this tab.”',
  '“404: Cognitive capability not found.”',
  '“Distraction eliminated. Dignity pending.”'
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
let lockoutTimer = null;
let isLockoutActive = false;
let lastEnteredValue = '[TIMEOUT]';
let currentProblem = {
  displayString: '',
  solution: 0,
  sublabel: 'CALCULATE SUM',
  tierLevel: 1,
  allocatedTime: 22,
  penaltySeconds: 5
};

// =============================================================================
// 4. DOM References
// =============================================================================
let dom = {};

function initDOMReferences() {
  dom = {
    body: document.body,
    timerDisplay: document.getElementById('timer-display'),
    progressFill: document.getElementById('progress-fill'),
    problemDisplay: document.getElementById('problem-display'),
    equationSublabel: document.getElementById('equation-sublabel'),
    decayHint: document.getElementById('decay-hint'),
    penaltyHint: document.getElementById('penalty-hint'),
    answerInput: document.getElementById('answer-input'),
    submitBtn: document.getElementById('submit-btn'),
    streakDisplay: document.getElementById('streak-display'),
    streakBadge: document.getElementById('streak-badge'),
    tierBadge: document.getElementById('tier-badge'),
    tierText: document.getElementById('tier-text'),
    statusMessage: document.getElementById('status-message'),
    modeToggleBtn: document.getElementById('mode-toggle-btn'),
    modeLabel: document.getElementById('mode-label'),
    inputWrapper: document.getElementById('input-wrapper'),
    answerForm: document.getElementById('answer-form'),
    statusDot: document.getElementById('status-dot'),
    
    // Shame Screen Overlay Elements
    shameOverlay: document.getElementById('shame-overlay'),
    deceasedTabTitle: document.getElementById('deceased-tab-title'),
    deceasedTabDomain: document.getElementById('deceased-tab-domain'),
    lethalEquationRecap: document.getElementById('lethal-equation-recap'),
    userEntryRecap: document.getElementById('user-entry-recap'),
    shameStreakDisplay: document.getElementById('shame-streak-display'),
    shameRatingDisplay: document.getElementById('shame-rating-display'),
    shameQuoteDisplay: document.getElementById('shame-quote-display'),
    lockoutTimerDisplay: document.getElementById('lockout-timer-display'),
    shameRetryBtn: document.getElementById('shame-retry-btn')
  };
}

// =============================================================================
// 5. Zero-Dependency Audio Feedback
// =============================================================================

function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
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
// 6. Problem Generation & Tier HUD Formatting
// =============================================================================

function generateAndRenderProblem(streak) {
  currentProblem = window.MathEngine.generateExponentialProblem(streak);

  if (currentProblem.tierLevel === 5 && currentProblem.displayString.includes('det |')) {
    const lines = currentProblem.displayString.split('\n');
    if (lines.length >= 2) {
      const line1 = lines[0].replace('det |', '[').replace('|', ']');
      const line2 = lines[1].replace('|', '[').replace('|', ']');
      currentProblem.displayString = `det\n${line1.trim()}\n${line2.trim()}`;
    }
  }

  renderActiveProblem();
}

function updateTierUI(tierLevel) {
  if (!dom.tierBadge) return;

  const tierMetadata = {
    1: { label: 'TIER 1 // WARMUP', class: 'tier-1', icon: '⚡' },
    2: { label: 'TIER 2 // COMPOUND', class: 'tier-2', icon: '⚡' },
    3: { label: 'TIER 3 // MODULO & ROOTS', class: 'tier-3', icon: '🔥' },
    4: { label: 'TIER 4 // ALGEBRA MATRIX', class: 'tier-4', icon: '🧠' },
    5: { label: 'TIER 5 // APEX SINGULARITY', class: 'tier-5', icon: '☣️' }
  };

  const currentMeta = tierMetadata[tierLevel] || tierMetadata[1];

  if (tierLevel !== currentTierLevel) {
    currentTierLevel = tierLevel;
    dom.tierBadge.classList.add('tier-pop');
    setTimeout(() => {
      if (dom.tierBadge) dom.tierBadge.classList.remove('tier-pop');
    }, CONFIG.TIER_POP_DURATION_MS);
  }

  if (dom.tierText) {
    dom.tierText.textContent = currentMeta.label;
  }
  dom.tierBadge.className = `tier-ribbon ${currentMeta.class}`;
  dom.tierBadge.title = `Difficulty: ${currentMeta.label} (Click to cycle tier)`;

  if (dom.equationSublabel && currentProblem.sublabel) {
    dom.equationSublabel.textContent = currentProblem.sublabel;
  }

  if (dom.decayHint) {
    dom.decayHint.textContent = `BASE: ${currentProblem.allocatedTime}s`;
  }

  if (dom.penaltyHint) {
    dom.penaltyHint.textContent = `PRESS ENTER TO VERIFY • -${currentProblem.penaltySeconds}s ERROR PENALTY`;
  }
}

function renderActiveProblem() {
  if (!dom.problemDisplay) return;
  dom.problemDisplay.textContent = currentProblem.displayString;
  updateTierUI(currentProblem.tierLevel);
}

function cycleDifficultyTier() {
  const nextTier = (currentTierLevel % 5) + 1;
  const tierStreakMap = { 1: 0, 2: 3, 3: 6, 4: 9, 5: 12 };
  streakCounter = tierStreakMap[nextTier] || 0;

  generateAndRenderProblem(streakCounter);
  timeLeft = currentProblem.allocatedTime;

  syncUI();
  saveSessionState();

  setStatus(`TIER OVERRIDE: ${dom.tierText ? dom.tierText.textContent : 'TIER ' + nextTier}`, 'info');
  triggerStreakPop();
}

// =============================================================================
// 7. Dynamic Stress-Level Visual System
// =============================================================================

function syncUI() {
  if (!dom.timerDisplay || !dom.body) return;

  dom.timerDisplay.textContent = `${Math.max(0, timeLeft)}s`;

  if (dom.progressFill && currentProblem.allocatedTime > 0) {
    const percent = Math.max(0, Math.min(100, (timeLeft / currentProblem.allocatedTime) * 100));
    dom.progressFill.style.width = `${percent}%`;
  }

  if (dom.streakDisplay) {
    dom.streakDisplay.textContent = String(streakCounter).padStart(2, '0');
  }

  dom.body.classList.remove('state-warning', 'state-panic', 'state-failed');

  if (currentState === GameStates.FAILED || timeLeft <= 0) {
    dom.body.classList.add('state-failed');
  } else if (timeLeft <= 4) {
    dom.body.classList.add('state-panic');
  } else if (timeLeft <= 8) {
    dom.body.classList.add('state-warning');
  }
}

function setStatus(message, type = 'info') {
  if (!dom.statusMessage) return;
  dom.statusMessage.textContent = message;
  dom.statusMessage.className = `status-readout ${type}`;
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
    if (dom.modeLabel) dom.modeLabel.textContent = 'ALL TABS';
  } else {
    if (dom.modeLabel) dom.modeLabel.textContent = 'SOCIAL ONLY';
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
      setStatus(`ERROR // PENALTY APPLIED: -${penalty}s`, 'error');

      triggerErrorShake();

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
      syncUI();
      handleExecutionAndShameScreen();
      break;
  }
}

function triggerErrorShake() {
  const targetEl = dom.inputWrapper || dom.answerInput;
  if (!targetEl) return;

  targetEl.classList.remove('error-shake');
  void targetEl.offsetWidth;
  targetEl.classList.add('error-shake');

  setTimeout(() => {
    targetEl.classList.remove('error-shake');
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
// 12. Post-Mortem Shame Screen & Harassment Sequence (Milestone 5.1)
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

function calculateHumiliationRating(streak) {
  if (streak <= 2) return 'SINGLE-CELL ATTENTION';
  if (streak <= 6) return 'DISTRACTED AMATEUR';
  return 'ALMOST HUMAN';
}

/**
 * Orchestrates the full post-mortem failure sequence:
 * 1. Capture target tab details.
 * 2. Close active tab via Chrome API.
 * 3. Start 5-second acoustic harassment siren.
 * 4. Render Shame Overlay with obituary, fatal recap, and lockout timer.
 */
function handleExecutionAndShameScreen() {
  if (dom.answerInput) dom.answerInput.disabled = true;
  if (dom.submitBtn) dom.submitBtn.disabled = true;

  // 1. Query target tab immediately
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let deceasedTitle = 'Distracting Browser Tab';
      let deceasedDomain = 'web.page';
      let targetTabId = null;
      let shouldTerminate = true;

      if (tabs && tabs.length > 0 && tabs[0]) {
        const activeTab = tabs[0];
        targetTabId = activeTab.id;
        deceasedTitle = activeTab.title || 'Untitled Tab';

        try {
          deceasedDomain = new URL(activeTab.url).hostname || activeTab.url;
        } catch {
          deceasedDomain = activeTab.url || 'browser-tab';
        }

        if (isProtectedUrl(activeTab.url)) {
          shouldTerminate = false;
        } else if (!isDemoMode && !isTargetDistraction(activeTab.url)) {
          shouldTerminate = false;
        }
      }

      // Populate Shame Screen DOM
      populateShameScreen(deceasedTitle, deceasedDomain);

      // Trigger Tab Closure after slight delay
      if (shouldTerminate && targetTabId) {
        setTimeout(() => {
          chrome.tabs.remove(targetTabId, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.warn('Tab termination notice:', chrome.runtime.lastError.message);
            }
          });
        }, CONFIG.EXECUTION_DELAY_MS);
      }
    });
  } else {
    populateShameScreen('Test Browser Tab', 'example.com');
  }

  // 2. Start 5-second multi-oscillator harassment siren
  if (window.AudioHarassment) {
    window.AudioHarassment.startAcousticHarassmentSiren();
  }

  // 3. Show Shame Screen Overlay
  if (dom.shameOverlay) {
    dom.shameOverlay.classList.remove('hidden');
  }

  // 4. Start 5-second unskippable lockout countdown
  startLockoutCountdown();
}

function populateShameScreen(title, domain) {
  if (dom.deceasedTabTitle) dom.deceasedTabTitle.textContent = title;
  if (dom.deceasedTabDomain) dom.deceasedTabDomain.textContent = domain;

  if (dom.lethalEquationRecap) {
    dom.lethalEquationRecap.textContent = `${currentProblem.displayString.replace(/\n/g, ' ')} = ${currentProblem.solution}`;
  }

  if (dom.userEntryRecap) {
    dom.userEntryRecap.textContent = `YOU ENTERED: ${lastEnteredValue}`;
  }

  if (dom.shameStreakDisplay) {
    dom.shameStreakDisplay.textContent = `${streakCounter} STREAK`;
  }

  if (dom.shameRatingDisplay) {
    dom.shameRatingDisplay.textContent = calculateHumiliationRating(streakCounter);
  }

  if (dom.shameQuoteDisplay) {
    const randomQuote = MOCKERY_QUOTES[Math.floor(Math.random() * MOCKERY_QUOTES.length)];
    dom.shameQuoteDisplay.textContent = randomQuote;
  }
}

function startLockoutCountdown() {
  let lockoutSeconds = CONFIG.LOCKOUT_SECONDS;
  isLockoutActive = true;

  if (dom.lockoutTimerDisplay) {
    dom.lockoutTimerDisplay.classList.remove('hidden', 'redemption-ready');
    dom.lockoutTimerDisplay.textContent = `PUNISHMENT LOCKOUT: 0${lockoutSeconds}s`;
  }

  if (dom.shameRetryBtn) {
    dom.shameRetryBtn.classList.add('hidden');
    dom.shameRetryBtn.disabled = true;
  }

  clearInterval(lockoutTimer);
  lockoutTimer = setInterval(() => {
    lockoutSeconds -= 1;

    if (lockoutSeconds <= 0) {
      clearInterval(lockoutTimer);
      isLockoutActive = false;

      if (dom.lockoutTimerDisplay) {
        dom.lockoutTimerDisplay.textContent = 'SYSTEM READY FOR REDEMPTION';
        dom.lockoutTimerDisplay.classList.add('redemption-ready');
      }

      if (dom.shameRetryBtn) {
        dom.shameRetryBtn.classList.remove('hidden');
        dom.shameRetryBtn.disabled = false;
        dom.shameRetryBtn.focus();
      }

      if (window.AudioHarassment) {
        window.AudioHarassment.stopAcousticHarassmentSiren();
      }
    } else {
      if (dom.lockoutTimerDisplay) {
        dom.lockoutTimerDisplay.textContent = `PUNISHMENT LOCKOUT: 0${lockoutSeconds}s`;
      }
    }
  }, 1000);
}

/**
 * Resets the session after the user confesses and clicks retry
 */
function handleShameReset() {
  if (isLockoutActive) return; // Strict lock during punishment cooldown

  if (window.AudioHarassment) {
    window.AudioHarassment.stopAcousticHarassmentSiren();
  }

  if (dom.shameOverlay) {
    dom.shameOverlay.classList.add('hidden');
  }

  resetSessionState();
  lastEnteredValue = '[TIMEOUT]';

  if (dom.answerInput) {
    dom.answerInput.disabled = false;
    dom.answerInput.value = '';
    dom.answerInput.focus();
  }
  if (dom.submitBtn) {
    dom.submitBtn.disabled = false;
  }

  generateAndRenderProblem(0);
  timeLeft = currentProblem.allocatedTime;
  syncUI();

  transitionTo(GameStates.ACTIVE);
  setStatus('SYSTEM RE-ARMED // TIER 1 WARMUP', 'info');
}

// =============================================================================
// 13. User Input Evaluation
// =============================================================================

function handleInputEvaluation(e) {
  if (e) e.preventDefault();

  if (currentState === GameStates.FAILED || isLockoutActive) return;

  if (!dom.answerInput) return;
  const rawInput = dom.answerInput.value.trim();

  if (rawInput === '') return;

  lastEnteredValue = rawInput;

  const cleanInput = rawInput.replace(/[^0-9\-]/g, '');
  const parsedValue = parseInt(cleanInput, 10);

  if (!isNaN(parsedValue) && parsedValue === currentProblem.solution) {
    // ---- Correct Answer ----
    streakCounter += 1;
    saveSessionState();

    generateAndRenderProblem(streakCounter);
    timeLeft = currentProblem.allocatedTime;

    playSuccessChime();
    triggerStreakPop();
    setStatus(`CORRECT // CADENCE RESET (+${currentProblem.allocatedTime}s)`, 'info');

    dom.answerInput.value = '';
    dom.answerInput.focus();

    syncUI();
  } else {
    // ---- Incorrect Answer ----
    dom.answerInput.value = '';
    dom.answerInput.focus();
    transitionTo(GameStates.PENALTY);
  }
}

// =============================================================================
// 14. Initialization (Strict Manifest V3)
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  updateModeDisplay();

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

  if (dom.shameRetryBtn) {
    dom.shameRetryBtn.addEventListener('click', handleShameReset);
  }

  // Keyboard shortcut suppression during punishment lockout
  window.addEventListener('keydown', (e) => {
    if (isLockoutActive) {
      if (['Enter', ' ', 'Escape', 'Tab'].includes(e.key) || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);
});
