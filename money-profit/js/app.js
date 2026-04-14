/* ═════ APP: UI-логика лендинга + микрокалькулятор ═════ */
(function(){
  'use strict';

  var MP = window.MoneyProfit;
  var calc = MP.calc;
  var storage = MP.storage;

  var METRIKA_ID = 61131877;
  function track(goal, params){
    try { if (typeof ym === 'function') ym(METRIKA_ID, 'reachGoal', goal, params || {}); } catch(e){}
  }

  // ── Форматирование input по мере набора ──
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
      var after = input.value.length;
      try { input.setSelectionRange(caretEnd + (after - before), caretEnd + (after - before)); } catch(e){}
      onChange && onChange();
    }
    input.addEventListener('input', update);
    input.addEventListener('blur', update);
  }

  function renderToday(){
    var el = document.getElementById('today-date');
    if (!el) return;
    var d = new Date();
    el.textContent = String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
  }

  // ── SVG bar chart: наивная прибыль vs деньги на счёте ──
  function chartHTML(r){
    var maxVal = Math.max(r.naiveProfit, r.cash, 1);
    var pNaive = Math.max(3, (r.naiveProfit / maxVal) * 100);
    var pCash = Math.max(3, (r.cash / maxVal) * 100);
    return (
      '<div class="result-chart" role="img" aria-label="Сравнение наивной прибыли и реальных денег">' +
        '<div class="chart-row">' +
          '<div class="chart-label">Наивная прибыль</div>' +
          '<div class="chart-bar"><div class="chart-fill naive" style="width:' + pNaive.toFixed(1) + '%"></div></div>' +
          '<div class="chart-val">' + calc.formatRub(r.naiveProfit) + ' ₽</div>' +
        '</div>' +
        '<div class="chart-row">' +
          '<div class="chart-label">Деньги на счёте</div>' +
          '<div class="chart-bar"><div class="chart-fill cash" style="width:' + pCash.toFixed(1) + '%"></div></div>' +
          '<div class="chart-val">' + calc.formatRub(r.cash) + ' ₽</div>' +
        '</div>' +
      '</div>'
    );
  }

  function pressureHTML(r){
    if (r.gap <= 0) return '';
    var perDay = r.gap / 365;
    return (
      '<div class="result-pressure">' +
        '<div class="result-pressure-label">⚡ Упущенная оборотка в день</div>' +
        '<div class="result-pressure-value">' + calc.formatRub(perDay) + ' ₽ / день</div>' +
        '<div class="result-pressure-note">Столько «зависает» у вас ежедневно, если разрыв не устранить</div>' +
      '</div>'
    );
  }

  // ── Рендер результата (богатая версия) ──
  var resultEl = document.getElementById('calc-result');
  var nextSection = document.getElementById('next');
  var hasTrackedStart = false;
  var hasTrackedResult = false;

  // Sync hero-preview (показать значения из калькулятора справа в hero)
  function syncHeroPreview(r){
    var previewVal = document.querySelector('.hp-kpi-value');
    var previewDelta = document.querySelector('.hp-kpi-delta');
    var bars = document.querySelectorAll('.hp-bar');
    if (!previewVal || r.level === 'empty') return;
    previewVal.innerHTML = calc.formatShort(Math.abs(r.gap)) + '<span class="hp-kpi-unit"> ₽</span>';
    previewVal.style.color = r.gap > 0 ? 'var(--loss)' : r.gap < 0 ? 'var(--profit)' : 'var(--slate-500)';
    if (previewDelta) previewDelta.textContent = r.gap > 0 ? 'Прибыль «на бумаге» без денег' : r.gap < 0 ? 'Денег больше, чем прибыли' : 'Разрыв равен нулю';
    if (bars[0]) {
      var max = Math.max(r.naiveProfit, r.cash, 1);
      var f0 = bars[0].querySelector('.hp-bar-fill');
      var f1 = bars[1] && bars[1].querySelector('.hp-bar-fill');
      var v0 = bars[0].querySelector('.hp-bar-label span:last-child');
      var v1 = bars[1] && bars[1].querySelector('.hp-bar-label span:last-child');
      if (f0) { f0.style.width = Math.max(3, (r.naiveProfit / max) * 100) + '%'; f0.style.opacity = '1'; }
      if (f1) { f1.style.width = Math.max(3, (r.cash / max) * 100) + '%'; f1.style.opacity = '1'; }
      if (v0) v0.textContent = calc.formatShort(r.naiveProfit) + ' ₽';
      if (v1) v1.textContent = calc.formatShort(r.cash) + ' ₽';
    }
  }

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
            '<svg width="40" height="40" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5" opacity=".3"/><path d="M16 10v7M16 21v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</div>' +
          '<div class="result-placeholder-title">Введите три числа</div>' +
          '<div class="result-placeholder-text">Результат появится сразу — по мере ввода</div>' +
        '</div>';
      if (nextSection) nextSection.hidden = true;
      return;
    }

    var valClass = r.gap > 0 ? 'pos' : r.gap < 0 ? 'neg' : 'zero';
    var pillClass = r.level === 'danger' ? 'pill-loss' : r.level === 'warn' ? 'pill-caution' : 'pill-profit';
    var pillText = r.level === 'danger' ? 'Критический' : r.level === 'warn' ? 'Умеренный' : r.gap <= 0 ? 'В норме' : '';
    var label = r.gap > 0 ? 'Ваш разрыв' : r.gap < 0 ? 'Профицит (денег больше)' : 'Разрыв равен нулю';
    var prefix = r.gap > 0 ? '' : r.gap < 0 ? '−' : '';

    resultEl.innerHTML =
      '<div class="result-filled">' +
        '<div class="result-kpi-card">' +
          '<div class="result-kpi-head">' +
            '<div class="result-kpi-label">' + label + '</div>' +
            (pillText ? '<span class="pill ' + pillClass + '">' + pillText + '</span>' : '') +
          '</div>' +
          '<div class="result-kpi-value ' + valClass + '">' +
            prefix + calc.formatRub(Math.abs(r.gap)) +
            '<span class="rub"> ₽</span>' +
          '</div>' +
          (r.revenue > 0 ? '<div class="result-kpi-sub">Маржа: ' + (r.margin * 100).toFixed(1).replace('.', ',') + '% · Ratio: ' + (r.ratio === Infinity ? '∞' : r.ratio.toFixed(1).replace('.', ',')) + '×</div>' : '') +
          chartHTML(r) +
          '<div class="result-interp ' + r.level + '">' + r.message + '</div>' +
          pressureHTML(r) +
          '<div class="result-breakdown">' +
            '<div class="bd-item"><div class="bd-label">Наивная прибыль</div><div class="bd-val">' + calc.formatRub(r.naiveProfit) + ' ₽</div></div>' +
            '<div class="bd-item"><div class="bd-label">Деньги на счёте</div><div class="bd-val">' + calc.formatRub(r.cash) + ' ₽</div></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    storage.set({ firstLayer: {
      cash: r.cash, revenue: r.revenue, expenses: r.expenses,
      gap: r.gap, naiveProfit: r.naiveProfit, margin: r.margin, ratio: r.ratio,
      level: r.level
    }});

    syncHeroPreview(r);

    if (!hasTrackedResult) {
      hasTrackedResult = true;
      track('mp_calc_result', { level: r.level, gap: Math.round(r.gap) });
    }

    if (nextSection && r.level !== 'empty') nextSection.hidden = false;
  }

  function smoothScroll(targetId){
    var el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Cookie banner ──
  function initCookieBanner(){
    var banner = document.getElementById('cookie-banner');
    var btn = document.getElementById('cb-accept');
    if (!banner || !btn) return;
    if (!localStorage.getItem('fintablo_cookies')) {
      setTimeout(function(){ banner.classList.add('visible'); }, 800);
    }
    btn.addEventListener('click', function(){
      try { localStorage.setItem('fintablo_cookies', '1'); } catch(e){}
      banner.classList.remove('visible');
      track('mp_cookies_accepted');
    });
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function(){
    renderToday();
    track('mp_landing_view');
    initCookieBanner();

    ['i-cash','i-revenue','i-expenses'].forEach(function(id){
      var input = document.getElementById(id);
      if (input) attachMoneyInput(input, renderResult);
    });

    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = a.getAttribute('href').slice(1);
        if (document.getElementById(id)){
          e.preventDefault();
          smoothScroll(id);
          if (id === 'calc') {
            setTimeout(function(){
              var first = document.getElementById('i-cash');
              if (first) first.focus();
            }, 400);
            track('mp_hero_cta_click');
          }
        }
      });
    });

    var startBtn = document.getElementById('start-quiz');
    if (startBtn) {
      startBtn.addEventListener('click', function(){
        track('mp_quiz_open_intent');
        alert('Квиз будет на следующем шаге разработки. Скоро!');
      });
    }

    // Восстановить значения
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

    // Эффект Зейгарник
    window.addEventListener('beforeunload', function(){
      if (hasTrackedStart && !hasTrackedResult) track('mp_abandoned_50+');
    });
  });

})();
