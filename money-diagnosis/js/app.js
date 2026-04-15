/* ═════ APP · главный контроллер: шаги, навигация, валидация, отправка ═════ */
(function(){
  'use strict';

  var MP = window.MoneyProfit;
  var C  = MP.calc, CH = MP.chart, S = MP.storage, L = MP.lead;

  // ── Яндекс.Метрика ──
  var METRIKA_ID = 61131877;
  function track(goal, params){
    try { if (typeof ym === 'function') ym(METRIKA_ID, 'reachGoal', goal, params || {}); } catch(e){}
  }

  // ── Конфиг шагов ──
  // 0 welcome · 1 role · 2 industry · 3 revenue · 3.5 anti-icp · 4 calc · 4.5 report · 5 contact
  var STAGE_OF_STEP = { 0:0, 1:1, 2:1, 3:1, 4:2, 4.5:2, 5:3 };
  var PROGRESS_STEPS = [0, 1, 2, 3, 4, 4.5, 5];

  var state = {
    step: 0,
    role: null, industry: null, industryLabel: null, revenue: null, revenueLabel: null,
    cashIn: 0, receivables: 0, expenses: 0, balance: 0,
    name: '', phone: '', email: ''
  };

  // ── Helpers ──
  function $(id){ return document.getElementById(id); }
  function $$(sel){ return document.querySelectorAll(sel); }

  function formatInputValue(raw){
    var digits = String(raw).replace(/[^\d]/g, '');
    if (!digits) return '';
    digits = digits.replace(/^0+(?=\d)/, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function attachMoneyInput(input, onChange){
    function upd(){
      var pos = input.selectionEnd;
      var before = input.value.length;
      input.value = formatInputValue(input.value);
      var after = input.value.length;
      try { input.setSelectionRange(pos + (after - before), pos + (after - before)); } catch(e){}
      onChange && onChange();
    }
    input.addEventListener('input', upd);
    input.addEventListener('blur', upd);
  }

  // ── Progress bar ──
  function updateProgress(){
    var wrap = $('progress-wrapper');
    if (state.step === 0) { wrap.classList.remove('visible'); return; }
    wrap.classList.add('visible');
    var idx = PROGRESS_STEPS.indexOf(state.step);
    if (idx < 0) idx = 0;
    var pct = Math.round((idx / (PROGRESS_STEPS.length - 1)) * 100);
    $('progress-fill').style.width = pct + '%';
    var stage = STAGE_OF_STEP[state.step] || 0;
    $$('.ps-item').forEach(function(el){
      var s = parseInt(el.getAttribute('data-stage'), 10);
      el.classList.remove('active', 'done');
      if (s < stage) el.classList.add('done');
      else if (s === stage) el.classList.add('active');
    });
  }

  // ── Step transitions ──
  function showStep(step, direction){
    direction = direction || 'forward';
    var current = document.querySelector('.step.active');
    if (current) {
      current.classList.remove('active');
    }
    var targetId = step === 3.5 ? 'step-anti-icp'
                 : step === 4.5 ? 'step-report'
                 : ('step-' + step);
    var target = $(targetId);
    if (!target) return;
    target.classList.add('active');
    target.classList.toggle('entering-back', direction === 'back');
    state.step = step;
    updateProgress();
    updateStepNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    track('moneyprofit_step_' + String(step).replace('.', '_'));
  }

  function updateStepNav(){
    var nav = $('step-nav');
    var backBtn = $('btn-back');
    var nextBtn = $('btn-next');
    // Nav hidden на welcome / anti-icp / calc / report / contact (там свои кнопки)
    if (state.step === 0 || state.step === 3.5 || state.step === 4 || state.step === 4.5 || state.step === 5) {
      nav.hidden = true;
      return;
    }
    nav.hidden = false;
    backBtn.style.display = state.step > 1 ? 'inline-flex' : 'none';
    nextBtn.disabled = !isStepValid(state.step);
  }

  function isStepValid(step){
    switch (step) {
      case 1: return !!state.role;
      case 2: return !!state.industry;
      case 3: return !!state.revenue;
      default: return true;
    }
  }

  // ── Insight-тексты ──
  var ROLE_INSIGHTS = {
    owner: 'По нашим данным, 67% собственников проектных компаний не знают свою реальную прибыль в моменте. Они видят деньги на счёте — и думают, что всё хорошо.',
    cfo:   'Разрыв между кассовым и начислительным методом — главная причина непонимания между собственником и финансистом. Сделаем это наглядным.'
  };
  var INDUSTRY_INSIGHTS = {
    construction:'В строительстве классика: получили аванс, потратили на материалы и субподряд — деньги ушли, а работа ещё не сдана. Прибыль «виртуальная», деньги реальные.',
    it:          'В IT-проектах аванс 30% тратится сразу, а следующий платёж — через 2–3 месяца. На счёте пусто, хотя проект «прибыльный».',
    agency:      'В агентствах субподрядчики оплачены, клиент ещё не заплатил — дебиторка съедает кассу.',
    production:  'В производстве сырьё и комплектующие куплены сейчас, деньги от клиента — после сдачи. Разрыв — на всей длине производственного цикла.',
    other:       'В проектном бизнесе разрыв между кассовым и начислительным учётом — основная причина, почему «деньги есть, а прибыли нет».'
  };

  // ── Step 1: Role ──
  function bindStep1(){
    var cards = document.querySelectorAll('#step-1 .option-card');
    cards.forEach(function(card){
      card.addEventListener('click', function(){
        cards.forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        var v = card.getAttribute('data-value');
        state.role = v;
        S.set({ role: v });
        var insight = $('insight-role');
        insight.textContent = ROLE_INSIGHTS[v] || '';
        insight.hidden = false;
        track('moneyprofit_role', { role: v });
        setTimeout(function(){ showStep(2); }, 1200);
      });
    });
  }

  // ── Step 2: Industry ──
  function bindStep2(){
    var cards = document.querySelectorAll('#step-2 .option-card');
    cards.forEach(function(card){
      card.addEventListener('click', function(){
        cards.forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        var v = card.getAttribute('data-value');
        state.industry = v;
        state.industryLabel = card.querySelector('.oc-title').textContent.trim();
        S.set({ industry: v, industryLabel: state.industryLabel });
        var insight = $('insight-industry');
        insight.textContent = INDUSTRY_INSIGHTS[v] || '';
        insight.hidden = false;
        track('moneyprofit_industry', { industry: v });
        setTimeout(function(){ showStep(3); }, 1200);
      });
    });
  }

  // ── Step 3: Revenue (+ anti-ICP для «до 2 млн») ──
  function bindStep3(){
    var cards = document.querySelectorAll('#step-3 .option-card');
    cards.forEach(function(card){
      card.addEventListener('click', function(){
        cards.forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        var v = parseInt(card.getAttribute('data-value'), 10);
        var label = card.getAttribute('data-label');
        state.revenue = v;
        state.revenueLabel = label;
        S.set({ revenue: v, revenueLabel: label });
        track('moneyprofit_revenue', { revenue: v, label: label });
        setTimeout(function(){
          if (v < 2000000) showStep(3.5);
          else showStep(4);
        }, 400);
      });
    });

    $('aic-back').addEventListener('click', function(){
      track('moneyprofit_antiicp_override');
      showStep(4);
    });
  }

  // ── Step 4: Calculator ──
  var hasTrackedData = false, hasTrackedGap = false;

  function bindStep4(){
    var ids = ['f-cashIn', 'f-receivables', 'f-expenses', 'f-balance'];
    ids.forEach(function(id){
      var el = $(id);
      attachMoneyInput(el, debouncedRender);
    });

    $('btn-to-report').addEventListener('click', function(){
      track('moneyprofit_report_view');
      showStep(4.5);
      renderReport();
    });

    var reportCta = $('btn-report-to-contact');
    if (reportCta) reportCta.addEventListener('click', function(){
      track('moneyprofit_contact');
      showStep(5);
      prepareContactStep();
    });
  }

  // ── Step 4.5: Personal report render ──
  function renderReport(){
    var model = C.calcModel(state);
    if (!model.filled) return;
    CH.renderReport({
      hero:  $('report-hero'),
      chart: $('report-chart'),
      kpis:  $('report-kpis'),
      leaks: $('report-leaks'),
      plg:   $('report-plg')
    }, model, state.industry, state.name);
  }

  var renderTimer = null;
  function debouncedRender(){
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderCalc, 300);
  }

  function renderCalc(){
    state.cashIn      = C.parseRub($('f-cashIn').value);
    state.receivables = C.parseRub($('f-receivables').value);
    state.expenses    = C.parseRub($('f-expenses').value);
    state.balance     = C.parseRub($('f-balance').value);

    var model = C.calcModel(state);

    var empty = $('viz-empty'), chart = $('viz-chart'), sticky = $('sticky-cta');

    if (!model.filled) {
      empty.hidden = false; chart.hidden = true; sticky.classList.remove('visible');
      return;
    }
    empty.hidden = true; chart.hidden = false;
    CH.renderLive(chart, model, state.industry);

    S.set({ cashIn: state.cashIn, receivables: state.receivables, expenses: state.expenses, balance: state.balance, model: {
      diagnosisType: model.diagnosisType, gap: model.gap, realProfit: model.realProfit, annualGap: model.annualGap
    }});

    if (!hasTrackedData) {
      hasTrackedData = true;
      track('moneyprofit_data_entered', { diagnosisType: model.diagnosisType });
    }
    if (!hasTrackedGap && Math.abs(model.gap) > state.cashIn * 0.1) {
      hasTrackedGap = true;
      track('moneyprofit_gap_detected', { gap: Math.round(model.gap) });
    }

    // Sticky CTA
    var summary = '';
    var ctaText = 'Посмотреть персональный разбор';
    if (model.diagnosisType === 'loss') {
      summary = '<b>Разрыв ' + (model.gap >= 0 ? '+' : '−') + C.formatShort(Math.abs(model.gap)) + ' ₽</b>· ' + model.diagnosis;
    } else if (model.diagnosisType === 'healthy') {
      summary = '<b>' + model.diagnosis + '</b>· Проверим по сегментам';
    } else {
      summary = '<b>Разрыв: ' + C.formatShort(Math.abs(model.gap)) + ' ₽/мес</b>· ≈ ' + C.formatShort(model.annualGap) + ' ₽ в год';
    }
    $('sc-summary').innerHTML = summary;
    $('btn-to-report-text').textContent = ctaText;
    sticky.classList.add('visible');
  }

  // ── Step 5: Contact ──
  function prepareContactStep(){
    var model = C.calcModel(state);
    var pas = C.pasHeadline(model, state.name);
    $('contact-h').textContent = pas.h;
    $('contact-sub').textContent = pas.sub;

    var summaryHtml =
      '<div class="cs-row"><div class="cs-label">Заработано за месяц</div><div class="cs-value">' + C.formatRub(model.earnedRevenue) + ' ₽</div></div>' +
      '<div class="cs-row"><div class="cs-label">Реальная прибыль</div><div class="cs-value ' + (model.realProfit >= 0 ? 'pos' : 'neg') + '">' + (model.realProfit >= 0 ? '' : '−') + C.formatRub(Math.abs(model.realProfit)) + ' ₽</div></div>' +
      '<div class="cs-row"><div class="cs-label">Деньги на счёте</div><div class="cs-value">' + C.formatRub(model.balance) + ' ₽</div></div>' +
      '<div class="cs-row highlight"><div class="cs-label">Разрыв в год (×12)</div><div class="cs-value">≈ ' + C.formatRub(model.annualGap) + ' ₽</div></div>';
    $('contact-summary').innerHTML = summaryHtml;
  }

  function bindContactForm(){
    var nameEl = $('f-name'), phoneEl = $('f-phone'), emailEl = $('f-email');
    var submitBtn = $('btn-submit'), errPhone = $('err-phone');

    // Pre-fill из state
    if (state.name) nameEl.value = state.name;
    if (state.phone) phoneEl.value = state.phone;

    phoneEl.addEventListener('input', function(){
      phoneEl.value = L.maskPhone(phoneEl.value);
      validateForm();
    });
    phoneEl.addEventListener('blur', function(){
      var v = L.validatePhone(phoneEl.value);
      if (!v.ok && phoneEl.value.length > 3) {
        errPhone.textContent = v.msg; errPhone.hidden = false; phoneEl.classList.add('input-error');
      } else {
        errPhone.hidden = true; phoneEl.classList.remove('input-error');
      }
    });
    nameEl.addEventListener('input', validateForm);
    emailEl.addEventListener('input', validateForm);

    function validateForm(){
      var n = L.validateName(nameEl.value);
      var p = L.validatePhone(phoneEl.value);
      var e = L.validateEmail(emailEl.value);
      submitBtn.disabled = !(n.ok && p.ok && e.ok);
      state.name = nameEl.value.trim();
      state.phone = phoneEl.value;
      state.email = emailEl.value.trim();
      S.set({ name: state.name, phone: state.phone, email: state.email });
    }

    $('lead-form').addEventListener('submit', function(ev){
      ev.preventDefault();
      if (submitBtn.disabled) return;

      // Honeypot check
      if (document.querySelector('.hp-field').value) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Отправляем...';

      var model = C.calcModel(state);
      var payload = {
        name: state.name, phone: state.phone, email: state.email,
        role: state.role, industry: state.industry, industryLabel: state.industryLabel,
        revenueRange: state.revenueLabel, revenueValue: state.revenue,
        cashIn: state.cashIn, receivables: state.receivables,
        expenses: state.expenses, balance: state.balance,
        earnedRevenue: model.earnedRevenue, realProfit: model.realProfit,
        gap: model.gap, annualGap: model.annualGap,
        diagnosisType: model.diagnosisType, diagnosis: model.diagnosis,
        receivablesShare: model.receivablesShare,
        utm: S.getUtm(), referrer: document.referrer, pageUrl: location.href,
        timestamp: new Date().toISOString()
      };

      // Сохраним результат для thankyou
      S.set({ submitted: true, payload: payload });

      track('moneyprofit_lead', { diagnosisType: model.diagnosisType, industry: state.industry });

      L.submit(payload).finally(function(){
        window.location.href = 'thankyou.html';
      });
    });

    $('btn-share').addEventListener('click', function(){
      var model = C.calcModel(state);
      var url = location.origin + location.pathname + '?shared=1&type=' + encodeURIComponent(model.diagnosisType) + '&industry=' + encodeURIComponent(state.industry || 'other');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function(){
          $('btn-share').textContent = '✓ Ссылка скопирована';
          setTimeout(function(){ $('btn-share').textContent = '🔗 Поделиться результатом'; }, 2500);
        });
      }
      track('moneyprofit_share');
    });
  }

  // ── Cookie banner ──
  function initCookieBanner(){
    var banner = $('cookie-banner'), btn = $('cb-accept');
    if (!banner || !btn) return;
    if (!localStorage.getItem(S.COOKIE_KEY)) {
      setTimeout(function(){ banner.classList.add('visible'); }, 800);
    }
    btn.addEventListener('click', function(){
      try { localStorage.setItem(S.COOKIE_KEY, '1'); } catch(e){}
      banner.classList.remove('visible');
      track('moneyprofit_cookies_accepted');
    });
  }

  // ── Logo fallback ──
  function initLogoFallback(){
    var img = document.querySelector('.logo img');
    if (!img) return;
    img.onerror = function(){
      this.style.display = 'none';
      var fb = this.parentElement.querySelector('.logo-fallback');
      if (fb) fb.style.display = 'block';
    };
  }

  // ── Resume banner (state TTL 48h) ──
  function initResumeBanner(){
    var saved = S.get();
    if (!saved || saved.submitted) return;
    // Если есть какие-то данные — показать баннер
    var hasData = saved.role || saved.industry || saved.cashIn;
    if (!hasData) return;
    var banner = $('resume-banner');
    $('rb-ago').textContent = S.timeAgo(saved._ts);
    banner.hidden = false;

    $('rb-resume').addEventListener('click', function(){
      restoreState(saved);
      banner.hidden = true;
    });
    $('rb-reset').addEventListener('click', function(){
      S.clear();
      banner.hidden = true;
    });
  }

  function restoreState(s){
    if (s.role) state.role = s.role;
    if (s.industry) { state.industry = s.industry; state.industryLabel = s.industryLabel; }
    if (s.revenue) { state.revenue = s.revenue; state.revenueLabel = s.revenueLabel; }
    if (s.cashIn) { state.cashIn = s.cashIn; $('f-cashIn').value = formatInputValue(s.cashIn); }
    if (s.receivables) { state.receivables = s.receivables; $('f-receivables').value = formatInputValue(s.receivables); }
    if (s.expenses) { state.expenses = s.expenses; $('f-expenses').value = formatInputValue(s.expenses); }
    if (s.balance) { state.balance = s.balance; $('f-balance').value = formatInputValue(s.balance); }
    if (s.name) state.name = s.name;
    if (s.phone) state.phone = s.phone;
    if (s.email) state.email = s.email;

    // Выбрать карточки в квизе
    if (state.role) markSelected('#step-1', state.role);
    if (state.industry) markSelected('#step-2', state.industry);
    if (state.revenue) markSelected('#step-3', String(state.revenue));

    // Определить куда перейти
    if (state.cashIn || state.receivables || state.expenses || state.balance) {
      showStep(4);
      renderCalc();
    } else if (state.revenue) {
      showStep(4);
    } else if (state.industry) {
      showStep(3);
    } else if (state.role) {
      showStep(2);
    } else {
      showStep(1);
    }
  }

  function markSelected(container, value){
    var el = document.querySelector(container + ' .option-card[data-value="' + value + '"]');
    if (el) el.classList.add('selected');
  }

  // ── Step nav (for step 1–3) ──
  function bindStepNav(){
    $('btn-back').addEventListener('click', function(){
      if (state.step > 1) showStep(state.step === 3.5 ? 3 : Math.floor(state.step) - 1, 'back');
    });
    $('btn-next').addEventListener('click', function(){
      if (!isStepValid(state.step)) return;
      if (state.step < 3) showStep(state.step + 1);
      else if (state.step === 3) {
        if (state.revenue && state.revenue < 2000000) showStep(3.5);
        else showStep(4);
      }
    });
  }

  // ── Hero H1 variation (по ?h=) ──
  function applyHeroVariant(){
    var h = new URLSearchParams(location.search).get('h');
    var title = $('hero-h1');
    if (!title) return;
    if (h === '2') title.innerHTML = 'Выручка растёт, <span class="accent">а денег не хватает</span>?';
    else if (h === '3') title.innerHTML = '<span class="accent">Куда уходит прибыль</span> вашего бизнеса?';
    // '1' или пусто → дефолт из разметки
  }

  // ── beforeunload ──
  function initBeforeUnload(){
    window.addEventListener('beforeunload', function(e){
      if (state.step >= 4 && state.step < 5 && !window._mp_navigating) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function(){
    track('moneyprofit_landing_view');
    applyHeroVariant();
    initLogoFallback();
    initCookieBanner();
    initBeforeUnload();

    $('btn-start').addEventListener('click', function(){
      track('moneyprofit_start');
      showStep(1);
    });

    bindStep1();
    bindStep2();
    bindStep3();
    bindStep4();
    bindContactForm();
    bindStepNav();

    initResumeBanner();
    updateProgress();
  });

})();
