/* ═════ STORAGE · state 48h TTL + UTM ═════ */
(function(global){
  'use strict';
  var MP = global.MoneyProfit = global.MoneyProfit || {};

  var STATE_KEY  = 'moneyprofit_state';
  var UTM_KEY    = 'fintablo_utm';
  var COOKIE_KEY = 'fintablo_cookies';
  var TTL_MS     = 48 * 3600 * 1000; // 48 часов

  function get(){
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data._ts) return null;
      if (Date.now() - data._ts > TTL_MS) {
        localStorage.removeItem(STATE_KEY);
        return null;
      }
      return data;
    } catch(e){ return null; }
  }

  function set(patch){
    var cur = get() || {};
    var next = Object.assign({}, cur, patch, { _ts: Date.now() });
    try { localStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch(e){}
    return next;
  }

  function clear(){
    try {
      localStorage.removeItem(STATE_KEY);
      sessionStorage.removeItem(UTM_KEY);
      sessionStorage.removeItem('utm_captured');
    } catch(e){}
  }

  // UTM — sessionStorage, не перезаписывается при повторном заходе (first-click attribution)
  function captureUtm(){
    try {
      if (sessionStorage.getItem('utm_captured')) return;
      var params = new URLSearchParams(location.search);
      var keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid','gclid'];
      var utm = {};
      var hasAny = false;
      keys.forEach(function(k){
        var v = params.get(k);
        if (v) { utm[k] = v; hasAny = true; }
      });
      if (hasAny) {
        utm._captured_at = new Date().toISOString();
        utm._referrer = document.referrer || '';
        sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      }
      sessionStorage.setItem('utm_captured', '1');
    } catch(e){}
  }

  function getUtm(){
    try { return JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}'); }
    catch(e){ return {}; }
  }

  function timeAgo(ts){
    if (!ts) return 'недавно';
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'менее минуты назад';
    if (diff < 3600) return Math.floor(diff/60) + ' мин. назад';
    if (diff < 86400) return Math.floor(diff/3600) + ' ч. назад';
    return Math.floor(diff/86400) + ' дн. назад';
  }

  MP.storage = { get:get, set:set, clear:clear, captureUtm:captureUtm, getUtm:getUtm,
                 timeAgo:timeAgo, STATE_KEY:STATE_KEY, COOKIE_KEY:COOKIE_KEY };

  captureUtm();
})(typeof window !== 'undefined' ? window : globalThis);
