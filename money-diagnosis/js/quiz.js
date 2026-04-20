/* ═════ QUIZ · 5-шаговая воронка + AHA + гейт ═════ */
(function () {
  'use strict';

  const C = window.Calculator;
  const S = window.Storage;

  // Порядок шагов (v2.2)
  // 0 welcome → 1 role → 2 revenue → 3 industry → 4 system → 5 pain → 65 AHA → 66 micro-breakdown → 10 gate → report
  const STEP_ORDER = [0, 1, 2, 3, 4, 5, 65, 66, 10];
  const TOTAL_QUESTIONS = 5;

  // ── State ────────────────────────────────────────────────
  const state = {
    cursor: 0,
    role: null,
    revenueIdx: 3,          // слайдер 0..7
    monthlyRevenue: 5_000_000,
    industry: null,
    accountingSystem: null, // single choice
    primaryPain: null,
    startedAt: Date.now(),
    leadSent: false,
    reachedAha: false
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => (root || document).querySelectorAll(sel);

  // ── Типографика: неразрывные пробелы после коротких слов и перед «ли/же/бы» ──
  // Убирает висячие предлоги и «голые» цифры с единицами.
  const SHORT_WORDS = ['в','во','на','с','со','за','по','до','от','из','ко','об','о','у','к','и','а','я','но','не','ни','для','без','про','под','над','при','что','как','это','это','или','же','бы','ли','чем','был','ещё','уж','вы','я'];
  const SW_RE = new RegExp('(^|[\\s(«"\'—])(' + SHORT_WORDS.join('|') + ')(\\s)', 'giu');
  function typograph(s) {
    if (s == null) return s;
    let out = String(s);
    for (let i = 0; i < 2; i++) out = out.replace(SW_RE, '$1$2\u00A0');
    out = out
      .replace(/(\d)\s(₽|руб|млн|млрд|тыс|ч|мес|%|дн|дней|лет|года|год|месяц[ауев]?|дня|часов|шт|штук)/g, '$1\u00A0$2')
      .replace(/\s—\s/g, '\u00A0— ')
      .replace(/\s–\s/g, '\u00A0– ')
      .replace(/\bот\s(\d)/g, 'от\u00A0$1')
      .replace(/\bдо\s(\d)/g, 'до\u00A0$1');
    return out;
  }
  function setTyped(el, s) { if (el) el.textContent = typograph(s || '—'); }

  function showStep(id) {
    $$('.step').forEach(s => s.classList.remove('active'));
    const el = $('step-' + id);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    ym('reachGoal', 'moneydiag_step_' + id);
  }

  function currentStepId() { return STEP_ORDER[state.cursor]; }

  function countAnswered() {
    let n = 0;
    if (state.role) n++;
    if (state.monthlyRevenue) n++;
    if (state.industry) n++;
    if (state.accountingSystem) n++;
    if (state.primaryPain) n++;
    return n;
  }

  // Состояния прогресса — мотивационные подписи вместо «N из 5»
  // (по гайду quiz UX: знаменатель пугает, состояние вдохновляет).
  const PROGRESS_LABELS = {
    1: 'Хорошее начало',
    2: 'Разгоняемся',
    3: 'Почти половина',
    4: 'Почти готово',
    5: 'Последний штрих'
  };

  function updateProgress() {
    const wrap = $('progress-wrapper');
    const stepId = currentStepId();
    if (stepId === 0 || stepId === 65 || stepId === 66 || stepId === 10) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;

    const stepIdx = [1, 2, 3, 4, 5].indexOf(stepId) + 1;
    const pct = Math.round((stepIdx / TOTAL_QUESTIONS) * 100);
    $('progress-fill').style.width = pct + '%';
    $('progress-label').textContent = PROGRESS_LABELS[stepIdx] || 'Шаг ' + stepIdx;
  }

  // ── Navigation ───────────────────────────────────────────
  function goNext() {
    state.cursor++;
    if (state.cursor >= STEP_ORDER.length) return finishQuiz();
    const id = currentStepId();

    if (id === 5) {
      // Перерисовываем варианты болей под выбранную роль
      applyRoleAwarePainLabels();
    }

    if (id === 65) {
      state.reachedAha = true;
      ym('reachGoal', 'moneydiag_aha_view');
      renderAha();
    }

    if (id === 66) {
      ym('reachGoal', 'moneydiag_microbreakdown_view');
      renderMicrobreakdown();
    }

    if (id === 10) {
      if (state.leadSent) { state.cursor++; return goCurrent(); }
      ym('reachGoal', 'moneydiag_contact_form_open');
      renderContactGate();
    }

    goCurrent();
  }

  function goBack() {
    if (state.cursor > 0) {
      state.cursor--;
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
    const hideNav = [0, 65, 66, 10].indexOf(stepId) !== -1 || stepId === 'anti-icp';
    nav.hidden = hideNav;

    const btnBack = $('btn-back');
    const btnNext = $('btn-next');
    btnBack.hidden = state.cursor <= 1;
    btnNext.disabled = !isStepValid(stepId);
  }

  function isStepValid(stepId) {
    switch (stepId) {
      case 1: return !!state.role;
      case 2: return state.monthlyRevenue > 0;
      case 3: return !!state.industry;
      case 4: return !!state.accountingSystem;
      case 5: return !!state.primaryPain;
      default: return true;
    }
  }

  function finishQuiz() {
    const computed = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain
    });
    const reportData = Object.assign({}, computed, {
      sessionDuration: Math.round((Date.now() - state.startedAt) / 1000)
    });
    S.saveReportData(reportData);
    window._moneydiag_navigating = true;
    window.location.href = 'report.html';
  }

  // ── Микро-награды после выбора ответа (по гайду quiz UX) ──
  // Короткая inline-фраза под опциями на ~1.2 секунды до auto-advance.
  // Это «зеркало», а не «правильно/неправильно» — снижает ощущение допроса,
  // добавляет дофамин и чувство, что сервис «слышит».
  const REWARDS = {
    1: {
      owner:     'Большинство собственников приходят с одним вопросом: куда уходят деньги. Разбираемся.',
      financier: 'Финансистов чаще всего приводит запрос: почему экспертиза не слышна собственнику. Посмотрим.',
      other:     'Руководители направлений обычно видят срез своей зоны. Покажем всю картину бизнеса.'
    },
    3: {
      construction: 'В строительстве частая зона потерь — субподряд без детализации по объектам. Учтём.',
      it:           'В IT критична связка кассовых разрывов и этапных оплат. Вопросы подобраны под это.',
      agency:       'В агентствах рентабельность по клиентам обычно скрыта в накладных. Идём дальше.',
      production:   'В производстве ключевое — рентабельность по продуктам, а не суммарная. Проверим.',
      services:     'В услугах ФОТ — основная статья, и её распределение по направлениям меняет картину.',
      other:        'При смешанной модели диагностика собирается точечно. Настроим под вашу ситуацию.'
    },
    4: {
      none:    'Учёт в голове работает до определённого масштаба. Узнаем, прошли ли вы порог.',
      excel:   'Excel — самый распространённый стартовый инструмент. И самое частое узкое место при росте.',
      '1c':    '1С закрывает налоговый контур. Вопрос в том, что показывает цифры для решений.',
      other:   'Самописная система часто компромисс. Проверим, где она перестаёт справляться.',
      service: 'Специализированный сервис — хороший знак. Посмотрим, все ли контуры закрыты.'
    },
    5: {
      margin_blind:   'По нашим данным, 67% собственников не могут в моменте назвать самое прибыльное направление.',
      late_loss:      'Убытки задним числом — одна из частых причин обращения к управленческому учёту.',
      cash_surprise:  'Кассовые разрывы без предупреждения — по нашим данным, типично для 73% компаний до системы.',
      data_lag:       'Задержка данных в 2–3 недели — стандартная ситуация без автоматизированного сбора.',
      no_big_picture: 'Отсутствие единой картины — самая частая причина запроса системы управленческого учёта.'
    }
  };

  function showReward(stepId, value) {
    const el = document.getElementById('reward-' + stepId);
    if (!el) return;
    const dict = REWARDS[stepId] || {};
    const text = dict[value];
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.hidden = false;
    // Re-trigger fade animation
    el.classList.remove('is-visible');
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;
    el.classList.add('is-visible');
  }

  // ── Init ─────────────────────────────────────────────────
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

    // Step 1 — Role (auto-advance on select + микро-награда)
    $$('#step-1 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-1 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.role = btn.dataset.value;
        ym('reachGoal', 'moneydiag_role_selected');
        showReward(1, state.role);
        setTimeout(goNext, 1400);
      };
    });

    // Step 2 — Revenue slider + anti-ICP
    const revSlider = $('f-revenue');
    const revReadout = $('sr-revenue-value');
    const revSub = $('sr-revenue-sub');
    const revZoneLbl = $('sr-zone-label');

    function formatMoneyMonth(m) {
      if (m >= 1_000_000) return Math.round(m / 1_000_000) + ' млн ₽/мес';
      return Math.round(m / 1000) + ' тыс ₽/мес';
    }

    function updateRevenue() {
      state.revenueIdx = Number(revSlider.value);
      state.monthlyRevenue = C.revenueFromSliderIndex(state.revenueIdx);
      revReadout.textContent = C.revenueLabel(state.revenueIdx);
      if (revSub) revSub.textContent = '~ ' + formatMoneyMonth(state.monthlyRevenue);
      // Убраны «Подходящий/Пограничный масштаб» зоны — это внутренний ICP-фильтр,
      // клиенту не важно. При обороте < 24 млн ₽/год срабатывает soft-reject экран.
      if (revZoneLbl) revZoneLbl.hidden = true;
      $('btn-next').disabled = false;
    }
    revSlider.addEventListener('input', updateRevenue);
    revSlider.addEventListener('change', () => {
      updateRevenue();
      ym('reachGoal', 'moneydiag_revenue_selected');
      if (state.monthlyRevenue < 2_000_000) {
        ym('reachGoal', 'moneydiag_anti_icp_view');
        showStep('anti-icp');
        $('step-nav').hidden = true;
        $('aic-back').onclick = () => { state.cursor++; goCurrent(); };
      }
    });
    updateRevenue();

    // Позиционирование тиков по data-pos (абсолютное выравнивание)
    $$('.slider-ticks-v2 span').forEach(el => {
      const pos = el.dataset.pos;
      if (pos != null) el.style.left = pos + '%';
    });

    // Step 3 — Industry
    $$('#step-3 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-3 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.industry = btn.dataset.value;
        ym('reachGoal', 'moneydiag_industry_selected');
        showReward(3, state.industry);
        setTimeout(goNext, 1400);
      };
    });

    // Step 4 — Accounting system (single choice)
    $$('#step-4 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-4 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.accountingSystem = btn.dataset.value;
        ym('reachGoal', 'moneydiag_system_selected');
        showReward(4, state.accountingSystem);
        setTimeout(goNext, 1400);
      };
    });

    // Step 5 — Primary pain (single choice)
    $$('#step-5 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-5 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.primaryPain = btn.dataset.value;
        ym('reachGoal', 'moneydiag_pain_selected');
        showReward(5, state.primaryPain);
        setTimeout(goNext, 1400);
      };
    });

    // AHA continue
    $('btn-aha-continue').onclick = () => goNext();
    // Micro-breakdown continue
    const btnMb = $('btn-mb-continue');
    if (btnMb) btnMb.onclick = () => goNext();

    // Nav buttons
    $('btn-next').onclick = goNext;
    $('btn-back').onclick = goBack;

    // Cookie banner
    if (!localStorage.getItem('fintablo_cookies')) {
      setTimeout(() => $('cookie-banner').classList.add('visible'), 800);
    }
    $('cb-accept').onclick = () => {
      localStorage.setItem('fintablo_cookies', '1');
      $('cookie-banner').classList.remove('visible');
    };

    // beforeunload warning
    window.addEventListener('beforeunload', (e) => {
      if (window._moneydiag_navigating) return;
      if (state.cursor > 2 && !state.leadSent) {
        if (countAnswered() >= 3) {
          ym('reachGoal', 'moneydiag_abandoned_after_aha');
          ym('reachGoal', 'moneydiag_pixel_warm');
        }
        e.preventDefault();
        e.returnValue = '';
      }
    });

    window._moneydiag_finishContact = finishContact;
  }

  function finishContact() {
    state.leadSent = true;
    ym('reachGoal', 'moneydiag_pixel_hot');
    persistState();
    // После лида сразу в отчёт
    finishQuiz();
  }

  function restoreInputs() {
    if (state.revenueIdx != null) {
      $('f-revenue').value = state.revenueIdx;
      $('sr-revenue-value').textContent = C.revenueLabel(state.revenueIdx);
    }
    if (state.role) {
      const b = document.querySelector('#step-1 .option-card[data-value="' + state.role + '"]');
      if (b) b.classList.add('selected');
    }
    if (state.industry) {
      const b = document.querySelector('#step-3 .option-card[data-value="' + state.industry + '"]');
      if (b) b.classList.add('selected');
    }
    if (state.accountingSystem) {
      const b = document.querySelector('#step-4 .option-card[data-value="' + state.accountingSystem + '"]');
      if (b) b.classList.add('selected');
    }
    if (state.primaryPain) {
      const b = document.querySelector('#step-5 .option-card[data-value="' + state.primaryPain + '"]');
      if (b) b.classList.add('selected');
    }
  }

  function persistState() {
    S.saveState({
      cursor: state.cursor,
      role: state.role,
      revenueIdx: state.revenueIdx,
      monthlyRevenue: state.monthlyRevenue,
      industry: state.industry,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain,
      leadSent: state.leadSent,
      startedAt: state.startedAt
    });
  }

  // ── AHA (step 65) — профиль + ролевой хук + цена + путь + зеркало ──
  function renderAha() {
    const full = C.computeAll({
      role: state.role,
      monthlyRevenue: state.monthlyRevenue,
      industry: state.industry,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain
    });

    // Иконка профиля (inline SVG)
    const iconEl = $('aha-profile-icon');
    if (iconEl) iconEl.innerHTML = C.PROFILE_ICONS[full.profileCode] || '';

    setTyped($('aha-profile-name'), full.profileName);
    const descEl = $('aha-profile-desc'); setTyped(descEl, full.profileDescription);

    // Ролевой хук
    const frameEl = $('aha-role-frame');
    if (frameEl) {
      if (full.roleFrame) { setTyped(frameEl, full.roleFrame); frameEl.hidden = false; }
      else frameEl.hidden = true;
    }

    // Когортный инсайт (PLG-глубина)
    const cohEl = $('aha-cohort-insight');
    if (cohEl) {
      if (full.cohortInsight) { setTyped(cohEl, full.cohortInsight); cohEl.hidden = false; }
      else cohEl.hidden = true;
    }

    // Цена бездействия — финансовая оценка наверху карточки
    const priceEl = $('aha-inaction-price');
    if (priceEl) priceEl.textContent = C.formatMoneyCompact(full.estimatedAnnualLoss);

    if (full.inaction) {
      setTyped($('aha-inaction-title'), full.inaction.title);
      setTyped($('aha-inaction-body'), full.inaction.body);
    }

    // Путь выхода (3 шага)
    const pathEl = $('aha-path-out');
    if (pathEl) {
      pathEl.innerHTML = '';
      (full.pathOut || []).forEach(s => {
        const li = document.createElement('li');
        li.textContent = typograph(s);
        pathEl.appendChild(li);
      });
    }

    const qList = $('aha-questions');
    qList.innerHTML = '';
    full.mirrorQuestions.forEach(q => {
      const li = document.createElement('li');
      li.textContent = typograph(q);
      qList.appendChild(li);
    });

    setTyped($('aha-benchmark-industry'), full.industryBenchmark || '');
    setTyped($('aha-benchmark-scale'), full.revenueModifier || '');
  }

  // ── Role-aware labels для step-5 (боли) ─────────────────
  function applyRoleAwarePainLabels() {
    const role = state.role || 'owner';
    const dict = (C.PAIN_LABELS_BY_ROLE && C.PAIN_LABELS_BY_ROLE[role]) || (C.PAIN_LABELS_BY_ROLE && C.PAIN_LABELS_BY_ROLE.other) || null;
    if (!dict) return;
    $$('#step-5 .option-card').forEach(btn => {
      const code = btn.dataset.value;
      const entry = dict[code];
      if (!entry) return;
      const t = btn.querySelector('.oc-title');
      const s = btn.querySelector('.oc-sub');
      if (t) t.textContent = entry.title;
      if (s) s.textContent = entry.sub;
    });
  }

  // Топ-2 зоны потерь по отрасли (используются на шаге 66).
  // Дубль упрощённых карточек от report.js, чтобы квиз не зависел от report.js.
  const MB_LEAKS = {
    construction: [
      { title: 'Субподряд без детализации по объектам',  body: 'Акт закрыт — факт по затратам на 15–20% выше плановых. Типовая ситуация в строительстве, которую видно постфактум.' },
      { title: 'Кассовый разрыв на стыках этапов',        body: 'Обязательства по зарплате и материалам идут непрерывно, поступления — по актам. Разрыв проявляется без предупреждения.' }
    ],
    it: [
      { title: 'Кассовый разрыв между этапами оплат',     body: 'Аванс израсходован, следующий платёж через 3–4 недели, команда работает непрерывно.' },
      { title: 'Рентабельность проекта видна только в конце', body: 'Пока спринт в работе — рентабельность неизвестна. Отклонения от плана фиксируются постфактум.' }
    ],
    agency: [
      { title: 'Рентабельность распределяется на накладные', body: 'Внешние услуги и субподряд не декомпозируются по клиентам. Суммарно прибыль положительная, при разбивке по клиентам встречаются убыточные.' },
      { title: 'Дебиторка накапливается незаметно',          body: 'Без системного контроля оплат долги аккумулируются, и кассовый разрыв возникает там, где его не планировали.' }
    ],
    production: [
      { title: 'ФОТ и материалы не по продуктам',            body: 'Без распределения затрат рентабельность видна суммарно, а не по продукту. Какой реально зарабатывает — неизвестно.' },
      { title: 'Кассовый разрыв на закупках',                body: 'Сырьё оплачивается заранее, поступления от клиентов — позже. Без прогноза ДДС разрывы возникают регулярно.' }
    ],
    services: [
      { title: 'Рентабельность по направлениям не разложена', body: 'Услуги суммарно прибыльные, но вклад каждого направления в прибыль не разложен по данным.' },
      { title: 'ФОТ — основная статья, без аллокации',         body: '60–80% затрат — это люди. Без распределения времени по направлениям рентабельность считается усреднённо.' }
    ],
    other: [
      { title: 'Рентабельность в моменте недоступна',         body: 'Пока направление активно, его рентабельность неизвестна. Управление идёт на основании опыта, а не данных.' },
      { title: 'План-факт собирается вручную',                 body: 'Каждое сведение данных занимает часы. Анализ отклонений делается реже, чем того требует ситуация.' }
    ]
  };

  // Имена для мок-карточки — синхронизировано с report.js
  const MOCK_NAMES_BY_INDUSTRY = {
    construction: ['Объект «Невский»',       'Объект «Северный»',    'Объект «Марьино»'],
    it:           ['Проект А · корпоративный клиент', 'Проект Б · розничная сеть', 'Проект В · финансовый сервис'],
    agency:       ['Клиент «Альфа»',          'Клиент «Омега»',        'Клиент «Сигма»'],
    production:   ['Линия A',                 'Линия B',               'Линия C'],
    services:     ['Консалтинг',              'Внедрение',             'Сопровождение'],
    other:        ['Направление A',           'Направление B',         'Направление C']
  };

  // ── Micro-breakdown (step 66) ───────────────────────────
  function renderMicrobreakdown() {
    const r = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain
    });

    // Block 1: индекс + бенчмарк-бар
    $('mb-index').textContent = r.transparencyIndex;
    const z = $('mb-zone');
    if (z) {
      z.textContent = r.zoneLabel || '—';
      z.className = 'mb-zone ric-zone-' + (r.zoneCode || 'red');
    }
    const you = $('mb-bm-you');   if (you)  you.style.left  = r.transparencyIndex + '%';
    const peer = $('mb-bm-peer'); if (peer) peer.style.left = r.peerIndex + '%';
    const top = $('mb-bm-top');   if (top)  top.style.left  = r.topIndex + '%';
    const systemLabels = { none: 'без системного учёта', excel: 'с Excel', '1c': 'с 1С', other: 'с самописной системой', service: 'со специализированным сервисом' };
    const sysLabel = systemLabels[r.accountingSystem] || 'с текущей системой';
    $('mb-cohort').textContent = typograph(
      'Типовой индекс для компаний вашего масштаба ' + sysLabel + ' — около ' + r.peerIndex + '. У 25% наиболее зрелых похожих компаний — от ' + r.topIndex + '. Разница с вашим ' + r.transparencyIndex + ' — это и есть разрыв, который закрывает система.'
    );

    // Block 2: топ-2 зоны потерь
    const leaks = MB_LEAKS[state.industry] || MB_LEAKS.other;
    const lEl = $('mb-leaks');
    if (lEl) {
      lEl.innerHTML = '';
      leaks.slice(0, 2).forEach(l => {
        const card = document.createElement('div');
        card.className = 'mb-leak-card';
        const t = document.createElement('div'); t.className = 'mbl-title'; t.textContent = typograph(l.title);
        const b = document.createElement('div'); b.className = 'mbl-body'; b.textContent = typograph(l.body);
        card.appendChild(t); card.appendChild(b);
        lEl.appendChild(card);
      });
    }

    // Block 3: actionable tip
    if (r.actionableTip) {
      setTyped($('mb-tip-title'), r.actionableTip.title);
      setTyped($('mb-tip-body'), r.actionableTip.body);
    }

    // Block 4: мок-карточка с именами под отрасль
    const names = MOCK_NAMES_BY_INDUSTRY[state.industry] || MOCK_NAMES_BY_INDUSTRY.other;
    ['mb-mc-m1', 'mb-mc-m2', 'mb-mc-m3'].forEach((id, i) => {
      const el = $(id); if (el) el.textContent = names[i];
    });
  }

  // ── Contact gate (step 10) ──────────────────────────────
  function renderContactGate() {
    const r = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain
    });

    $('contact-profile-name').textContent = r.profileName;
    $('contact-loss').textContent = C.formatMoneyCompact(r.estimatedAnnualLoss) + '/год';
    $('contact-index').textContent = r.transparencyIndex + ' / 100';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
