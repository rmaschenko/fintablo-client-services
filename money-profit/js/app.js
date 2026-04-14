/* ═════ APP: UI-логика лендинга + микрокалькулятор ═════ */
(function(){
  'use strict';

  var MP = window.MoneyProfit;
  var calc = MP.calc;
  var storage = MP.storage;

  // ── Отправка событий в Яндекс.Метрику ──
  var METRIKA_ID = 61131877;
  function track(event, params){
    try {
      if (typeof ym === 'function') ym(METRIKA_ID, 'reachGoal', event, params || {});
    } catch(e){}
  }

  // ── Форматирование числа в input по мере набора ──
  function formatInputValue(raw){
    var digits = String(raw).replace(/[^\d]/g, '');
    if (!digits) return '';
    digits = digits.replace(/^0+(?=\d)/, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function attachMoneyInput(input, onChange){
    function update(){
      var caretEnd = input.selectionEnd;
      var before = input.value.length;
      input.value = formatInputValue(input.value);
      // приблизительно восстановить позицию курсора
      var after = input.value.length;
      var delta = after - before;
      try { input.setSelectionRange(caretEnd + delta, caretEnd + delta); } catch(e){}
      onChange && onChange();
    }
    input.addEventListener('input', update);
    input.addEventListener('blur', update);
  }

  // ── Сегодняшняя дата в шапке калькулятора ──
  function renderToday(){
    var el = document.getElementById('today-date');
    if (!el) return;
    var d = new Date();
    var dd = String(d.getDate()).padStart(2,'0');
    var mm = String(d.getMonth()+1).padStart(2,'0');
    el.textContent = dd + '.' + mm + '.' + d.getFullYear();
  }

  // ── Рендер результата ──
  var resultEl = document.getElementById('calc-result');
  var nextSection = document.getElementById('next');
  var hasTrackedStart = false;
  var hasTrackedResult = false;

  function renderResult(){
    var cash = calc.parseRub(document.getElementById('i-cash').value);
    var revenue = calc.parseRub(document.getElementById('i-revenue').value);
    var expenses = calc.parseRub(document.getElementById('i-expenses').value);

    if (!hasTrackedStart && (cash || revenue || expenses)) {
      hasTrackedStart = true;
      track('mp_calc_started');
    }

    var r = calc.calcGap({ cash: cash, revenue: revenue, expenses: expenses });

    if (r.level === 'empty') {
      resultEl.innerHTML =
        '<div class="result-placeholder">' +
          '<div class="result-placeholder-ico">' +
            '<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5" opacity=".3"/><path d="M16 10v7M16 21v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</div>' +
          '<div class="result-placeholder-text">Введите три числа — покажем разрыв</div>' +
        '</div>';
      if (nextSection) nextSection.hidden = true;
      return;
    }

    // Определить визуальный класс для числа
    var valClass = 'zero';
    if (r.gap > 0) valClass = 'pos';
    else if (r.gap < 0) valClass = 'neg';

    var label = r.gap > 0 ? 'Ваш разрыв (прибыль без денег)'
             : r.gap < 0 ? 'Денег больше, чем наивной прибыли'
             : 'Разрыв = 0';
    var prefix = r.gap > 0 ? '' : (r.gap < 0 ? '−' : '');
    var absGap = Math.abs(r.gap);

    resultEl.innerHTML =
      '<div class="result-filled">' +
        '<div>' +
          '<div class="result-label">' + label + '</div>' +
          '<div class="result-value ' + valClass + '">' +
            prefix + calc.formatRub(absGap) +
            '<span class="rub"> ₽</span>' +
          '</div>' +
        '</div>' +
        '<div class="result-interp ' + r.level + '">' + r.message + '</div>' +
        '<div class="result-breakdown">' +
          '<div class="bd-item"><div class="bd-label">Наивная прибыль</div><div class="bd-val">' + calc.formatRub(r.naiveProfit) + ' ₽</div></div>' +
          '<div class="bd-item"><div class="bd-label">Маржа</div><div class="bd-val">' + (r.margin * 100).toFixed(1).replace('.', ',') + '%</div></div>' +
        '</div>' +
      '</div>';

    // Сохранить в storage
    storage.set({ firstLayer: {
      cash: r.cash, revenue: r.revenue, expenses: r.expenses,
      gap: r.gap, naiveProfit: r.naiveProfit, margin: r.margin, ratio: r.ratio,
      level: r.level
    }});

    if (!hasTrackedResult) {
      hasTrackedResult = true;
      track('mp_calc_result', { level: r.level, gap: Math.round(r.gap) });
    }

    // Показать CTA на второй шаг
    if (nextSection && r.level !== 'empty') {
      nextSection.hidden = false;
    }
  }

  // ── Плавный скролл по якорям ──
  function smoothScroll(targetId){
    var el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Инициализация ──
  document.addEventListener('DOMContentLoaded', function(){
    renderToday();
    track('mp_landing_view');

    ['i-cash','i-revenue','i-expenses'].forEach(function(id){
      var input = document.getElementById(id);
      if (input) attachMoneyInput(input, renderResult);
    });

    // Hero CTA → scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = a.getAttribute('href').slice(1);
        if (document.getElementById(id)){
          e.preventDefault();
          smoothScroll(id);
          if (id === 'calc') {
            setTimeout(function(){ document.getElementById('i-cash').focus(); }, 400);
          }
        }
      });
    });

    // Кнопка "Начать диагностику" → заглушка для будущего квиза
    var startBtn = document.getElementById('start-quiz');
    if (startBtn) {
      startBtn.addEventListener('click', function(){
        track('mp_quiz_open_intent');
        alert('Квиз будет на следующем шаге разработки.');
      });
    }

    // Восстановить значения из storage, если пользователь вернулся
    var saved = storage.get();
    if (saved.firstLayer) {
      try {
        var fl = saved.firstLayer;
        if (fl.cash) document.getElementById('i-cash').value = formatInputValue(fl.cash);
        if (fl.revenue) document.getElementById('i-revenue').value = formatInputValue(fl.revenue);
        if (fl.expenses) document.getElementById('i-expenses').value = formatInputValue(fl.expenses);
        renderResult();
      } catch(e){}
    }

    // Эффект Зейгарник — предупреждение при уходе после начала
    window.addEventListener('beforeunload', function(e){
      if (hasTrackedStart && !hasTrackedResult) {
        track('mp_abandoned_50+');
      }
    });
  });

})();
