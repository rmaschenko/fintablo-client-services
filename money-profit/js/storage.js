/* ═════ LOCALSTORAGE + UTM ═════ */
(function(global){
  'use strict';

  var MoneyProfit = global.MoneyProfit = global.MoneyProfit || {};
  var KEY = 'mp_state_v1';
  var UTM_KEY = 'mp_utm_v1';

  function get(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch(e){ return {}; }
  }

  function set(patch){
    var cur = get();
    var next = Object.assign({}, cur, patch, { _ts: Date.now() });
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch(e){}
    return next;
  }

  function clear(){
    try { localStorage.removeItem(KEY); } catch(e){}
  }

  // ── UTM-метки: ловим при первом заходе, храним постоянно ──
  function captureUtm(){
    try {
      var params = new URLSearchParams(location.search);
      var utmKeys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','yclid','gclid'];
      var found = {};
      var hasAny = false;
      utmKeys.forEach(function(k){
        var v = params.get(k);
        if (v) { found[k] = v; hasAny = true; }
      });
      if (hasAny) {
        found._captured_at = new Date().toISOString();
        found._referrer = document.referrer || '';
        localStorage.setItem(UTM_KEY, JSON.stringify(found));
      }
    } catch(e){}
  }

  function getUtm(){
    try { return JSON.parse(localStorage.getItem(UTM_KEY) || '{}'); }
    catch(e){ return {}; }
  }

  MoneyProfit.storage = {
    get: get, set: set, clear: clear,
    captureUtm: captureUtm, getUtm: getUtm
  };

  captureUtm();

})(typeof window !== 'undefined' ? window : globalThis);
