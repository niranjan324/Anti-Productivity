/**
 * Anti-Procrastination Tab Executioner (v4.7.0)
 * graveyard.js - Interactive Dashboard Controller & Coroner Analytics Engine
 */

(function () {
  'use strict';

  // State
  let cachedRecords = [];
  let cachedStats = {};
  let currentFilter = 'all';
  let searchQuery = '';

  // DOM Elements
  let dom = {};

  function initDOM() {
    dom = {
      // Hero KPIs
      soulsPurgedVal: document.getElementById('kpi-souls-purged'),
      cognitiveDebtVal: document.getElementById('kpi-cognitive-debt'),
      debtUnit: document.getElementById('kpi-debt-unit'),
      debtSubtitle: document.getElementById('kpi-debt-subtitle'),
      deadliestTierVal: document.getElementById('kpi-deadliest-tier'),
      tierDetail: document.getElementById('kpi-tier-detail'),
      sabotageCountVal: document.getElementById('kpi-sabotage-count'),

      // Controls
      searchInput: document.getElementById('graveyard-search'),
      filterPills: document.querySelectorAll('.filter-pill'),
      countAll: document.getElementById('count-all'),
      countSabotage: document.getElementById('count-sabotage'),
      countTimeout: document.getElementById('count-timeout'),
      countApex: document.getElementById('count-apex'),

      // Actions
      exportJsonBtn: document.getElementById('export-json-btn'),
      exportCsvBtn: document.getElementById('export-csv-btn'),
      openPurgeModalBtn: document.getElementById('open-purge-modal-btn'),

      // Feed & Empty State
      tombstoneFeed: document.getElementById('tombstone-feed'),
      emptyState: document.getElementById('empty-state'),

      // Modal
      purgeModal: document.getElementById('purge-modal'),
      modalCancelBtn: document.getElementById('modal-cancel-btn'),
      modalConfirmPurgeBtn: document.getElementById('modal-confirm-purge-btn')
    };
  }

  /**
   * Formats unix timestamp into standard tactical date/time
   * @param {number} timestamp
   * @returns {string}
   */
  function formatTimestamp(timestamp) {
    if (!timestamp) return 'UNKNOWN TIME';
    const date = new Date(timestamp);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd} · ${hh}:${min}:${ss}`;
  }

  /**
   * Refreshes and recalculates all hero KPI metric cards
   */
  function updateHeroKPIs(records, stats) {
    const totalPurged = stats.totalTabsPurged !== undefined ? stats.totalTabsPurged : records.length;
    if (dom.soulsPurgedVal) {
      dom.soulsPurgedVal.textContent = String(totalPurged).padStart(3, '0');
    }

    // Cognitive Debt calculation
    const totalDebtMins = stats.accumulatedCognitiveDebtMinutes !== undefined 
      ? stats.accumulatedCognitiveDebtMinutes 
      : records.reduce((acc, r) => acc + (r.timeAliveEstimateMinutes || 15), 0);

    if (dom.cognitiveDebtVal) {
      if (totalDebtMins >= 60) {
        const hours = (totalDebtMins / 60).toFixed(1);
        dom.cognitiveDebtVal.textContent = hours;
        if (dom.debtUnit) dom.debtUnit.textContent = 'HOURS';
        if (dom.debtSubtitle) dom.debtSubtitle.textContent = `${totalDebtMins.toLocaleString()} MINUTES OF LIFE RECLAIMED`;
      } else {
        dom.cognitiveDebtVal.textContent = String(totalDebtMins);
        if (dom.debtUnit) dom.debtUnit.textContent = 'MINS';
        if (dom.debtSubtitle) dom.debtSubtitle.textContent = 'ESTIMATED COGNITIVE DEBT RECLAIMED';
      }
    }

    // Deadliest Arithmetic Tier
    let deadliestTier = 'TIER 1';
    let maxCasualties = 0;

    if (stats.tierCasualties && Object.keys(stats.tierCasualties).length > 0) {
      for (const [tier, count] of Object.entries(stats.tierCasualties)) {
        if (count > maxCasualties) {
          maxCasualties = count;
          deadliestTier = tier.replace('//', '•');
        }
      }
    } else if (records.length > 0) {
      const tierCounts = {};
      records.forEach(r => {
        const t = r.tierAtDeath || 'TIER 1';
        tierCounts[t] = (tierCounts[t] || 0) + 1;
        if (tierCounts[t] > maxCasualties) {
          maxCasualties = tierCounts[t];
          deadliestTier = t.replace('//', '•');
        }
      });
    }

    if (dom.deadliestTierVal) {
      dom.deadliestTierVal.textContent = deadliestTier.length > 18 ? deadliestTier.slice(0, 16) + '...' : deadliestTier;
      dom.deadliestTierVal.title = deadliestTier;
    }
    if (dom.tierDetail) {
      dom.tierDetail.textContent = `${maxCasualties} FATAL CALCULATION FAILURES`;
    }

    // Sabotage casualties count
    const sabotageCount = records.filter(r => r.wasCamouflaged).length;
    if (dom.sabotageCountVal) {
      dom.sabotageCountVal.textContent = String(sabotageCount);
    }
  }

  /**
   * Updates pill filter counter badges
   */
  function updateFilterCounts(records) {
    const total = records.length;
    const sabotage = records.filter(r => r.wasCamouflaged).length;
    const timeout = records.filter(r => r.userAnswer === '[TIMEOUT]').length;
    const apex = records.filter(r => (r.tierAtDeath || '').includes('TIER 5') || (r.tierAtDeath || '').includes('APEX')).length;

    if (dom.countAll) dom.countAll.textContent = String(total);
    if (dom.countSabotage) dom.countSabotage.textContent = String(sabotage);
    if (dom.countTimeout) dom.countTimeout.textContent = String(timeout);
    if (dom.countApex) dom.countApex.textContent = String(apex);
  }

  /**
   * Filters and searches record list based on current UI state
   */
  function getFilteredRecords() {
    let list = cachedRecords;

    // Filter pill condition
    if (currentFilter === 'sabotage') {
      list = list.filter(r => r.wasCamouflaged);
    } else if (currentFilter === 'timeout') {
      list = list.filter(r => r.userAnswer === '[TIMEOUT]');
    } else if (currentFilter === 'tier-apex') {
      list = list.filter(r => (r.tierAtDeath || '').includes('TIER 5') || (r.tierAtDeath || '').includes('APEX'));
    }

    // Search query matching
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        const title = (r.title || '').toLowerCase();
        const domain = (r.domain || '').toLowerCase();
        const equation = (r.fatalEquation || '').toLowerCase();
        const tier = (r.tierAtDeath || '').toLowerCase();
        return title.includes(q) || domain.includes(q) || equation.includes(q) || tier.includes(q);
      });
    }

    return list;
  }

  /**
   * Renders the filtered tombstone obituary list into the DOM
   */
  function renderTombstoneFeed() {
    const records = getFilteredRecords();

    if (!dom.tombstoneFeed || !dom.emptyState) return;

    if (records.length === 0) {
      dom.tombstoneFeed.innerHTML = '';
      dom.emptyState.classList.remove('hidden');
      return;
    }

    dom.emptyState.classList.add('hidden');

    const htmlContent = records.map((record) => {
      const formattedDate = formatTimestamp(record.timestamp);
      const isTimeout = record.userAnswer === '[TIMEOUT]';
      const debtMins = record.timeAliveEstimateMinutes || 15;
      const streak = record.streakAtDeath !== undefined ? record.streakAtDeath : 0;
      const cleanUrl = record.url ? record.url.replace(/^https?:\/\//, '') : record.domain;

      const sabotageBadge = record.wasCamouflaged
        ? `<div class="sabotage-flag-badge">☣️ VICTIM OF ADVERSARIAL SABOTAGE (CAMOUFLAGED PHANTOM TERM)</div>`
        : '';

      const modeTag = record.executionMode === 'ROULETTE'
        ? `<span class="mode-tag roulette">🎲 ROULETTE</span>`
        : `<span class="mode-tag direct">🎯 DIRECT</span>`;

      const submittedDisplay = isTimeout
        ? `<span class="highlight-entry">[TIMEOUT // NO INPUT]</span>`
        : `<span class="highlight-entry">${record.userAnswer}</span>`;

      return `
        <article class="tombstone-card" data-id="${record.id}">
          <div class="card-top-row">
            <div class="domain-identity">
              <span class="domain-pill">🌐 ${escapeHtml(record.domain)}</span>
              <span class="death-timestamp">${formattedDate}</span>
            </div>
            <div class="card-meta-tags">
              ${modeTag}
              <span class="debt-badge">+${debtMins}m DEBT</span>
              <span class="streak-tag">STREAK: ${String(streak).padStart(2, '0')}</span>
            </div>
          </div>

          <h3 class="card-main-title">${escapeHtml(record.title)}</h3>
          <div class="url-subtext">${escapeHtml(cleanUrl)}</div>

          <div class="epitaph-box">
            <div class="cause-of-death">
              Defeated by: <strong>${escapeHtml(record.fatalEquation)}</strong> = <span class="highlight-solution">${record.correctAnswer}</span> 
              &nbsp;•&nbsp; Submitted: ${submittedDisplay}
            </div>
            <span class="tier-indicator-pill">${escapeHtml(record.tierAtDeath || 'TIER 1')}</span>
          </div>

          ${sabotageBadge}
        </article>
      `;
    }).join('');

    dom.tombstoneFeed.innerHTML = htmlContent;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Main refresh cycle
   */
  function refreshDashboard() {
    if (window.GraveyardRecorder) {
      window.GraveyardRecorder.getGraveyardData(({ records, stats }) => {
        cachedRecords = records || [];
        cachedStats = stats || {};
        updateHeroKPIs(cachedRecords, cachedStats);
        updateFilterCounts(cachedRecords);
        renderTombstoneFeed();
      });
    }
  }

  // =============================================================================
  // Export Handlers (JSON & CSV)
  // =============================================================================

  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function exportAsJSON() {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      extension: 'Anti-Procrastination Tab Executioner v4.7.0',
      summary: cachedStats,
      totalCasualties: cachedRecords.length,
      casualties: cachedRecords
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(JSON.stringify(exportData, null, 2), `tab-graveyard-coroners-report-${dateStr}.json`, 'application/json');
  }

  function exportAsCSV() {
    if (cachedRecords.length === 0) {
      alert('The cemetery is empty. There are no casualties to export.');
      return;
    }

    const headers = [
      'ID',
      'Timestamp',
      'Date_UTC',
      'Domain',
      'Title',
      'URL',
      'Fatal_Equation',
      'Correct_Answer',
      'User_Answer',
      'Tier_At_Death',
      'Was_Camouflaged',
      'Estimated_Cognitive_Debt_Minutes',
      'Streak_At_Death'
    ];

    const rows = cachedRecords.map(r => [
      `"${r.id || ''}"`,
      r.timestamp || '',
      `"${new Date(r.timestamp).toISOString()}"`,
      `"${(r.domain || '').replace(/"/g, '""')}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.url || '').replace(/"/g, '""')}"`,
      `"${(r.fatalEquation || '').replace(/"/g, '""')}"`,
      r.correctAnswer !== undefined ? r.correctAnswer : '',
      `"${(r.userAnswer || '').replace(/"/g, '""')}"`,
      `"${(r.tierAtDeath || '').replace(/"/g, '""')}"`,
      r.wasCamouflaged ? 'TRUE' : 'FALSE',
      r.timeAliveEstimateMinutes || 15,
      r.streakAtDeath !== undefined ? r.streakAtDeath : 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    triggerDownload(csvContent, `tab-graveyard-coroners-report-${dateStr}.csv`, 'text/csv;charset=utf-8;');
  }

  // =============================================================================
  // Event Listeners
  // =============================================================================

  function bindEvents() {
    // Search input
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTombstoneFeed();
      });
    }

    // Filter pills
    if (dom.filterPills) {
      dom.filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          dom.filterPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          currentFilter = pill.getAttribute('data-filter') || 'all';
          renderTombstoneFeed();
        });
      });
    }

    // Export Buttons
    if (dom.exportJsonBtn) dom.exportJsonBtn.addEventListener('click', exportAsJSON);
    if (dom.exportCsvBtn) dom.exportCsvBtn.addEventListener('click', exportAsCSV);

    // Purge Modal Controls
    if (dom.openPurgeModalBtn) {
      dom.openPurgeModalBtn.addEventListener('click', () => {
        if (dom.purgeModal) dom.purgeModal.classList.remove('hidden');
      });
    }

    if (dom.modalCancelBtn) {
      dom.modalCancelBtn.addEventListener('click', () => {
        if (dom.purgeModal) dom.purgeModal.classList.add('hidden');
      });
    }

    if (dom.purgeModal) {
      dom.purgeModal.addEventListener('click', (e) => {
        if (e.target === dom.purgeModal) {
          dom.purgeModal.classList.add('hidden');
        }
      });
    }

    if (dom.modalConfirmPurgeBtn) {
      dom.modalConfirmPurgeBtn.addEventListener('click', () => {
        if (window.GraveyardRecorder) {
          window.GraveyardRecorder.purgeCemetery(() => {
            if (dom.purgeModal) dom.purgeModal.classList.add('hidden');
            refreshDashboard();
          });
        }
      });
    }
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    bindEvents();
    refreshDashboard();

    // Real-time synchronization when tabs are liquidated
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.tab_graveyard_records || changes.graveyard_stats)) {
          refreshDashboard();
        }
      });
    }
  });
})();
