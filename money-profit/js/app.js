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

  // ── Step flow ──
  var FLOW = [
    'welcome','role','industry','revenue',
    'accounting','checkpoint',
    'calc','teaser',
    'payment','planning','pain',
    'prereport','contact','report'
  ];
  // anti-icp is conditional branch (из revenue если <2M)
  var STAGE_OF = {
    welcome:0, role:1, industry:1, revenue:1, 'anti-icp':1, accounting:1, checkpoint:1,
    calc:2, teaser:2, payment:2, planning:2, pain:2, prereport:2,
    contact:3, report:3
  };

  var state = {
    step: 'welcome',
    role: null, industry: null, industryLabel: null, revenue: null, revenueLabel: null,
    accounting: null, accountingLabel: null,
    cashIn: 0, receivables: 0, expenses: 0, balance: 0,
    payment: null, paymentLabel: null,
    planning: null, planningLabel: null,
    pain: null, painLabel: null,
    name: '', phone: '', email: ''
  };

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

  // ── Progress ──
  function updateProgress(){
    var wrap = $('progress-wrapper');
    if (state.step === 'welcome') { wrap.classList.remove('visible'); return; }
    wrap.classList.add('visible');
    var idx = FLOW.indexOf(state.step);
    if (idx < 0) idx = 0;
    var pct = Math.round((idx / (FLOW.length - 1)) * 100);
    $('progress-fill').style.width = pct + '%';
    var stage = STAGE_OF[state.step] || 0;
    $$('.ps-item').forEach(function(el){
      var s = parseInt(el.getAttribute('data-stage'), 10);
      el.classList.remove('active', 'done');
      if (s < stage) el.classList.add('done');
      else if (s === stage) el.classList.add('active');
    });
  }

  // ── Step transitions ──
  function showStep(id, direction){
    direction = direction || 'forward';
    var current = document.querySelector('.step.active');
    if (current) current.classList.remove('active');
    var target = $('step-' + id);
    if (!target) return;
    target.classList.add('active');
    target.classList.toggle('entering-back', direction === 'back');
    state.step = id;
    updateProgress();
    updateStepNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    track('moneyprofit_step_' + id);
  }

  function updateStepNav(){
    var nav = $('step-nav');
    var backBtn = $('btn-back');
    var nextBtn = $('btn-next');
    // Шаги где используется нижняя плавающая нав — никакие, все кнопки inline в шагах
    nav.hidden = true;
  }

  // ── Insight тексты ──
  var ROLE_INSIGHTS = {
    owner: 'По нашим данным, 67% собственников проектных компаний не знают реальную прибыль в моменте. Видят деньги на счёте — считают, что всё в порядке.',
    cfo:   'Разрыв между кассовым и начислительным методом — главная причина непонимания между собственником и финансистом. Сделаем его наглядным.'
  };
  var INDUSTRY_INSIGHTS = {
    construction:'В строительстве — классика: аванс потрачен на материалы и субподряд, работа ещё не сдана. Прибыль «виртуальная», деньги реальные.',
    it:          'В IT-проектах аванс 30% тратится сразу, следующий транш — через 2–3 месяца. На счёте пусто, хотя проект «прибыльный».',
    agency:      'В агентствах субподрядчики оплачены, клиент ещё нет — дебиторка съедает кассу.',
    production:  'В производстве сырьё куплено сейчас, деньги от клиента — после сдачи. Разрыв на всей длине цикла.',
    other:       'В проектном бизнесе разрыв между кассовым и начислительным учётом — главная причина «деньги есть, прибыли нет».'
  };
  var ACCOUNTING_INSIGHTS = {
    none:      'Самый частый случай. Решения принимаются по остатку на счёте — а он показывает прошлое, не будущее. Разрыв обычно выше среднего по отрасли.',
    excel:     'Excel работает — пока компания маленькая. Но таблицы не показывают завтра, только вчера. Типичный разрыв +15–25% к медиане отрасли.',
    '1c':      'Бухгалтерский учёт в 1С показывает то, что уже было. Для управления деньгами нужен другой срез — ежедневное ДДС и план‑факт по проектам.',
    outsource: 'Бухгалтер видит налоги и закрытые периоды. Управленческая картина (где сейчас деньги, что будет через неделю) остаётся у вас.',
    cfo:       'Отлично. Диагностика поможет проверить гипотезы финдира и увидеть, где метрики расходятся с ощущениями.'
  };

  // ── Block 1 ──
  function bindQuizCards(stepId, stateKey, labelKey, insightMap, insightElId, nextStepFn){
    var cards = document.querySelectorAll('#step-' + stepId + ' .option-card');
    cards.forEach(function(card){
      card.addEventListener('click', function(){
        cards.forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        var v = card.getAttribute('data-value');
        state[stateKey] = v;
        if (labelKey) {
          var labelAttr = card.getAttribute('data-label');
          var titleEl = card.querySelector('.oc-title');
          state[labelKey] = labelAttr || (titleEl ? titleEl.textContent.trim() : v);
        }
        S.set((function(){ var o={}; o[stateKey]=v; if(labelKey) o[labelKey]=state[labelKey]; return o; })());
        if (insightMap && insightElId) {
          var el = $(insightElId);
          if (el) { el.textContent = insightMap[v] || ''; el.hidden = false; }
        }
        track('moneyprofit_' + stepId, { value: v });
        setTimeout(nextStepFn, insightMap ? 1400 : 500);
      });
    });
  }

  // ── Checkpoint render ──
  function renderCheckpoint(){
    var industryName = { construction:'Строительство', it:'IT‑проекты', agency:'Агентство', production:'Производство', other:'Проектный бизнес' }[state.industry] || state.industry;
    var accountingLabel = {
      none:'нет системного учёта', excel:'Excel/Sheets', '1c':'1С', outsource:'бухгалтер‑аутсорс', cfo:'штатный финдир'
    }[state.accounting] || '';
    var profileHtml =
      '<div class="cp-profile-grid">' +
        '<div class="cp-pf-item"><div class="cp-pf-lbl">Роль</div><div class="cp-pf-val">' + (state.role === 'owner' ? 'Собственник' : 'Финдиректор') + '</div></div>' +
        '<div class="cp-pf-item"><div class="cp-pf-lbl">Отрасль</div><div class="cp-pf-val">' + industryName + '</div></div>' +
        '<div class="cp-pf-item"><div class="cp-pf-lbl">Оборот</div><div class="cp-pf-val">' + state.revenueLabel + '</div></div>' +
        '<div class="cp-pf-item"><div class="cp-pf-lbl">Учёт</div><div class="cp-pf-val">' + accountingLabel + '</div></div>' +
      '</div>';
    $('cp-profile').innerHTML = profileHtml;

    // Бенчмарк по отрасли (получаем из calculator.js)
    var bench = C.industryBenchmark(state.industry);
    $('cp-bench').innerHTML =
      '<div class="cp-bench-title">Типичный разрыв в отрасли <span class="accent">' + industryName + '</span></div>' +
      '<div class="cp-bench-bar">' +
        '<div class="cpbb-seg top" style="width:' + bench.top + '%"><span class="cpbb-lbl">Топ‑25% &lt; ' + bench.top + '%</span></div>' +
        '<div class="cpbb-seg median" style="width:' + (bench.median - bench.top) + '%"><span class="cpbb-lbl">Медиана ~' + bench.median + '%</span></div>' +
        '<div class="cpbb-seg weak" style="width:' + (bench.bottom - bench.median) + '%"><span class="cpbb-lbl">Отстающие &gt; ' + bench.bottom + '%</span></div>' +
      '</div>' +
      '<div class="cp-bench-sub">Процент от заработанного, который «замораживается» у клиентов в дебиторке</div>';

    // Инсайт по учёту
    var insight = ACCOUNTING_INSIGHTS[state.accounting] || '';
    $('cp-insight').innerHTML = '<div class="cp-insight-ico">💡</div><div class="cp-insight-text">' + insight + '</div>';
  }

  // ── Teaser render (первый слой) ──
  function renderTeaser(){
    var model = C.calcModel(state);
    var severityCls = model.gapLevel;
    var severityText = severityCls === 'ok' ? 'В норме' : severityCls === 'warn' ? 'Умеренный разрыв' : 'Критический разрыв';
    var gapPrefix = model.gap > 0 ? '' : model.gap < 0 ? '−' : '';
    $('teaser-hero').innerHTML =
      '<div class="th-pill ' + severityCls + '"><span class="th-pill-dot"></span>' + severityText + '</div>' +
      '<div class="th-label">Ваш разрыв «деньги vs прибыль»</div>' +
      '<div class="th-value">' + gapPrefix + C.formatRub(Math.abs(model.gap)) + '<span class="rub"> ₽</span><span class="per"> /мес</span></div>' +
      '<div class="th-annual">За год (×12) ≈ <b>' + C.formatRub(model.annualGap) + ' ₽</b> «циркулирует» вне вашей кассы</div>';
  }

  // ── Pre-report animation ──
  function runPreReport(){
    var steps = document.querySelectorAll('#pr-steps .pr-step');
    var i = 0;
    function next(){
      if (i < steps.length) {
        steps[i].classList.add('done');
        i++;
        setTimeout(next, 600);
      } else {
        setTimeout(function(){ showStep('contact'); prepareContactStep(); }, 400);
      }
    }
    setTimeout(next, 300);
  }

  // ── Calc render ──
  var hasTrackedData = false, hasTrackedGap = false;
  var renderTimer = null;
  function debouncedRender(){ clearTimeout(renderTimer); renderTimer = setTimeout(renderCalc, 300); }

  function renderCalc(){
    state.cashIn      = C.parseRub($('f-cashIn').value);
    state.receivables = C.parseRub($('f-receivables').value);
    state.expenses    = C.parseRub($('f-expenses').value);
    state.balance     = C.parseRub($('f-balance').value);

    var model = C.calcModel(state);
    var empty = $('viz-empty'), chart = $('viz-chart'), sticky = $('sticky-cta'), wrap = $('viz-wrap');

    // Прогресс заполнения
    var vals = [state.cashIn, state.receivables, state.expenses, state.balance];
    var filledCount = vals.filter(function(v){ return v > 0; }).length;
    var dots = document.querySelectorAll('.vpd');
    dots.forEach(function(d, i){ d.classList.toggle('filled', i < filledCount); });
    var emptyText = $('viz-empty-text');
    if (emptyText) {
      if (filledCount === 0) emptyText.textContent = 'Заполните 4 поля — разбор появится сразу';
      else if (filledCount < 4) emptyText.textContent = 'Осталось ' + (4 - filledCount) + ' — продолжайте';
      else emptyText.textContent = 'Готовим ваш разбор…';
    }

    if (!model.filled) {
      empty.hidden = false; chart.hidden = true; sticky.classList.remove('visible');
      if (wrap) wrap.classList.add('empty');
      return;
    }
    empty.hidden = true; chart.hidden = false;
    if (wrap) wrap.classList.remove('empty');
    CH.renderLive(chart, model, state.industry);

    S.set({ cashIn: state.cashIn, receivables: state.receivables, expenses: state.expenses, balance: state.balance });

    if (!hasTrackedData) { hasTrackedData = true; track('moneyprofit_data_entered', { diagnosisType: model.diagnosisType }); }
    if (!hasTrackedGap && Math.abs(model.gap) > state.cashIn * 0.1) {
      hasTrackedGap = true; track('moneyprofit_gap_detected', { gap: Math.round(model.gap) });
    }

    var summary = '<b>Разрыв: ' + C.formatShort(Math.abs(model.gap)) + ' ₽/мес</b>';
    if (model.diagnosisType !== 'healthy') summary += '· ≈ ' + C.formatShort(model.annualGap) + ' ₽ в год';
    $('sc-summary').innerHTML = summary;
    sticky.classList.add('visible');
  }

  // ── Prepare contact step ──
  function prepareContactStep(){
    var model = C.calcModel(state);
    var pas = C.pasHeadline(model, state.name);
    $('contact-h').textContent = 'Разбор готов — ' + (state.name ? state.name + ', где' : 'где') + ' выслать?';
    $('contact-sub').textContent = pas.sub;

    var summaryHtml =
      '<div class="cs-row"><div class="cs-label">Ваш разрыв</div><div class="cs-value warn">' + C.formatRub(Math.abs(model.gap)) + ' ₽/мес</div></div>' +
      '<div class="cs-row"><div class="cs-label">Реальная прибыль</div><div class="cs-value ' + (model.realProfit >= 0 ? 'pos' : 'neg') + '">' + (model.realProfit >= 0 ? '' : '−') + C.formatRub(Math.abs(model.realProfit)) + ' ₽</div></div>' +
      '<div class="cs-row highlight"><div class="cs-label">За год</div><div class="cs-value">≈ ' + C.formatRub(model.annualGap) + ' ₽</div></div>';
    $('contact-summary').innerHTML = summaryHtml;
  }

  // ── Render FULL report (second layer after gate) ──
  function renderFullReport(){
    var model = C.calcModel(state);
    CH.renderFull({
      header:     $('report-header'),
      kpis:       $('report-kpis'),
      bench:      $('report-bench'),
      chart:      $('report-chart'),
      leaks:      $('report-leaks'),
      plan:       $('report-plan'),
      projection: $('report-projection'),
      plg:        $('report-plg')
    }, model, state);
  }

  // ── Contact form ──
  function bindContactForm(){
    var nameEl = $('f-name'), phoneEl = $('f-phone'), emailEl = $('f-email');
    var submitBtn = $('btn-submit'), errPhone = $('err-phone');

    if (state.name) nameEl.value = state.name;
    if (state.phone) phoneEl.value = state.phone;

    phoneEl.addEventListener('input', function(){ phoneEl.value = L.maskPhone(phoneEl.value); validateForm(); });
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
      if (document.querySelector('.hp-field').value) return; // honeypot
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Отправляем…';

      var model = C.calcModel(state);
      var payload = {
        name: state.name, phone: state.phone, email: state.email,
        role: state.role, industry: state.industry, industryLabel: state.industryLabel,
        revenueRange: state.revenueLabel, revenueValue: state.revenue,
        accounting: state.accounting, payment: state.payment, planning: state.planning, pain: state.pain,
        cashIn: state.cashIn, receivables: state.receivables,
        expenses: state.expenses, balance: state.balance,
        earnedRevenue: model.earnedRevenue, realProfit: model.realProfit,
        gap: model.gap, annualGap: model.annualGap,
        diagnosisType: model.diagnosisType, diagnosis: model.diagnosis,
        receivablesShare: model.receivablesShare,
        utm: S.getUtm(), referrer: document.referrer, pageUrl: location.href,
        timestamp: new Date().toISOString()
      };

      S.set({ submitted: true, payload: payload });
      track('moneyprofit_lead', { diagnosisType: model.diagnosisType, industry: state.industry });

      L.submit(payload).finally(function(){
        // После отправки — показываем полный разбор (вместо редиректа на thankyou)
        showStep('report');
        renderFullReport();
        // Отложенно — переход на thankyou (пользователь успеет прочитать)
        setTimeout(function(){
          window._mp_navigating = true;
          // не редиректим автоматически — отчёт ценнее thankyou для вовлечения
        }, 2000);
      });
    });
  }

  // ── Cookie / logo / resume ──
  function initCookieBanner(){
    var banner = $('cookie-banner'), btn = $('cb-accept');
    if (!banner || !btn) return;
    if (!localStorage.getItem(S.COOKIE_KEY)) setTimeout(function(){ banner.classList.add('visible'); }, 800);
    btn.addEventListener('click', function(){
      try { localStorage.setItem(S.COOKIE_KEY, '1'); } catch(e){}
      banner.classList.remove('visible');
      track('moneyprofit_cookies_accepted');
    });
  }
  function initLogoFallback(){
    var img = document.querySelector('.logo img');
    if (!img) return;
    img.onerror = function(){
      this.style.display = 'none';
      var fb = this.parentElement.querySelector('.logo-fallback');
      if (fb) fb.style.display = 'block';
    };
  }
  function initResumeBanner(){
    var saved = S.get();
    if (!saved || saved.submitted) return;
    var hasData = saved.role || saved.industry || saved.cashIn;
    if (!hasData) return;
    var banner = $('resume-banner');
    $('rb-ago').textContent = S.timeAgo(saved._ts);
    banner.hidden = false;
    $('rb-resume').addEventListener('click', function(){ restoreState(saved); banner.hidden = true; });
    $('rb-reset').addEventListener('click', function(){ S.clear(); banner.hidden = true; });
  }
  function restoreState(s){
    ['role','industry','industryLabel','revenue','revenueLabel','accounting','payment','planning','pain','name','phone','email'].forEach(function(k){
      if (s[k]) state[k] = s[k];
    });
    ['cashIn','receivables','expenses','balance'].forEach(function(k){
      if (s[k]) {
        state[k] = s[k];
        var el = $('f-' + k);
        if (el) el.value = formatInputValue(s[k]);
      }
    });
    markCards();
    // Возврат к последнему осмысленному шагу
    var lastStep = 'role';
    if (state.role) lastStep = 'industry';
    if (state.industry) lastStep = 'revenue';
    if (state.revenue) lastStep = 'accounting';
    if (state.accounting) lastStep = 'checkpoint';
    if (state.cashIn || state.expenses) lastStep = 'calc';
    if (state.payment) lastStep = 'planning';
    if (state.planning) lastStep = 'pain';
    if (state.pain) lastStep = 'contact';
    showStep(lastStep);
    if (lastStep === 'calc') renderCalc();
    if (lastStep === 'checkpoint') renderCheckpoint();
    if (lastStep === 'contact') prepareContactStep();
  }
  function markCards(){
    var map = [
      ['role', state.role],
      ['industry', state.industry],
      ['revenue', state.revenue ? String(state.revenue) : null],
      ['accounting', state.accounting],
      ['payment', state.payment],
      ['planning', state.planning],
      ['pain', state.pain]
    ];
    map.forEach(function(pair){
      if (!pair[1]) return;
      var el = document.querySelector('#step-' + pair[0] + ' .option-card[data-value="' + pair[1] + '"]');
      if (el) el.classList.add('selected');
    });
  }

  // ── Hero H1 variant ?h= ──
  function applyHeroVariant(){
    var h = new URLSearchParams(location.search).get('h');
    var title = $('hero-h1');
    if (!title) return;
    if (h === '2') title.innerHTML = 'Выручка растёт, <span class="accent">а денег не хватает</span>?';
    else if (h === '3') title.innerHTML = '<span class="accent">Куда уходит прибыль</span> вашего бизнеса?';
  }

  function initBeforeUnload(){
    window.addEventListener('beforeunload', function(e){
      var dangerSteps = ['calc','teaser','payment','planning','pain','prereport','contact'];
      if (dangerSteps.indexOf(state.step) >= 0 && !window._mp_navigating) {
        e.preventDefault(); e.returnValue = '';
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
      showStep('role');
    });

    // Block 1
    bindQuizCards('role',      'role',       null,              ROLE_INSIGHTS,      'insight-role',       function(){ showStep('industry'); });
    bindQuizCards('industry',  'industry',   'industryLabel',   INDUSTRY_INSIGHTS,  'insight-industry',   function(){ showStep('revenue'); });
    // revenue — особый (anti-ICP)
    document.querySelectorAll('#step-revenue .option-card').forEach(function(card){
      card.addEventListener('click', function(){
        document.querySelectorAll('#step-revenue .option-card').forEach(function(c){ c.classList.remove('selected'); });
        card.classList.add('selected');
        state.revenue = parseInt(card.getAttribute('data-value'), 10);
        state.revenueLabel = card.getAttribute('data-label');
        S.set({ revenue: state.revenue, revenueLabel: state.revenueLabel });
        track('moneyprofit_revenue', { value: state.revenue });
        setTimeout(function(){
          if (state.revenue < 2000000) showStep('anti-icp');
          else showStep('accounting');
        }, 400);
      });
    });
    $('aic-back').addEventListener('click', function(){
      track('moneyprofit_antiicp_override');
      showStep('accounting');
    });
    bindQuizCards('accounting','accounting', null,              ACCOUNTING_INSIGHTS,'insight-accounting', function(){ showStep('checkpoint'); renderCheckpoint(); });

    // Checkpoint → calc
    $('btn-to-calc').addEventListener('click', function(){
      track('moneyprofit_to_calc');
      showStep('calc');
    });

    // Calc
    ['f-cashIn','f-receivables','f-expenses','f-balance'].forEach(function(id){
      var el = $(id);
      if (el) attachMoneyInput(el, debouncedRender);
    });
    document.querySelectorAll('.quick-chips').forEach(function(group){
      var inputId = group.getAttribute('data-for');
      var input = $(inputId);
      if (!input) return;
      group.querySelectorAll('.qc').forEach(function(btn){
        btn.addEventListener('click', function(){
          if (btn.hasAttribute('data-clear')) input.value = '';
          else {
            var add = parseInt(btn.getAttribute('data-add'), 10) || 0;
            input.value = formatInputValue(C.parseRub(input.value) + add);
          }
          input.focus();
          debouncedRender();
          track('moneyprofit_chip_used', { field: inputId, add: btn.getAttribute('data-add') || 'clear' });
        });
      });
    });
    $('btn-to-teaser').addEventListener('click', function(){
      track('moneyprofit_teaser_view');
      showStep('teaser');
      renderTeaser();
    });

    // Teaser → payment
    $('btn-to-payment').addEventListener('click', function(){
      track('moneyprofit_teaser_unlock');
      showStep('payment');
    });

    // Block 2
    bindQuizCards('payment',  'payment',  null, null, null, function(){ showStep('planning'); });
    bindQuizCards('planning', 'planning', null, null, null, function(){ showStep('pain'); });
    bindQuizCards('pain',     'pain',     null, null, null, function(){ showStep('prereport'); runPreReport(); });

    // Contact form
    bindContactForm();

    initResumeBanner();
    updateProgress();

    // Dev jumper ?step=ID&demo=1
    var params = new URLSearchParams(location.search);
    var jump = params.get('step');
    if (jump && FLOW.indexOf(jump) >= 0) {
      if (params.get('demo') === '1' || ['calc','teaser','payment','planning','pain','prereport','contact','report','checkpoint'].indexOf(jump) >= 0) {
        state.name = state.name || 'Алексей';
        state.role = state.role || 'owner';
        state.industry = state.industry || 'construction';
        state.industryLabel = state.industryLabel || 'Строительство / ремонт / инжиниринг';
        state.revenue = state.revenue || 10000000;
        state.revenueLabel = state.revenueLabel || '5–15 млн ₽/мес';
        state.accounting = state.accounting || 'excel';
        state.payment = state.payment || 'medium';
        state.planning = state.planning || 'week';
        state.pain = state.pain || 'cash-gap';
        state.cashIn = state.cashIn || 2500000;
        state.receivables = state.receivables || 3500000;
        state.expenses = state.expenses || 2100000;
        state.balance = state.balance || 1200000;
        try {
          $('f-cashIn').value = formatInputValue(state.cashIn);
          $('f-receivables').value = formatInputValue(state.receivables);
          $('f-expenses').value = formatInputValue(state.expenses);
          $('f-balance').value = formatInputValue(state.balance);
        } catch(e){}
      }
      showStep(jump);
      if (jump === 'checkpoint') renderCheckpoint();
      else if (jump === 'calc') renderCalc();
      else if (jump === 'teaser') { renderCalc(); renderTeaser(); }
      else if (jump === 'contact') { renderCalc(); prepareContactStep(); }
      else if (jump === 'report') { renderCalc(); renderFullReport(); }
    }
  });

})();
