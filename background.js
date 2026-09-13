/**
 * Anti-Procrastination Tab Executioner (v4.9.0)
 * background.js - Window Lockdown Controller, Focus Trap, Auto-Interception, and Defiance Engine
 */

let activeExecutionWindowId = null;
let targetTabId = null;
let targetTabInfo = { title: 'Distracting Tab', url: 'web.page' };
let isSessionActive = false;
let isSpawning = false;

const PROTECTED_PROTOCOLS = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'chrome-search://',
  'chrome-untrusted://',
  'view-source:'
];

/**
 * Checks whether a given URL is a browser-protected page or empty scheme.
 * @param {string} url
 * @returns {boolean}
 */
function isProtectedUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'about:blank') return true;
  return PROTECTED_PROTOCOLS.some((proto) => trimmed.startsWith(proto));
}

// =============================================================================
// 1. Standalone Panel Window Spawning & Auto-Interception Engine
// =============================================================================

/**
 * Programmatically spawns the unescapable executioner popup window targeting an unprotected tab
 * @param {chrome.tabs.Tab} tab
 */
async function launchExecutionWindow(tab) {
  if (isSpawning) return;

  // 1. Check if an execution window is already open
  if (activeExecutionWindowId !== null) {
    try {
      const existingWin = await chrome.windows.get(activeExecutionWindowId);
      if (existingWin) {
        await chrome.windows.update(activeExecutionWindowId, { focused: true, drawAttention: true });
        return;
      }
    } catch (e) {
      activeExecutionWindowId = null;
    }
  }

  // 2. Validate target tab
  if (!tab || !tab.id || isProtectedUrl(tab.url || tab.pendingUrl)) {
    return;
  }

  isSpawning = true;
  try {
    targetTabId = tab.id;
    targetTabInfo = {
      title: tab.title || 'Distracting Tab',
      url: tab.url || 'web.page'
    };

    isSessionActive = true;

    // Reset streak state to 0 for a fresh run and persist target info into storage
    await chrome.storage.local.set({
      targetTabId,
      targetTabInfo,
      savedStreak: 0,
      isSessionActive: true
    });

    // 3. Spawn dedicated unescapable panel window
    const win = await chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 360,
      height: 540,
      focused: true,
      top: 100,
      left: 100
    });

    if (win) {
      activeExecutionWindowId = win.id;
    }
  } catch (err) {
    console.warn('Failed to launch execution window:', err);
    isSessionActive = false;
  } finally {
    isSpawning = false;
  }
}

// Manual Click Action Trigger
chrome.action.onClicked.addListener(async (tab) => {
  let targetTab = tab;
  if (!targetTab || !targetTab.id || isProtectedUrl(targetTab.url)) {
    const normalWindows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    if (normalWindows && normalWindows.length > 0) {
      const focusedWin = normalWindows.find((w) => w.focused) || normalWindows[0];
      const active = focusedWin?.tabs?.find((t) => t.active);
      if (active && !isProtectedUrl(active.url)) {
        targetTab = active;
      }
    }
  }

  if (targetTab && !isProtectedUrl(targetTab.url)) {
    await launchExecutionWindow(targetTab);
  }
});

// Auto-Interception on Navigation / URL Update
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab || !tab.active) return;
  if (changeInfo.status !== 'complete' && !changeInfo.url) return;
  if (isSessionActive || activeExecutionWindowId !== null) return;

  const url = changeInfo.url || tab.url;
  if (isProtectedUrl(url)) return;

  try {
    const win = await chrome.windows.get(tab.windowId);
    if (win && win.type === 'normal') {
      await launchExecutionWindow(tab);
    }
  } catch (e) {
    // Window inaccessible
  }
});

// Auto-Interception on Active Tab Switching
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (isSessionActive || activeExecutionWindowId !== null) return;

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab || isProtectedUrl(tab.url || tab.pendingUrl)) return;

    const win = await chrome.windows.get(activeInfo.windowId);
    if (win && win.type === 'normal') {
      await launchExecutionWindow(tab);
    }
  } catch (e) {
    // Tab or window inaccessible
  }
});

// Reset target tab tracking if closed by user
chrome.tabs.onRemoved.addListener((closedTabId) => {
  if (closedTabId === targetTabId) {
    targetTabId = null;
  }
});

// Installation & Initial State Reset
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    isSessionActive: false,
    targetTabId: null,
    savedStreak: 0
  });
});

// =============================================================================
// 2. Runtime Messaging Interceptor (Focus Trapping & Session Sync)
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'REFOCUS_WINDOW':
      if (activeExecutionWindowId !== null) {
        chrome.windows.update(activeExecutionWindowId, { focused: true, drawAttention: true }, () => {
          if (chrome.runtime.lastError) {
            // Non-fatal
          }
        });
      }
      sendResponse({ status: 'ok' });
      break;

    case 'GET_TARGET_TAB':
      (async () => {
        if (!targetTabId) {
          const res = await chrome.storage.local.get(['targetTabId', 'targetTabInfo']);
          if (res && res.targetTabId) {
            targetTabId = res.targetTabId;
            targetTabInfo = res.targetTabInfo || targetTabInfo;
          }
        }
        sendResponse({ targetTabId, targetTabInfo });
      })();
      return true;

    case 'UPDATE_SESSION_STATUS':
      isSessionActive = Boolean(message.active);
      if (message.targetTabId) {
        targetTabId = message.targetTabId;
      }
      if (message.targetTabInfo) {
        targetTabInfo = message.targetTabInfo;
      }
      chrome.storage.local.set({ isSessionActive, targetTabId, targetTabInfo });
      sendResponse({ status: 'ok' });
      break;

    case 'TERMINATE_TARGET_TAB':
      (async () => {
        let tabToKill = message.targetTabId || targetTabId;
        if (!tabToKill) {
          const res = await chrome.storage.local.get(['targetTabId']);
          tabToKill = res ? res.targetTabId : null;
        }

        // Fallback: locate active tab in the main normal window
        if (!tabToKill) {
          const normalWindows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
          if (normalWindows && normalWindows.length > 0) {
            const focusedWin = normalWindows.find((w) => w.focused) || normalWindows[0];
            const active = focusedWin?.tabs?.find((t) => t.active);
            if (active && !isProtectedUrl(active.url)) {
              tabToKill = active.id;
            }
          }
        }

        if (tabToKill) {
          chrome.tabs.remove(tabToKill, () => {
            if (chrome.runtime.lastError) {
              console.warn('Target tab termination notice:', chrome.runtime.lastError.message);
            }
          });
        }

        // Reset session state and streak storage for next time
        targetTabId = null;
        isSessionActive = false;
        await chrome.storage.local.set({ isSessionActive: false, targetTabId: null, savedStreak: 0 });
        sendResponse({ status: 'terminated' });
      })();
      return true;

    case 'OPEN_GRAVEYARD':
      chrome.tabs.create({ url: chrome.runtime.getURL('graveyard.html') }, (tab) => {
        if (tab && tab.windowId) {
          chrome.windows.update(tab.windowId, { focused: true });
        }
      });
      sendResponse({ status: 'ok' });
      break;

    case 'CLOSE_EXECUTION_WINDOW':
      isSessionActive = false;
      if (activeExecutionWindowId !== null) {
        chrome.windows.remove(activeExecutionWindowId, () => {
          activeExecutionWindowId = null;
          if (chrome.runtime.lastError) {
            // Ignore
          }
        });
      }
      sendResponse({ status: 'closed' });
      break;
  }
  return true;
});

// =============================================================================
// 3. Aggressive Window Focus Guard (With Graveyard Exception)
// =============================================================================

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (isSessionActive && activeExecutionWindowId !== null) {
    if (windowId !== activeExecutionWindowId && windowId !== chrome.windows.WINDOW_ID_NONE) {
      try {
        const win = await chrome.windows.get(windowId, { populate: true });
        const activeTab = win?.tabs?.find((t) => t.active);
        if (activeTab && activeTab.url && activeTab.url.includes('graveyard.html')) {
          // User is intentionally reviewing the Tab Graveyard, permit focus
          return;
        }
      } catch (e) {
        // Ignore
      }

      chrome.windows.update(activeExecutionWindowId, { focused: true, drawAttention: true }, () => {
        if (chrome.runtime.lastError) {
          // Window may be closed
        }
      });
    }
  }
});

// =============================================================================
// 4. Defiance Tab Termination Fallback (Anti-Shortcut Escape)
// =============================================================================

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === activeExecutionWindowId) {
    // If the executioner window was closed while a session was actively in progress,
    // execute the target tab anyway as an act of defiance!
    if (isSessionActive && targetTabId) {
      chrome.tabs.remove(targetTabId, () => {
        if (chrome.runtime.lastError) {
          console.warn('Defiance termination fallback:', chrome.runtime.lastError.message);
        }
      });
    }

    activeExecutionWindowId = null;
    isSessionActive = false;
    targetTabId = null;
    chrome.storage.local.set({ isSessionActive: false, targetTabId: null, savedStreak: 0 });
  }
});
