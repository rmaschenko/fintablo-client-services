/* ═════ STORAGE · state 48h TTL + UTM first-click ═════ */
(function (global) {
  'use strict';

  const STATE_KEY = 'dg_state_v1';
  const UTM_KEY = 'dg_utm';
  const UTM_FLAG = 'dg_utm_captured';
  const TTL_MS = 48 * 60 * 60 * 1000; // 48 часов

  function captureUTM() {
    try {
      if (sessionStorage.getItem(UTM_FLAG)) return;
      const params = new URLSearchParams(global.location.search);
      const utm = {
        source: params.get('utm_source') || '',
        medium: params.get('utm_medium') || '',
        campaign: params.get('utm_campaign') || '',
        content: params.get('utm_content') || '',
        term: params.get('utm_term') || '',
        referrer: document.referrer || '',
        pageUrl: global.location.href,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      sessionStorage.setItem(UTM_FLAG, '1');
    } catch (e) { /* privacy mode */ }
  }

  function getUTM() {
    try {
      const raw = sessionStorage.getItem(UTM_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveState(state) {
    try {
      const payload = { data: state, ts: Date.now() };
      localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch (e) { /* full quota */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || !payload.ts) return null;
      if (Date.now() - payload.ts > TTL_MS) {
        localStorage.removeItem(STATE_KEY);
        return null;
      }
      return payload;
    } catch (e) { return null; }
  }

  function clearState() {
    try { localStorage.removeItem(STATE_KEY); } catch (e) {}
  }

  function clearAll() {
    clearState();
    try {
      sessionStorage.removeItem(UTM_KEY);
      sessionStorage.removeItem(UTM_FLAG);
    } catch (e) {}
  }

  // Сохранение результатов для передачи в report.html и thankyou.html
  const REPORT_KEY = 'dg_report_data';
  function saveReportData(data) {
    try { sessionStorage.setItem(REPORT_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function loadReportData() {
    try {
      const raw = sessionStorage.getItem(REPORT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function agoText(ts) {
    const delta = Date.now() - ts;
    const mins = Math.round(delta / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return mins + ' мин назад';
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + ' ч назад';
    return Math.round(hours / 24) + ' д назад';
  }

  global.Storage = {
    captureUTM, getUTM,
    saveState, loadState, clearState, clearAll,
    saveReportData, loadReportData,
    agoText
  };

  // Auto-capture UTM on load
  captureUTM();

})(window);
