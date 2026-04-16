/* ═════ QUIZ · навигация, валидация, инсайты, рендер AHA и превью ═════ */
(function () {
  'use strict';

  const C = window.Calculator;
  const S = window.Storage;

  // Порядок шагов по ТЗ: гейт (10) ПОСЛЕ AHA (65), ДО вопросов блока 2
  const STEP_ORDER = [0, 1, 2, 3, 4, 5, 65, 10, 6, 7, 8, 9];
  const BLOCK1_STEPS = [1, 2, 3, 4, 5];
  const BLOCK2_STEPS = [6, 7, 8, 9];
  const TOTAL_QUESTIONS = 10;

  // ── State ────────────────────────────────────────────────
  const state = {
    cursor: 0,              // индекс в STEP_ORDER
    role: null,
    name: '',
    industry: null,
    revenueIdx: 3,          // slider index 0..7
    monthlyRevenue: 5_000_000,
    activeProjects: 5,
    accountingSystem: [],
    mainProblems: [],
    desiredResult: null,
    hasFinancist: null,
    startedAt: Date.now(),
    leadSent: false,
    reachedAha: false
  };

  // ── DOM helpers ──────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => (root || document).querySelectorAll(sel);

  function showStep(id) {
    $$('.step').forEach(s => s.classList.remove('active'));
    const el = $('step-' + id);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    ym('reachGoal', 'moneydiag_step_' + id);
  }

  function currentStepId() { return STEP_ORDER[state.cursor]; }

  function updateProgress() {
    const wrap = $('progress-wrapper');
    const stepId = currentStepId();
    if (stepId === 0) { wrap.hidden = true; return; }
    wrap.hidden = false;

    // Считаем % по пройденным вопросам блока 1+2 (макс. 9)
    const answered = countAnswered();
    const pct = Math.min(100, Math.round((answered / TOTAL_QUESTIONS) * 100));
    $('progress-fill').style.width = pct + '%';

    // Подсветка блока
    const inBlock2 = BLOCK2_STEPS.indexOf(stepId) !== -1 || stepId === 10;
    $$('.ps-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.stage) === (inBlock2 ? 2 : 1));
    });
  }

  function countAnswered() {
    let n = 0;
    if (state.role) n++;
    if (state.name) n++;
    if (state.industry) n++;
    if (state.monthlyRevenue) n++;
    if (state.activeProjects) n++;
    if (state.accountingSystem.length) n++;
    if (state.mainProblems.length) n++;
    if (state.desiredResult) n++;
    if (state.hasFinancist) n++;
    return n;
  }

  // ── Navigation ───────────────────────────────────────────
  function goNext() {
    state.cursor++;
    // Пропускаем шаг 9 если не owner
    while (STEP_ORDER[state.cursor] === 9 && state.role !== 'owner') state.cursor++;

    if (state.cursor >= STEP_ORDER.length) return finishQuiz();

    const id = currentStepId();

    // На AHA — пересчёт + рендер
    if (id === 65) {
      state.reachedAha = true;
      ym('reachGoal', 'moneydiag_midpoint');
      renderAha();
    }

    // На шаге 10 — превью отчёта + форма. Если лид уже отправлен — пропускаем
    if (id === 10) {
      if (state.leadSent) { state.cursor++; return goCurrent(); }
      ym('reachGoal', 'moneydiag_contact_form');
      renderContactGate();
    }

    goCurrent();
  }

  function goBack() {
    if (state.cursor > 0) {
      state.cursor--;
      // Не возвращаемся к 9 если не owner
      while (STEP_ORDER[state.cursor] === 9 && state.role !== 'owner') state.cursor--;
      goCurrent();
    }
  }

  function goCurrent() {
    const id = currentStepId();
    showStep(id);
    showNav(id);
    updateProgress();
    persistState();
  }

  function showNav(stepId) {
    const nav = $('step-nav');
    // Скрываем nav на welcome/AHA/contact — там свои CTA
    const hideNav = [0, 65, 10].indexOf(stepId) !== -1 || stepId === 'anti-icp';
    nav.hidden = hideNav;

    const btnBack = $('btn-back');
    const btnNext = $('btn-next');
    btnBack.hidden = state.cursor <= 1; // на шаге 1 назад некуда, кроме welcome
    btnNext.disabled = !isStepValid(stepId);
  }

  function isStepValid(stepId) {
    switch (stepId) {
      case 1: return !!state.role;
      case 2: return state.name.length >= 2 && /^[А-Яа-яЁёA-Za-z\s-]+$/.test(state.name);
      case 3: return !!state.industry;
      case 4: return state.monthlyRevenue > 0;
      case 5: return state.activeProjects > 0;
      case 6: return state.accountingSystem.length > 0;
      case 7: return state.mainProblems.length > 0;
      case 8: return !!state.desiredResult;
      case 9: return !!state.hasFinancist;
      default: return true;
    }
  }

  function finishQuiz() {
    // После всех вопросов — сохраняем результаты и редиректим на report.html
    const computed = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      activeProjects: state.activeProjects,
      accountingSystem: state.accountingSystem,
      mainProblems: state.mainProblems,
      hasFinancist: state.hasFinancist
    });
    const reportData = Object.assign({}, computed, {
      name: state.name,
      desiredResult: state.desiredResult,
      sessionDuration: Math.round((Date.now() - state.startedAt) / 1000)
    });
    S.saveReportData(reportData);
    window._moneydiag_navigating = true;
    window.location.href = 'report.html';
  }

  // ── Insights ─────────────────────────────────────────────
  const INSIGHTS = {
    role: {
      owner: 'Большинство собственников проектного бизнеса видят прибыль по году, но не понимают, где она теряется в моменте. Диагностика покажет конкретные точки.',
      financier: 'Финансовые директора без специализированного инструмента тратят до 40% рабочего времени на сбор данных вместо анализа.'
    },
    industry: {
      construction: 'В строительных подрядах главные потери — нечестный субподряд и несовпадение плана и факта по этапам. Встречается у 73% компаний до внедрения системы.',
      it: 'В IT-проектах типичная история: аванс потрачен, следующий этапный платёж через 3 недели, а команда работает прямо сейчас. Кассовый разрыв незаметен до последнего.',
      agency: 'В агентствах маржа часто «стекает» в командировки, субподряд и лицензии на ПО, которые не раскладываются по проектам.',
      production: 'В производстве и монтаже управленческая боль — распределение ФОТ и материалов по проектам. Без этого рентабельность видна только «в целом».',
      other: 'В проектном бизнесе общая проблема — учёт идёт «по факту», а не в моменте. Пока проект открыт, вы управляете по интуиции.'
    },
    revenueByZone: function (v) {
      if (v < 2_000_000) return 'На этом уровне важнее всего базовый контроль: ДДС и P&L хотя бы в Excel. Диагностика покажет, с чего начать.';
      if (v < 10_000_000) return 'Для вашего масштаба ключевой вопрос: можете ли вы прямо сейчас сказать, какой проект самый невыгодный? Если нет — это решаемо.';
      if (v < 50_000_000) return 'При таком обороте разрыв между управленческим и бухгалтерским учётом стоит компании в среднем 8–12% выручки ежегодно.';
      return 'На вашем уровне финансовая непрозрачность — это уже системный риск для масштабирования, а не просто неудобство.';
    },
    projectsByCount: function (n) {
      if (n <= 2) return 'Мало проектов — высокая концентрация риска. Один убыточный — заметный удар по всей компании.';
      if (n <= 7) return 'Зона, где управление «в голове» ещё кажется возможным — но уже не является.';
      if (n <= 15) return 'При 8–15 проектах без системы нормально: 2–4 работают в минус, и это незаметно.';
      return 'На таком портфеле без автоматизации потери маржи 15–25% — стандартная ситуация.';
    }
  };

  // ── Event wiring ─────────────────────────────────────────
  function init() {
    ym('reachGoal', 'moneydiag_landing_view');
    ym('reachGoal', 'moneydiag_pixel_cold');

    // Resume banner
    const saved = S.loadState();
    if (saved && saved.data && saved.data.cursor > 0) {
      $('rb-ago').textContent = S.agoText(saved.ts);
      $('resume-banner').hidden = false;
      $('rb-resume').onclick = () => {
        Object.assign(state, saved.data);
        $('resume-banner').hidden = true;
        restoreInputs();
        goCurrent();
      };
      $('rb-reset').onclick = () => {
        S.clearState();
        $('resume-banner').hidden = true;
      };
    }

    // Start
    $('btn-start').onclick = () => {
      ym('reachGoal', 'moneydiag_start');
      state.cursor = 1;
      goCurrent();
    };

    // Role (step 1)
    $$('#step-1 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-1 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.role = btn.dataset.value;
        const ins = $('insight-role');
        ins.textContent = INSIGHTS.role[state.role];
        ins.hidden = false;
        ym('reachGoal', 'moneydiag_role_selected');
        setTimeout(goNext, 1200);
      };
    });

    // Name (step 2)
    const nameInput = $('f-name');
    nameInput.addEventListener('input', () => {
      state.name = nameInput.value.trim();
      const err = $('err-name');
      if (state.name && !/^[А-Яа-яЁёA-Za-z\s-]+$/.test(state.name)) {
        err.textContent = 'Только буквы';
        err.hidden = false;
      } else {
        err.hidden = true;
      }
      $('insight-name').hidden = state.name.length < 2;
      $('btn-next').disabled = !isStepValid(2);
    });

    // Industry (step 3)
    $$('#step-3 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-3 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.industry = btn.dataset.value;
        const ins = $('insight-industry');
        ins.textContent = INSIGHTS.industry[state.industry];
        ins.hidden = false;
        setTimeout(goNext, 1200);
      };
    });

    // Revenue slider (step 4)
    const revSlider = $('f-revenue');
    const revReadout = $('sr-revenue-value');
    function updateRevenue() {
      state.revenueIdx = Number(revSlider.value);
      state.monthlyRevenue = C.revenueFromSliderIndex(state.revenueIdx);
      revReadout.textContent = C.revenueLabel(state.revenueIdx);
      const ins = $('insight-revenue');
      ins.textContent = INSIGHTS.revenueByZone(state.monthlyRevenue);
      ins.hidden = false;
      $('btn-next').disabled = false;
    }
    revSlider.addEventListener('input', updateRevenue);
    revSlider.addEventListener('change', () => {
      updateRevenue();
      if (state.monthlyRevenue < 2_000_000) {
        // Anti-ICP soft gate
        ym('reachGoal', 'moneydiag_anti_icp');
        showStep('anti-icp');
        $('step-nav').hidden = true;
        $('aic-back').onclick = () => {
          // всё равно продолжить
          goNext();
        };
      }
    });
    updateRevenue();

    // Projects slider (step 5)
    const projSlider = $('f-projects');
    const projReadout = $('sr-projects-value');
    function updateProjects() {
      state.activeProjects = Number(projSlider.value);
      projReadout.textContent = state.activeProjects + ' ' +
        C.plural(state.activeProjects, ['проект', 'проекта', 'проектов']);
      const ins = $('insight-projects');
      ins.textContent = INSIGHTS.projectsByCount(state.activeProjects);
      ins.hidden = false;
      $('btn-next').disabled = false;
    }
    projSlider.addEventListener('input', updateProjects);
    updateProjects();

    // AHA continue
    $('btn-aha-continue').onclick = () => goNext();

    // Accounting system (step 6, multichoice)
    $$('#step-6 .option-card').forEach(btn => {
      btn.onclick = () => {
        const v = btn.dataset.value;
        if (v === 'none') {
          // «Нигде» эксклюзивно
          $$('#step-6 .option-card').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          state.accountingSystem = ['none'];
        } else {
          // Снимаем «Нигде» если было (ищем по data-value, не по индексу)
          const noneBtn = document.querySelector('#step-6 .option-card[data-value="none"]');
          if (noneBtn) noneBtn.classList.remove('selected');
          state.accountingSystem = state.accountingSystem.filter(s => s !== 'none');
          btn.classList.toggle('selected');
          if (btn.classList.contains('selected')) state.accountingSystem.push(v);
          else state.accountingSystem = state.accountingSystem.filter(s => s !== v);
        }
        $('btn-next').disabled = !isStepValid(6);
      };
    });

    // Pains (step 7, max 2)
    $$('#step-7 .option-card').forEach(btn => {
      btn.onclick = () => {
        const v = btn.dataset.value;
        if (btn.classList.contains('selected')) {
          btn.classList.remove('selected');
          state.mainProblems = state.mainProblems.filter(p => p !== v);
        } else {
          if (state.mainProblems.length >= 2) return;
          btn.classList.add('selected');
          state.mainProblems.push(v);
        }
        $('btn-next').disabled = !isStepValid(7);
      };
    });

    // Desired result (step 8)
    $$('#step-8 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-8 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.desiredResult = btn.dataset.value;
        setTimeout(goNext, 1000);
      };
    });

    // Financist (step 9, owner-only)
    $$('#step-9 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-9 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.hasFinancist = btn.dataset.value;
        setTimeout(goNext, 1000);
      };
    });

    // Nav buttons
    $('btn-next').onclick = goNext;
    $('btn-back').onclick = goBack;

    // Example modal
    $('btn-example').onclick = () => { $('modal-example').hidden = false; };
    $$('[data-close]').forEach(el => el.onclick = () => { $('modal-example').hidden = true; });

    // Cookie banner
    if (!localStorage.getItem('fintablo_cookies')) {
      setTimeout(() => $('cookie-banner').classList.add('visible'), 800);
    }
    $('cb-accept').onclick = () => {
      localStorage.setItem('fintablo_cookies', '1');
      $('cookie-banner').classList.remove('visible');
    };

    // beforeunload warning on progress
    window.addEventListener('beforeunload', (e) => {
      if (window._moneydiag_navigating) return;
      if (state.cursor > 2 && !state.leadSent) {
        if (countAnswered() >= 5) {
          ym('reachGoal', 'moneydiag_abandoned_50+');
          ym('reachGoal', 'moneydiag_pixel_warm');
        }
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Lead form — handled by lead.js which calls back finishContact()
    window._moneydiag_finishContact = finishContact;
  }

  function finishContact() {
    state.leadSent = true;
    persistState();
    // После отправки — уходим к шагу 6 (если owner → дальше к 9, потом report)
    state.cursor++;
    goCurrent();
  }

  function restoreInputs() {
    if (state.name) $('f-name').value = state.name;
    if (state.revenueIdx != null) {
      $('f-revenue').value = state.revenueIdx;
      $('sr-revenue-value').textContent = C.revenueLabel(state.revenueIdx);
    }
    if (state.activeProjects) {
      $('f-projects').value = state.activeProjects;
      $('sr-projects-value').textContent = state.activeProjects + ' ' +
        C.plural(state.activeProjects, ['проект', 'проекта', 'проектов']);
    }
    // Highlight selected option-cards
    if (state.role) {
      const b = document.querySelector('#step-1 .option-card[data-value="' + state.role + '"]');
      if (b) b.classList.add('selected');
    }
    if (state.industry) {
      const b = document.querySelector('#step-3 .option-card[data-value="' + state.industry + '"]');
      if (b) b.classList.add('selected');
    }
  }

  function persistState() {
    S.saveState({
      cursor: state.cursor,
      role: state.role,
      name: state.name,
      industry: state.industry,
      revenueIdx: state.revenueIdx,
      monthlyRevenue: state.monthlyRevenue,
      activeProjects: state.activeProjects,
      accountingSystem: state.accountingSystem,
      mainProblems: state.mainProblems,
      desiredResult: state.desiredResult,
      hasFinancist: state.hasFinancist,
      leadSent: state.leadSent,
      startedAt: state.startedAt
    });
  }

  // ── AHA (step 65) ────────────────────────────────────────
  function renderAha() {
    const r = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      activeProjects: state.activeProjects,
      accountingSystem: [], // ещё не отвечал → дефолт 'none'
      mainProblems: [],
      hasFinancist: null
    });

    $('aha-title').textContent = (state.name || 'Отлично') + ', данные уже работают';
    $('aha-loss').textContent = '~ ' + C.formatMoneyCompact(r.estimatedAnnualLoss) + '/год';
    $('aha-index').textContent = r.transparencyIndex + ' / 100';
    $('aha-risk').textContent = r.primaryRiskZone;
  }

  // ── Contact gate (step 10) ───────────────────────────────
  function renderContactGate() {
    const r = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      activeProjects: state.activeProjects,
      accountingSystem: [],
      mainProblems: [],
      hasFinancist: null
    });

    $('contact-h').textContent = (state.name || '') + ', ваш отчёт готов';
    $('contact-index').textContent = r.transparencyIndex + ' / 100';

    // Превью: первые 2 секции
    $('rp-profile-desc').textContent = 'Индекс прозрачности ' + r.transparencyIndex + ' / 100 — профиль уточним после ответов на 4 вопроса. Оценочные потери: ~' + C.formatMoneyCompact(r.estimatedAnnualLoss) + '/год.';
    const leaks = $('rp-leaks');
    leaks.innerHTML = '';
    [
      r.primaryRiskZone,
      'Кассовые разрывы в периоды перехода между этапами',
      'P&L недоступен до закрытия проекта'
    ].forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      leaks.appendChild(li);
    });

    // Префилл имени
    const cn = $('f-contact-name');
    if (state.name) cn.value = state.name;
  }

  document.addEventListener('DOMContentLoaded', init);

})();
