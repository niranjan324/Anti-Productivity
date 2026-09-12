/**
 * Anti-Procrastination Tab Executioner (v4.3.0)
 * background.js - Window Lockdown Controller, Focus Trap, and Defiance Engine
 */

let activeExecutionWindowId = null;
let targetTabId = null;
let targetTabInfo = { title: 'Distracting Tab', url: 'web.page' };
let isSessionActive = false;

// =============================================================================
// 1. Standalone Panel Window Spawning
// =============================================================================

chrome.action.onClicked.addListener(async (tab) => {
  // 1. Check if an execution window is already open
  if (activeExecutionWindowId !== null) {
    try {
      const existingWin = await chrome.windows.get(activeExecutionWindowId);
      if (existingWin) {
        await chrome.windows.update(activeExecutionWindowId, { focused: true, drawAttention: true });
        return;
      }
    } catch (e) {
      // Window no longer exists, proceed to create new
      activeExecutionWindowId = null;
    }
  }

  // 2. Capture target tab details before opening the panel
  if (tab && tab.id) {
    targetTabId = tab.id;
    targetTabInfo = {
      title: tab.title || 'Untitled Tab',
      url: tab.url || 'browser-tab'
    };
  } else {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      targetTabId = activeTab.id;
      targetTabInfo = {
        title: activeTab.title || 'Untitled Tab',
        url: activeTab.url || 'browser-tab'
      };
    }
  }

  // Persist target info into storage for session resilience
  await chrome.storage.local.set({
    targetTabId,
    targetTabInfo,
    isSessionActive: true
  });

  isSessionActive = true;

  // 3. Spawn dedicated unescapable panel window
  chrome.windows.create(
    {
      url: 'popup.html',
      type: 'popup',
      width: 360,
      height: 540,
      focused: true,
      top: 100,
      left: 100
    },
    (win) => {
      if (win) {
        activeExecutionWindowId = win.id;
      }
    }
  );
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
      sendResponse({ targetTabId, targetTabInfo });
      break;

    case 'UPDATE_SESSION_STATUS':
      isSessionActive = Boolean(message.active);
      if (message.targetTabId !== undefined) {
        targetTabId = message.targetTabId;
      }
      if (message.targetTabInfo !== undefined) {
        targetTabInfo = message.targetTabInfo;
      }
      chrome.storage.local.set({ isSessionActive, targetTabId, targetTabInfo });
      sendResponse({ status: 'ok' });
      break;

    case 'TERMINATE_TARGET_TAB':
      if (targetTabId) {
        const tabToKill = targetTabId;
        targetTabId = null;
        chrome.tabs.remove(tabToKill, () => {
          if (chrome.runtime.lastError) {
            console.warn('Target tab termination notice:', chrome.runtime.lastError.message);
          }
        });
      }
      sendResponse({ status: 'terminated' });
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
// 3. Aggressive Window Focus Guard
// =============================================================================

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (isSessionActive && activeExecutionWindowId !== null) {
    // If focus shifted to any other window while the math session is active, yank focus back
    if (windowId !== activeExecutionWindowId && windowId !== chrome.windows.WINDOW_ID_NONE) {
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
    chrome.storage.local.set({ isSessionActive: false, targetTabId: null });
  }
});
