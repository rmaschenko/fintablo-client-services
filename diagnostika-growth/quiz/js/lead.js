/* ═════ LEAD · отправка лида в api/lead.php ═════
   Используется report.js (bindLeadForm) для обоих ICP-маршрутов.
   На demo-хостах (GitHub Pages, Vercel) пропускает POST — лид считается
   принятым, чтобы UX-флоу не ломался во время превью. */
(function (global) {
  'use strict';

  function maskPhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (!d.length) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] === '9') d = '7' + d;
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    return out;
  }

  function validatePhone(v) {
    const d = String(v || '').replace(/\D/g, '');
    if (d.length !== 11 || d[0] !== '7') return { ok: false, msg: 'Введите телефон в формате +7 (XXX) XXX-XX-XX' };
    const body = d.slice(1);
    if (!/^[3-9]/.test(body[0])) return { ok: false, msg: 'Проверьте код оператора' };
    if (/^(\d)\1+$/.test(body)) return { ok: false, msg: 'Похоже, это не настоящий номер' };
    return { ok: true };
  }

  function validateEmail(v) {
    const s = String(v || '').trim();
    if (!s) return { ok: false, msg: 'Укажите email' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { ok: false, msg: 'Проверьте email' };
    return { ok: true };
  }

  // Demo-хосты — где нет PHP-бэка. Эмулируем успех.
  function isDemoHost() {
    const h = global.location.hostname || '';
    return /github\.io$|netlify\.app$|vercel\.app$|pages\.dev$|^127\.0\.0\.1$|^localhost$/i.test(h);
  }

  function sendLead(payload, onSuccess, onError) {
    // Дополним payload контекстом
    payload.pageUrl = global.location.href;
    payload.referrer = document.referrer || '';
    payload.timestamp = new Date().toISOString();

    if (isDemoHost()) {
      // Логируем в консоль для отладки на превью
      console.log('[Lead] Demo mode — пропуск POST. Payload:', payload);
      setTimeout(function () { if (onSuccess) onSuccess({ demo: true }); }, 300);
      return;
    }

    const apiPath = (global.location.pathname.replace(/[^/]*$/, '')) + 'api/lead.php';
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 8000);

    fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().catch(function () { return { success: true }; });
    }).then(function (data) {
      if (onSuccess) onSuccess(data || {});
    }).catch(function (err) {
      clearTimeout(timer);
      if (onError) onError(err);
    });
  }

  global.Lead = {
    sendLead: sendLead,
    maskPhone: maskPhone,
    validatePhone: validatePhone,
    validateEmail: validateEmail,
    isDemoHost: isDemoHost
  };
})(window);
