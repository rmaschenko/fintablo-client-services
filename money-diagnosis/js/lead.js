/* ═════ LEAD · валидация + отправка формы на шаге 10 ═════ */
(function (global) {
  'use strict';

  // ── Валидация ────────────────────────────────────────────
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
    if (body === '1234567890' || body === '0123456789' || body === '9876543210') return { ok: false, msg: 'Похоже, это не настоящий номер' };
    if (/^(\d{3})\1{2,}/.test(body)) return { ok: false, msg: 'Похоже, это не настоящий номер' };
    return { ok: true };
  }

  function validateName(v) {
    const s = String(v || '').trim();
    if (s.length < 2) return { ok: false, msg: 'Укажите имя (минимум 2 символа)' };
    if (/\d/.test(s)) return { ok: false, msg: 'Имя не должно содержать цифры' };
    return { ok: true };
  }

  function validateEmail(v) {
    const s = String(v || '').trim();
    if (!s) return { ok: false, msg: 'Укажите email' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { ok: false, msg: 'Проверьте email' };
    return { ok: true };
  }

  function submitToApi(payload) {
    const apiPath = (global.location.pathname.replace(/[^/]*$/, '')) + 'api/lead.php';
    return fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().catch(() => ({ success: true }));
    });
  }

  // ── Форма на шаге 10 ─────────────────────────────────────
  function initForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;

    const fName = document.getElementById('f-contact-name');
    const fPhone = document.getElementById('f-phone');
    const fEmail = document.getElementById('f-email');
    const errPhone = document.getElementById('err-phone');
    const btnSubmit = document.getElementById('btn-submit');
    const hp = form.querySelector('input[name="website"]');

    function checkValid() {
      const nameOk = validateName(fName.value).ok;
      const phoneOk = validatePhone(fPhone.value).ok;
      const emailOk = validateEmail(fEmail.value).ok;
      btnSubmit.disabled = !(nameOk && phoneOk && emailOk);
    }

    fName.addEventListener('input', checkValid);
    fPhone.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
      const r = validatePhone(e.target.value);
      if (e.target.value.replace(/\D/g, '').length === 11 && !r.ok) {
        errPhone.textContent = r.msg; errPhone.hidden = false;
      } else {
        errPhone.hidden = true;
      }
      checkValid();
    });
    fEmail.addEventListener('input', checkValid);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (btnSubmit.disabled) return;

      // Honeypot
      if (hp && hp.value) {
        if (typeof global._moneydiag_finishContact === 'function') global._moneydiag_finishContact();
        return;
      }

      const C = global.Calculator, S = global.Storage;
      const utm = S.getUTM() || {};
      const state = (S.loadState() || {}).data || {};

      const computed = C.computeAll({
        role: state.role,
        industry: state.industry,
        monthlyRevenue: state.monthlyRevenue,
        accountingSystem: state.accountingSystem,
        primaryPain: state.primaryPain
      });

      const payload = {
        name: fName.value.trim(),
        phone: fPhone.value,
        email: fEmail.value.trim(),
        service: 'money-diagnosis',
        answers: {
          role: state.role,
          industry: state.industry,
          monthlyRevenue: state.monthlyRevenue,
          accountingSystem: state.accountingSystem,
          primaryPain: state.primaryPain
        },
        metrics: computed,
        utm,
        pageUrl: global.location.href,
        referrer: document.referrer || '',
        timestamp: new Date().toISOString()
      };

      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Отправляем…';

      const finish = () => {
        ym('reachGoal', 'moneydiag_lead_submitted');
        ym('reachGoal', 'moneydiag_pixel_hot');
        S.saveReportData(Object.assign({}, computed, {
          name: payload.name,
          leadSent: true
        }));
        if (typeof global._moneydiag_finishContact === 'function') global._moneydiag_finishContact();
      };

      submitToApi(payload).then(finish).catch(finish);
    });
  }

  global.Lead = { maskPhone, validatePhone, validateName, validateEmail, submitToApi };
  document.addEventListener('DOMContentLoaded', initForm);

})(window);
