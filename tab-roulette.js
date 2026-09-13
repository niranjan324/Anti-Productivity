/**
 * Anti-Procrastination Tab Executioner (v4.8.0)
 * tab-roulette.js - Russian Tab Roulette Engine & Decelerating Slot-Machine Liquidation
 */

(function () {
  'use strict';

  const STORAGE_KEY_MODE = 'execution_mode';
  const PROTECTED_PROTOCOLS = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'chrome-search://', 'devtools://'];

  let currentMode = 'DIRECT'; // 'DIRECT' | 'ROULETTE'
  let cachedCandidateTabs = [];
  let audioContext = null;

  /**
   * Initializes Web Audio Context for low-latency mechanical tick sounds
   */
  function getAudioContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  /**
   * Plays a crisp, short mechanical tick tone (5ms at 1200Hz)
   */
  function playTickSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.005);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.005);
    } catch (e) {
      // Audio tick non-fatal
    }
  }

  /**
   * Checks if a URL is a protected browser internal page
   * @param {string} url
   * @returns {boolean}
   */
  function isProtectedUrl(url) {
    if (!url) return true;
    return PROTECTED_PROTOCOLS.some((prot) => url.startsWith(prot));
  }

  /**
   * Loads persisted execution mode from storage
   * @param {Function} callback
   */
  function loadExecutionMode(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY_MODE], (res) => {
        if (res && (res[STORAGE_KEY_MODE] === 'ROULETTE' || res[STORAGE_KEY_MODE] === 'DIRECT')) {
          currentMode = res[STORAGE_KEY_MODE];
        } else {
          currentMode = 'DIRECT';
        }
        if (callback) callback(currentMode);
      });
    } else {
      if (callback) callback(currentMode);
    }
  }

  /**
   * Toggles execution mode between DIRECT and ROULETTE and persists to storage
   * @param {Function} callback
   */
  function toggleExecutionMode(callback) {
    currentMode = currentMode === 'DIRECT' ? 'ROULETTE' : 'DIRECT';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY_MODE]: currentMode }, () => {
        if (callback) callback(currentMode);
      });
    } else {
      if (callback) callback(currentMode);
    }
  }

  /**
   * Queries all candidate killable tabs across normal browser windows
   * @param {Function} callback (candidateTabs: Array)
   */
  function queryCandidateTabs(callback) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }, (windows) => {
        let pool = [];
        if (windows && windows.length > 0) {
          windows.forEach((win) => {
            if (win.tabs) {
              win.tabs.forEach((t) => {
                if (t.id && !isProtectedUrl(t.url)) {
                  pool.push({
                    id: t.id,
                    title: t.title || 'Untitled Tab',
                    url: t.url || 'https://web.page',
                    windowId: win.id,
                    favIconUrl: t.favIconUrl || ''
                  });
                }
              });
            }
          });
        }

        // Fallback to chrome.tabs.query if windows.getAll was empty
        if (pool.length === 0) {
          chrome.tabs.query({}, (tabs) => {
            if (tabs && tabs.length > 0) {
              pool = tabs.filter((t) => t.id && !isProtectedUrl(t.url)).map((t) => ({
                id: t.id,
                title: t.title || 'Untitled Tab',
                url: t.url || 'https://web.page',
                windowId: t.windowId,
                favIconUrl: t.favIconUrl || ''
              }));
            }
            cachedCandidateTabs = pool;
            callback(pool);
          });
        } else {
          cachedCandidateTabs = pool;
          callback(pool);
        }
      });
    } else {
      const mockPool = [
        { id: 101, title: 'YouTube - Lo-Fi Chill Beats', url: 'https://youtube.com/watch?v=1', windowId: 1 },
        { id: 102, title: 'Reddit: r/ProgrammerHumor', url: 'https://reddit.com/r/ProgrammerHumor', windowId: 1 },
        { id: 103, title: 'Twitch - Live Gaming Stream', url: 'https://twitch.tv/streamer', windowId: 1 },
        { id: 104, title: 'X / Twitter: Endless Feed', url: 'https://x.com/feed', windowId: 1 }
      ];
      cachedCandidateTabs = mockPool;
      callback(mockPool);
    }
  }

  /**
   * Synthesizes robotic speech announcement for victim tab lock-in
   * @param {string} tabTitle
   */
  function speakRouletteLock(tabTitle) {
    const text = `Chamber loaded. Selected tab: ${tabTitle.slice(0, 35)}. Termination in two seconds.`;
    try {
      if (typeof chrome !== 'undefined' && chrome.tts && chrome.tts.speak) {
        chrome.tts.speak(text, {
          rate: 1.05,
          pitch: 0.9,
          volume: 1.0,
          voiceName: 'native'
        });
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      // Non-fatal voice fallback
    }
  }

  /**
   * Executes the 7-second decelerating Russian Roulette shuffler on Shame Screen
   * @param {Object} options
   * @param {HTMLElement} options.titleElement
   * @param {HTMLElement} options.domainElement
   * @param {HTMLElement} options.statusBadgeElement
   * @param {HTMLElement} options.obituaryCardElement
   * @param {Object} [options.fallbackTargetTab]
   * @param {Function} options.onVictimLocked (victimTab)
   * @param {Function} options.onComplete (victimTab)
   */
  function startRouletteSequence(options) {
    const {
      titleElement,
      domainElement,
      statusBadgeElement,
      obituaryCardElement,
      fallbackTargetTab,
      onVictimLocked,
      onComplete
    } = options;

    queryCandidateTabs((candidateTabs) => {
      let pool = candidateTabs;

      // If pool is empty, use fallback foreground tab
      if (pool.length === 0) {
        if (fallbackTargetTab && fallbackTargetTab.id) {
          pool = [fallbackTargetTab];
        } else {
          pool = [{ id: null, title: 'No Killable Tab', url: 'https://browser.tab', domain: 'browser.tab' }];
        }
      }

      // Pick target victim uniformly at random
      const victimIndex = Math.floor(Math.random() * pool.length);
      const victimTab = pool[victimIndex];

      if (statusBadgeElement) {
        statusBadgeElement.classList.remove('hidden');
        statusBadgeElement.textContent = `🎰 ROULETTE CHAMBER ARMED // [${pool.length} TABS AT RISK]`;
        statusBadgeElement.className = 'roulette-status-badge spinning';
      }

      if (obituaryCardElement) {
        obituaryCardElement.classList.add('roulette-shuffling');
      }

      // Deceleration cadence parameters (0.0s -> 4.5s)
      let currentIdx = 0;
      let delay = 80;
      let elapsed = 0;
      let isLocked = false;
      let animationTimer = null;

      function step() {
        if (elapsed >= 4500) {
          // Lock onto chosen victim at t = 4.5s
          isLocked = true;
          clearTimeout(animationTimer);

          // Update DOM to chosen victim
          let domainStr = 'web.page';
          try {
            domainStr = new URL(victimTab.url).hostname || victimTab.url;
          } catch {
            domainStr = victimTab.url || 'browser-tab';
          }

          if (titleElement) titleElement.textContent = victimTab.title;
          if (domainElement) domainElement.textContent = domainStr;

          if (statusBadgeElement) {
            statusBadgeElement.textContent = `ROULETTE LOCKED // TARGET ACQUIRED: ${victimTab.title.slice(0, 30)}`;
            statusBadgeElement.className = 'roulette-status-badge locked';
          }

          if (obituaryCardElement) {
            obituaryCardElement.classList.remove('roulette-shuffling');
            obituaryCardElement.classList.add('roulette-locked-in');
          }

          // Trigger high-stakes lock-in sound & voice announcement
          speakRouletteLock(victimTab.title);

          if (onVictimLocked) onVictimLocked(victimTab);

          // Complete sequence at t = 7.0s (2.5s after lock-in)
          setTimeout(() => {
            if (onComplete) onComplete(victimTab);
          }, 2500);

          return;
        }

        // Shuffle visual tab
        const currentCandidate = pool[currentIdx % pool.length];
        currentIdx++;

        let candidateDomain = 'web.page';
        try {
          candidateDomain = new URL(currentCandidate.url).hostname || currentCandidate.url;
        } catch {
          candidateDomain = currentCandidate.url || 'browser-tab';
        }

        if (titleElement) titleElement.textContent = currentCandidate.title;
        if (domainElement) domainElement.textContent = candidateDomain;

        playTickSound();

        // Incrementally decelerate interval
        if (elapsed < 2000) {
          delay = 80;
        } else if (elapsed < 3200) {
          delay = 160;
        } else if (elapsed < 4000) {
          delay = 320;
        } else {
          delay = 500;
        }

        elapsed += delay;
        animationTimer = setTimeout(step, delay);
      }

      // Begin shuffling loop
      step();
    });
  }

  /**
   * Safely terminates the chosen victim tab, verifying it still exists
   * @param {Object} victimTab
   * @param {Function} callback (success: boolean)
   */
  function terminateVictimTab(victimTab, callback) {
    if (!victimTab || !victimTab.id) {
      if (callback) callback(false);
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // Verify tab still exists before terminating
      chrome.tabs.get(victimTab.id, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          // Tab was already closed or evaded, find another killable tab
          queryCandidateTabs((remaining) => {
            if (remaining && remaining.length > 0) {
              const fallback = remaining[0];
              chrome.tabs.remove(fallback.id, () => {
                if (callback) callback(true, fallback);
              });
            } else {
              if (callback) callback(false, null);
            }
          });
        } else {
          chrome.tabs.remove(victimTab.id, () => {
            if (callback) callback(true, victimTab);
          });
        }
      });
    } else {
      if (callback) callback(true, victimTab);
    }
  }

  // Expose global module interface
  window.TabRoulette = {
    getMode: () => currentMode,
    loadExecutionMode,
    toggleExecutionMode,
    queryCandidateTabs,
    startRouletteSequence,
    terminateVictimTab
  };
})();
