/**
 * Anti-Procrastination Tab Executioner
 * voice-engine.js - Synthetic TTS Gaslighting & Psychological Harassment Engine (v4.6.0)
 * 
 * Cold, clinical, robotic vocal commentary powered by native chrome.tts API.
 */

(function () {
  'use strict';

  // ===========================================================================
  // 1. Dialogue Trees & Gaslighting Scripts
  // ===========================================================================
  const DIALOGUE_POOLS = Object.freeze({
    TIME_PANIC: [
      'Five seconds remaining. Say goodbye to your tab.',
      'Cognitive collapse imminent.',
      'Calculating your attention deficit. Time is running out.'
    ],
    PENALTY_WRONG_ANSWER: [
      'Incorrect. Elementary arithmetic should not be this challenging.',
      'Five seconds deducted. Your focus is slipping.',
      'A disappointing calculation.'
    ],
    SABOTAGE_TRIGGERED: [
      'Did you miss a variable? How unfortunate.',
      'The equation was clear. Your biological sensors are failing.'
    ],
    LIQUIDATION_START: [
      'Timer expired. Liquidating: {TAB_TITLE}. Defeated by elementary math.'
    ],
    PURGE_COMPLETE: [
      'Tab purged. Return to productive labor.'
    ]
  });

  // ===========================================================================
  // 2. Voice Configuration Profiles
  // ===========================================================================
  const TTS_CONFIG = Object.freeze({
    rate: 0.95,      // Deliberate, clinical, unhurried cadence
    pitch: 0.78,     // Deep, deadpan, authoritative monotone
    lang: 'en-US',
    enqueue: false,  // Cancel ongoing speech for high-priority alerts
    COOLDOWN_MS: 2500 // 2.5s minimum throttle between regular gameplay utterances
  });

  // ===========================================================================
  // 3. State & Throttling
  // ===========================================================================
  let lastSpokenTime = 0;
  let isSpeechActive = false;

  /**
   * Sanitizes tab titles for TTS: removes URLs, protocols, special characters, and truncates
   * @param {string} rawTitle 
   * @returns {string}
   */
  function sanitizeTabTitle(rawTitle) {
    if (!rawTitle || typeof rawTitle !== 'string') {
      return 'Distracting Tab';
    }

    let clean = rawTitle
      .replace(/https?:\/\/[^\s]+/gi, '')
      .replace(/www\.[^\s]+/gi, '')
      .replace(/[^\w\s\-\.\'\"]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      clean = 'Distracting Browser Tab';
    }

    if (clean.length > 30) {
      clean = clean.slice(0, 30).trim();
    }

    return clean;
  }

  /**
   * Selects a random quote from a pool
   * @param {string[]} pool 
   * @returns {string}
   */
  function getRandomQuote(pool) {
    if (!pool || pool.length === 0) return '';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Stops any currently active speech synthesis
   */
  function stopSpeaking() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tts && chrome.tts.stop) {
        chrome.tts.stop();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      // Ignore
    }
    isSpeechActive = false;
  }

  /**
   * Speaks an utterance using native chrome.tts with fallback to Web Speech API
   * @param {string} text 
   * @param {boolean} isUrgent 
   */
  function executeTTS(text, isUrgent = false) {
    if (!text || typeof text !== 'string') return;

    const now = Date.now();
    if (!isUrgent && (now - lastSpokenTime < TTS_CONFIG.COOLDOWN_MS)) {
      return; // Throttled to prevent overlapping chatter
    }

    lastSpokenTime = now;
    stopSpeaking();

    // 1. Primary: Native chrome.tts API
    if (typeof chrome !== 'undefined' && chrome.tts && chrome.tts.speak) {
      try {
        isSpeechActive = true;
        chrome.tts.speak(text, {
          rate: TTS_CONFIG.rate,
          pitch: TTS_CONFIG.pitch,
          lang: TTS_CONFIG.lang,
          enqueue: TTS_CONFIG.enqueue,
          onEvent: (event) => {
            if (event.type === 'end' || event.type === 'interrupted' || event.type === 'cancelled' || event.type === 'error') {
              isSpeechActive = false;
            }
          }
        }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            isSpeechActive = false;
          }
        });
        return;
      } catch (err) {
        isSpeechActive = false;
      }
    }

    // 2. Fallback: Window SpeechSynthesis API
    if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== 'undefined') {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = TTS_CONFIG.rate;
        utterance.pitch = TTS_CONFIG.pitch;
        utterance.lang = TTS_CONFIG.lang;
        utterance.onend = () => { isSpeechActive = false; };
        utterance.onerror = () => { isSpeechActive = false; };
        isSpeechActive = true;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        isSpeechActive = false;
      }
    }
  }

  /**
   * Contextual Dialogue Dispatcher
   * @param {'TIME_PANIC' | 'PENALTY_WRONG_ANSWER' | 'SABOTAGE_TRIGGERED' | 'LIQUIDATION_START' | 'PURGE_COMPLETE'} triggerEvent 
   * @param {Object} [metadata]
   * @param {string} [metadata.tabTitle]
   */
  function speak(triggerEvent, metadata = {}) {
    const pool = DIALOGUE_POOLS[triggerEvent];
    if (!pool) return;

    let text = getRandomQuote(pool);

    if (triggerEvent === 'LIQUIDATION_START') {
      const sanitized = sanitizeTabTitle(metadata.tabTitle);
      text = text.replace('{TAB_TITLE}', sanitized);
    }

    // Critical events bypass standard throttling
    const isCritical = (
      triggerEvent === 'LIQUIDATION_START' ||
      triggerEvent === 'PURGE_COMPLETE' ||
      triggerEvent === 'SABOTAGE_TRIGGERED'
    );

    executeTTS(text, isCritical);
  }

  // ===========================================================================
  // 4. Global API Export
  // ===========================================================================
  const VoiceEngine = {
    speak,
    stop: stopSpeaking,
    sanitizeTabTitle,
    get isSpeaking() {
      return isSpeechActive;
    }
  };

  if (typeof window !== 'undefined') {
    window.VoiceEngine = VoiceEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceEngine;
  }
})();
