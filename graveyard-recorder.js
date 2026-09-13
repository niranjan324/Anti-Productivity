/**
 * Anti-Procrastination Tab Executioner (v4.7.0)
 * graveyard-recorder.js - Persistent Casualty Logger & Cognitive Debt Tracker
 */

(function () {
  'use strict';

  const STORAGE_KEY_RECORDS = 'tab_graveyard_records';
  const STORAGE_KEY_STATS = 'graveyard_stats';
  const MAX_RECORDS = 100;

  /**
   * Sanitizes strings to prevent formatting anomalies and limit length
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  function sanitizeString(str, maxLen = 60) {
    if (!str || typeof str !== 'string') return 'Unknown Browser Tab';
    const clean = str.replace(/[\r\n\t]+/g, ' ').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen - 3) + '...' : clean;
  }

  /**
   * Extracts domain hostname cleanly
   * @param {string} urlStr
   * @returns {string}
   */
  function extractDomain(urlStr) {
    if (!urlStr) return 'web.page';
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.replace(/^www\./, '') || urlStr;
    } catch {
      return urlStr.replace(/^https?:\/\//, '').split('/')[0] || 'web.page';
    }
  }

  /**
   * Derives an operator / problem archetype for leaderboard statistics
   * @param {string} equation
   * @returns {string}
   */
  function classifyEquationType(equation) {
    if (!equation) return 'Arithmetic';
    if (equation.includes('det') || equation.includes('[')) return 'Matrix Det';
    if (equation.includes('mod')) return 'Modulo';
    if (equation.includes('√') || equation.includes('²')) return 'Powers/Roots';
    if (equation.includes('Solve x') || equation.includes('x')) return 'Algebra';
    if (equation.includes('×')) return 'Multiplication';
    if (equation.includes('-')) return 'Subtraction';
    if (equation.includes('+')) return 'Addition';
    if (equation.includes('0x') || equation.includes('₂')) return 'Base Conv';
    return 'Arithmetic';
  }

  /**
   * Estimates cognitive debt (minutes wasted on tab before execution)
   * @param {number} streak
   * @returns {number}
   */
  function calculateDebtMinutes(streak = 0) {
    // Base procrastination session: 8 - 25 minutes + factor of survived streak
    const base = Math.floor(Math.random() * 18) + 8;
    const streakBonus = Math.min(30, streak * 3);
    return base + streakBonus;
  }

  /**
   * Records a liquidated tab casualty to chrome.storage.local
   * @param {Object} casualtyInfo
   * @param {Function} [callback]
   */
  function recordCasualty(casualtyInfo, callback) {
    const title = sanitizeString(casualtyInfo.title || 'Distracting Browser Tab', 60);
    const rawUrl = casualtyInfo.url || 'https://distraction.target';
    const domain = extractDomain(rawUrl);
    const fatalEquation = (casualtyInfo.fatalEquation || 'Unknown Calculation').replace(/\n/g, ' ');
    const userAnswer = casualtyInfo.userAnswer !== undefined && casualtyInfo.userAnswer !== '' 
      ? String(casualtyInfo.userAnswer) 
      : '[TIMEOUT]';
    const correctAnswer = casualtyInfo.correctAnswer !== undefined ? casualtyInfo.correctAnswer : 0;
    const tierAtDeath = casualtyInfo.tierAtDeath || 'TIER 1 // WARMUP';
    const wasCamouflaged = Boolean(casualtyInfo.wasCamouflaged);
    const streakAtDeath = typeof casualtyInfo.streak === 'number' ? casualtyInfo.streak : 0;
    const timeAliveEstimateMinutes = calculateDebtMinutes(streakAtDeath);
    const executionMode = casualtyInfo.executionMode || 'DIRECT';

    const casualtyRecord = {
      id: `cas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      title,
      url: rawUrl,
      domain,
      fatalEquation,
      userAnswer,
      correctAnswer,
      tierAtDeath,
      wasCamouflaged,
      timeAliveEstimateMinutes,
      streakAtDeath,
      executionMode
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY_RECORDS, STORAGE_KEY_STATS], (result) => {
        let records = Array.isArray(result[STORAGE_KEY_RECORDS]) ? result[STORAGE_KEY_RECORDS] : [];
        let stats = result[STORAGE_KEY_STATS] || {
          totalTabsPurged: 0,
          accumulatedCognitiveDebtMinutes: 0,
          fatalProblemLeaderboard: {},
          tierCasualties: {}
        };

        // 1. Prepend record and clamp array to MAX_RECORDS
        records.unshift(casualtyRecord);
        if (records.length > MAX_RECORDS) {
          records = records.slice(0, MAX_RECORDS);
        }

        // 2. Increment aggregate metrics
        stats.totalTabsPurged = (stats.totalTabsPurged || 0) + 1;
        stats.accumulatedCognitiveDebtMinutes = (stats.accumulatedCognitiveDebtMinutes || 0) + timeAliveEstimateMinutes;

        // Operator leaderboard
        const eqType = classifyEquationType(fatalEquation);
        stats.fatalProblemLeaderboard = stats.fatalProblemLeaderboard || {};
        stats.fatalProblemLeaderboard[eqType] = (stats.fatalProblemLeaderboard[eqType] || 0) + 1;

        // Tier casualty tracking
        stats.tierCasualties = stats.tierCasualties || {};
        stats.tierCasualties[tierAtDeath] = (stats.tierCasualties[tierAtDeath] || 0) + 1;

        // 3. Persist back to storage
        chrome.storage.local.set(
          {
            [STORAGE_KEY_RECORDS]: records,
            [STORAGE_KEY_STATS]: stats
          },
          () => {
            if (callback) callback(casualtyRecord);
          }
        );
      });
    } else {
      // Local testing / fallback in non-extension environment
      try {
        const localRecords = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
        localRecords.unshift(casualtyRecord);
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(localRecords.slice(0, MAX_RECORDS)));
      } catch (err) {
        // Ignore
      }
      if (callback) callback(casualtyRecord);
    }
  }

  /**
   * Retrieves all casualty records and aggregate statistics
   * @param {Function} callback (data: { records: Array, stats: Object })
   */
  function getGraveyardData(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY_RECORDS, STORAGE_KEY_STATS], (result) => {
        const records = Array.isArray(result[STORAGE_KEY_RECORDS]) ? result[STORAGE_KEY_RECORDS] : [];
        const stats = result[STORAGE_KEY_STATS] || {
          totalTabsPurged: records.length,
          accumulatedCognitiveDebtMinutes: records.reduce((acc, r) => acc + (r.timeAliveEstimateMinutes || 15), 0),
          fatalProblemLeaderboard: {},
          tierCasualties: {}
        };
        callback({ records, stats });
      });
    } else {
      try {
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS) || '[]');
        const stats = {
          totalTabsPurged: records.length,
          accumulatedCognitiveDebtMinutes: records.reduce((acc, r) => acc + (r.timeAliveEstimateMinutes || 15), 0),
          fatalProblemLeaderboard: {},
          tierCasualties: {}
        };
        callback({ records, stats });
      } catch {
        callback({ records: [], stats: { totalTabsPurged: 0, accumulatedCognitiveDebtMinutes: 0 } });
      }
    }
  }

  /**
   * Wipes the graveyard records and resets all accumulated debt metrics
   * @param {Function} [callback]
   */
  function purgeCemetery(callback) {
    const emptyStats = {
      totalTabsPurged: 0,
      accumulatedCognitiveDebtMinutes: 0,
      fatalProblemLeaderboard: {},
      tierCasualties: {}
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove([STORAGE_KEY_RECORDS, STORAGE_KEY_STATS], () => {
        chrome.storage.local.set(
          {
            [STORAGE_KEY_RECORDS]: [],
            [STORAGE_KEY_STATS]: emptyStats
          },
          () => {
            if (callback) callback();
          }
        );
      });
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_RECORDS);
        localStorage.removeItem(STORAGE_KEY_STATS);
      } catch {
        // Ignore
      }
      if (callback) callback();
    }
  }

  // Expose global interface
  window.GraveyardRecorder = {
    recordCasualty,
    getGraveyardData,
    purgeCemetery,
    classifyEquationType
  };
})();
