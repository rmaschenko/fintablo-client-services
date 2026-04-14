/* ═════ LEAD · валидация + отправка ═════ */
(function(global){
  'use strict';
  var MP = global.MoneyProfit = global.MoneyProfit || {};

  // Маска телефона: +7 (___) ___-__-__
  function maskPhone(v){
    var d = String(v || '').replace(/\D/g, '');
    // Норма: начинаем с 7, если первая 8 или 9 — приводим к 7-формату
    if (d.length === 0) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] === '9') d = '7' + d;
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    return out;
  }

  // Валидация телефона: длина + коды + антифейк
  function validatePhone(v){
    var d = String(v || '').replace(/\D/g, '');
    if (d.length !== 11 || d[0] !== '7') return { ok:false, msg:'Введите телефон в формате +7 (XXX) XXX-XX-XX' };
    var body = d.slice(1); // 10 цифр после 7
    // Мобильные операторы 9XX; городские 3XX-8XX (в т.ч. 495, 499, 812)
    var code = body.slice(0, 3);
    var firstDigit = code[0];
    if (!/^[3-9]/.test(firstDigit)) return { ok:false, msg:'Проверьте код оператора/города' };

    // Антифейк: все одинаковые
    if (/^(\d)\1+$/.test(body)) return { ok:false, msg:'Похоже, это не настоящий номер' };
    // Антифейк: последовательность 1234567890
    if (body === '1234567890' || body === '0123456789' || body === '9876543210') return { ok:false, msg:'Похоже, это не настоящий номер' };
    // Антифейк: повторяющиеся блоки 123123123_
    if (/^(\d{3})\1{2,}/.test(body)) return { ok:false, msg:'Похоже, это не настоящий номер' };

    return { ok:true };
  }

  function validateName(v){
    var s = String(v || '').trim();
    if (s.length < 2) return { ok:false, msg:'Укажите имя (минимум 2 символа)' };
    if (/\d/.test(s)) return { ok:false, msg:'Имя не должно содержать цифры' };
    return { ok:true };
  }

  function validateEmail(v){
    if (!v) return { ok:true };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { ok:false, msg:'Проверьте email' };
    return { ok:true };
  }

  // Отправка лида в api/lead.php
  function submit(payload){
    var apiPath = (window.location.pathname.replace(/[^/]*$/, '')) + 'api/lead.php';
    return fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().catch(function(){ return { success:true }; });
    });
  }

  MP.lead = {
    maskPhone: maskPhone,
    validatePhone: validatePhone,
    validateName: validateName,
    validateEmail: validateEmail,
    submit: submit
  };
})(typeof window !== 'undefined' ? window : globalThis);
