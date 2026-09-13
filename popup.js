/**
 * Anti-Procrastination Tab Executioner (v4.7.0)
 * Terminal Interceptor GUI Controller & Tab Graveyard Registry
 */

// =============================================================================
// 1. Constants & Mockery Database
// =============================================================================
const CONFIG = Object.freeze({
  COUNTDOWN_INTERVAL_MS: 1000,
  SHAKE_DURATION_MS: 300,
  EXECUTION_DELAY_MS: 300,
  TIER_POP_DURATION_MS: 250,
  LOCKOUT_SECONDS: 7,
  ESCAPE_PENALTY_SECONDS: 4
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
let isExemptFromEscape = false;
let pendingTargetTabId = null;
let pendingShouldTerminate = false;
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
    mainContainer: document.getElementById('main-container'),
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
    openGraveyardBtn: document.getElementById('open-graveyard-btn'),
    inputWrapper: document.getElementById('input-wrapper'),
    answerForm: document.getElementById('answer-form'),
    statusDot: document.getElementById('status-dot'),
    
    // Shame Screen & Liquidation Overlay Elements
    shameOverlay: document.getElementById('shame-overlay'),
    deceasedTabTitle: document.getElementById('deceased-tab-title'),
    deceasedTabDomain: document.getElementById('deceased-tab-domain'),
    lethalEquationRecap: document.getElementById('lethal-equation-recap'),
    userEntryRecap: document.getElementById('user-entry-recap'),
    shameStreakDisplay: document.getElementById('shame-streak-display'),
    shameRatingDisplay: document.getElementById('shame-rating-display'),
    shameQuoteDisplay: document.getElementById('shame-quote-display'),
    shameGraveyardBtn: document.getElementById('shame-graveyard-btn'),
    liquidationHud: document.getElementById('liquidation-hud'),
    liquidationTimer: document.getElementById('liquidation-timer')
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
  if (currentProblem.displayHtml) {
    dom.problemDisplay.innerHTML = currentProblem.displayHtml;
  } else {
    dom.problemDisplay.textContent = currentProblem.displayString;
  }
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
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'UPDATE_SESSION_STATUS', active: false });
      }
      break;

    case GameStates.ACTIVE:
      startTimerLoop();
      syncUI();
      if (dom.answerInput) dom.answerInput.focus();
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const msg = { type: 'UPDATE_SESSION_STATUS', active: true };
        if (pendingTargetTabId) {
          msg.targetTabId = pendingTargetTabId;
        }
        chrome.runtime.sendMessage(msg);
      }
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
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'UPDATE_SESSION_STATUS', active: true });
      }
      handleExecutionAndShameScreen();
      break;
  }
}

/**
 * Handles attempted user evasion / window blur during active countdown
 */
function handleEscapeAttempt() {
  if (currentState !== GameStates.ACTIVE || isLockoutActive || isExemptFromEscape) return;

  const penalty = CONFIG.ESCAPE_PENALTY_SECONDS || 4;
  timeLeft = Math.max(0, timeLeft - penalty);
  syncUI();

  setStatus(`ATTEMPTED ESCAPE DETECTED // -${penalty}s PENALTY APPLIED`, 'alert');
  triggerErrorShake();

  // Dispatch immediate re-focus request to background service worker
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'REFOCUS_WINDOW' }, () => {
      if (chrome.runtime.lastError) {
        // Ignore
      }
    });
  }

  if (timeLeft <= 0) {
    timeLeft = 0;
    syncUI();
    transitionTo(GameStates.FAILED);
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
 * 1. Read cached target tab details from background/storage.
 * 2. Mute background audio.
 * 3. Start 7-second acoustic harassment siren.
 * 4. Render Shame Overlay with obituary, fatal recap, and 7s countdown.
 */
function handleExecutionAndShameScreen() {
  if (dom.answerInput) dom.answerInput.disabled = true;
  if (dom.submitBtn) dom.submitBtn.disabled = true;

  // 1. Reset streak in storage immediately so future launches always start fresh at Tier 1
  resetSessionState();

  // 2. Query target tab from storage & background service worker
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['targetTabId', 'targetTabInfo'], (res) => {
      let deceasedTitle = 'Distracting Browser Tab';
      let deceasedDomain = 'web.page';
      let deceasedUrl = 'https://distraction.target';

      if (res && res.targetTabInfo) {
        deceasedTitle = res.targetTabInfo.title || 'Distracting Tab';
        deceasedUrl = res.targetTabInfo.url || 'https://distraction.target';
        try {
          deceasedDomain = new URL(res.targetTabInfo.url).hostname || res.targetTabInfo.url;
        } catch {
          deceasedDomain = res.targetTabInfo.url || 'browser-tab';
        }
      }

      if (res && res.targetTabId) {
        pendingTargetTabId = res.targetTabId;
        pendingShouldTerminate = true;

        // Mute active tab immediately to silence background audio during harassment siren
        try {
          chrome.tabs.update(pendingTargetTabId, { muted: true }, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              // Ignore
            }
          });
        } catch (e) {
          // Ignore
        }
      }

      // Log obituary record to Tab Graveyard & Cognitive Debt Registry
      if (window.GraveyardRecorder) {
        const tierLabel = dom.tierText ? dom.tierText.textContent : `TIER ${currentProblem.tierLevel || 1}`;
        window.GraveyardRecorder.recordCasualty({
          title: deceasedTitle,
          url: deceasedUrl,
          domain: deceasedDomain,
          fatalEquation: currentProblem.displayString,
          userAnswer: lastEnteredValue,
          correctAnswer: currentProblem.solution,
          tierAtDeath: tierLabel,
          wasCamouflaged: Boolean(currentProblem.isCamouflaged),
          streak: streakCounter
        });
      }

      // Populate Shame Screen DOM
      populateShameScreen(deceasedTitle, deceasedDomain);
    });
  } else {
    // Local / fallback recording
    if (window.GraveyardRecorder) {
      window.GraveyardRecorder.recordCasualty({
        title: 'Test Browser Tab',
        url: 'https://example.com/distraction',
        domain: 'example.com',
        fatalEquation: currentProblem.displayString,
        userAnswer: lastEnteredValue,
        correctAnswer: currentProblem.solution,
        tierAtDeath: 'TIER 1 // WARMUP',
        wasCamouflaged: Boolean(currentProblem.isCamouflaged),
        streak: streakCounter
      });
    }
    populateShameScreen('Test Browser Tab', 'example.com');
  }

  // 3. Start 7-second multi-oscillator harassment siren
  if (window.AudioHarassment) {
    window.AudioHarassment.startAcousticHarassmentSiren();
  }

  // 4. Show Shame Screen Overlay
  if (dom.shameOverlay) {
    dom.shameOverlay.classList.remove('hidden');
  }

  // 5. Start 7-second mandatory liquidation countdown
  startLiquidationCountdown();
}

function populateShameScreen(title, domain) {
  if (dom.deceasedTabTitle) dom.deceasedTabTitle.textContent = title;
  if (dom.deceasedTabDomain) dom.deceasedTabDomain.textContent = domain;

  if (dom.lethalEquationRecap) {
    if (currentProblem.isCamouflaged) {
      const visibleClean = (currentProblem.visibleDisplay || currentProblem.displayString).replace(/\n/g, ' ');
      dom.lethalEquationRecap.innerHTML = `
        <div class="trap-reveal-row">
          <div class="visible-part">Visible: ${visibleClean} = ${currentProblem.visibleSolution}</div>
          <div class="actual-part">ACTUAL: ${visibleClean} <span class="phantom-revealed">[${currentProblem.phantomTerm} HIDDEN]</span> = ${currentProblem.solution}</div>
          <div class="sabotage-badge">☣️ SABOTAGE PROTOCOL ACTIVATED // CAMOUFLAGE TRAP TRIGGERED</div>
        </div>
      `;
    } else {
      dom.lethalEquationRecap.textContent = `${currentProblem.displayString.replace(/\n/g, ' ')} = ${currentProblem.solution}`;
    }
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

/**
 * Executes the mandatory 7-second liquidation countdown followed by auto-purge & window close
 */
function startLiquidationCountdown() {
  let liquidationSeconds = CONFIG.LOCKOUT_SECONDS || 7;
  isLockoutActive = true;

  if (dom.liquidationTimer) {
    dom.liquidationTimer.classList.remove('liquidation-executing');
    dom.liquidationTimer.textContent = `0${liquidationSeconds}s`;
  }

  clearInterval(lockoutTimer);
  lockoutTimer = setInterval(() => {
    liquidationSeconds -= 1;

    if (liquidationSeconds <= 0) {
      clearInterval(lockoutTimer);
      isLockoutActive = false;

      // Silence harassment siren
      if (window.AudioHarassment) {
        window.AudioHarassment.stopAcousticHarassmentSiren();
      }

      // Display terminal execution badge
      if (dom.liquidationTimer) {
        dom.liquidationTimer.textContent = 'EXECUTING TERMINATION...';
        dom.liquidationTimer.classList.add('liquidation-executing');
      }

      // Ensure storage is fully reset
      resetSessionState();

      // Mandatory Auto-Purge: Destroy target tab and close execution window
      setTimeout(() => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'TERMINATE_TARGET_TAB', targetTabId: pendingTargetTabId }, () => {
            window.close();
          });
        } else if (pendingTargetTabId && typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.remove(pendingTargetTabId, () => {
            window.close();
          });
        } else {
          window.close();
        }
      }, 250);
    } else {
      if (dom.liquidationTimer) {
        dom.liquidationTimer.textContent = `0${liquidationSeconds}s`;
      }
    }
  }, 1000);
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

  // Retrieve initial target tab info if launched via background window controller
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'GET_TARGET_TAB' }, (res) => {
      if (res && res.targetTabId) {
        pendingTargetTabId = res.targetTabId;
        pendingShouldTerminate = true;
      }
    });
  }

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

  function openGraveyardDashboard() {
    isExemptFromEscape = true;
    setTimeout(() => { isExemptFromEscape = false; }, 3000);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_GRAVEYARD' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          if (chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: chrome.runtime.getURL('graveyard.html') });
          } else if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            window.open('graveyard.html', '_blank');
          }
        }
      });
    } else if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('graveyard.html') });
    } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('graveyard.html', '_blank');
    }
  }

  if (dom.openGraveyardBtn) {
    dom.openGraveyardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openGraveyardDashboard();
    });
  }

  if (dom.shameGraveyardBtn) {
    dom.shameGraveyardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openGraveyardDashboard();
    });
  }

  if (dom.answerForm) {
    dom.answerForm.addEventListener('submit', handleInputEvaluation);
  }
  if (dom.submitBtn) {
    dom.submitBtn.addEventListener('click', handleInputEvaluation);
  }

  // Pointer Capture & Full-Window Shield (ignores interactive UI elements)
  if (dom.mainContainer) {
    dom.mainContainer.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, form, a, [role="button"], .mode-chip, .tier-ribbon, .graveyard-btn, .shame-graveyard-link')) {
        return;
      }
      try {
        if (dom.mainContainer.setPointerCapture) {
          dom.mainContainer.setPointerCapture(e.pointerId);
        }
      } catch (err) {
        // Ignore
      }
    });
  }

  // Right-click context menu suppression
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Aggressive Window Blur Trapping (Defiance Evasion Penalty)
  window.addEventListener('blur', () => {
    handleEscapeAttempt();
  });

  // Keyboard shortcut suppression and full input consumption during liquidation
  window.addEventListener('keydown', (e) => {
    if (isLockoutActive || currentState === GameStates.FAILED) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Intercept escape combinations (Ctrl+W, Ctrl+R, F5, F12)
    const isEscapeKey =
      (e.ctrlKey || e.metaKey) && ['w', 'W', 'r', 'R', 'q', 'Q'].includes(e.key) ||
      e.key === 'F5' ||
      e.key === 'F12';

    if (isEscapeKey && currentState === GameStates.ACTIVE) {
      e.preventDefault();
      e.stopPropagation();
      handleEscapeAttempt();
    }
  }, true);
});
