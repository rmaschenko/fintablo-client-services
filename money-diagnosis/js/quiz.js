/* ═════ QUIZ · 5-шаговая воронка + AHA + гейт ═════ */
(function () {
  'use strict';

  const C = window.Calculator;
  const S = window.Storage;

  // Порядок шагов (v6 · +2 SPIN-вопроса перед AHA)
  // 0 welcome → 1..5 quiz → 6 team-hours (факт) → 7 readiness → 65 peak → report
  // Шаг 6 даёт фактические часы команды для формулы слепой зоны (вместо допущения).
  // Шаг 7 квалифицирует лид на readiness и даёт карточку «Ваш первый шаг» на AHA.
  const STEP_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 65];
  const TOTAL_QUESTIONS = 7;

  // ── State ────────────────────────────────────────────────
  const state = {
    cursor: 0,
    role: null,
    monthlyRevenue: 5_000_000,  // дефолт — 60 млн ₽/год
    annualRevenue: 60_000_000,
    industry: null,
    accountingSystem: null, // single choice
    primaryPain: null,
    teamHours: null,        // 'low' | 'mid' | 'high' | 'huge' — фактические часы команды
    readiness: null,        // 'cut' | 'plan' | 'never' — что сделает первым
    name: '',               // имя, введённое в форме peak (persist для resume)
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
    if (state.teamHours) n++;
    if (state.readiness) n++;
    return n;
  }

  // Состояния прогресса — мотивационные подписи вместо «N из 7»
  // (по гайду quiz UX: знаменатель пугает, состояние вдохновляет).
  const PROGRESS_LABELS = {
    1: 'Хорошее начало',
    2: 'Разгоняемся',
    3: 'Треть пути',
    4: 'Почти половина',
    5: 'Собираем картину',
    6: 'Почти готово',
    7: 'Последний вопрос'
  };

  function updateProgress() {
    const wrap = $('progress-wrapper');
    const stepId = currentStepId();
    if (stepId === 0 || stepId === 65) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const stepIdx = [1, 2, 3, 4, 5, 6, 7].indexOf(stepId) + 1;
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
    const hideNav = [0, 65].indexOf(stepId) !== -1;
    nav.hidden = hideNav;

    const btnBack = $('btn-back');
    const btnNext = $('btn-next');
    btnBack.hidden = state.cursor <= 1;
    btnNext.hidden = false;
    btnNext.disabled = !isStepValid(stepId);
  }

  function isStepValid(stepId) {
    switch (stepId) {
      case 1: return !!state.role;
      case 2: return state.monthlyRevenue > 0;
      case 3: return !!state.industry;
      case 4: return !!state.accountingSystem;
      case 5: return !!state.primaryPain;
      case 6: return !!state.teamHours;
      case 7: return !!state.readiness;
      default: return true;
    }
  }

  function finishQuiz() {
    const computed = C.computeAll({
      role: state.role,
      industry: state.industry,
      monthlyRevenue: state.monthlyRevenue,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain,
      teamHours: state.teamHours,
      readiness: state.readiness
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
    2: {
      '12':  'На этом масштабе управленческие решения обычно держатся «в голове» — покажем, с какого рубежа это ломается.',
      '50':  'Большинство компаний этого масштаба начинают ощущать разрыв между выручкой и реальной маржой — разберёмся, где.',
      '250': 'На этом обороте, по нашим данным, 8–12% годовой рентабельности «живёт» вне управленческого учёта. Посмотрим у вас.',
      '800': 'При такой выручке даже 2–3% непрозрачности — это десятки миллионов в год. Разбираемся точнее.'
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
      excel:   'Excel — самый распространённый стартовый инструмент. И самое частое ограничение инструмента при росте.',
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
    },
    6: {
      low:  'Редкий уровень автоматизации — так работает меньше 12% компаний вашего масштаба.',
      mid:  'Типовой режим без сквозной автоматизации. Это 10–20 ч аналитика, которых нет на выводы.',
      high: 'Несколько дней в месяц уходит на сверку — по нашим данным, каждая вторая компания на Excel.',
      huge: 'Больше 40 ч/мес на сверку — это почти ставка финансиста, уходящая в рутину, а не в анализ.'
    },
    7: {
      cut:   'Частый ответ у тех, кто давно подозревает, но боится ошибиться в суждении без цифр.',
      plan:  'Типовой запрос на горизонт: от «вчера» к «на 2–3 месяца вперёд» — это ключевой сдвиг.',
      never: 'Честный ответ. План «30/60/90» в отчёте покажет первый шаг, который реально доступен.'
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

    // Step 2 — Revenue: 4 диапазона как single-choice (как step-1/3/4/5).
    // data-value — средняя точка диапазона в млн ₽/год (используется для расчётов).
    // По гайду UX квизов: кнопки-диапазоны, auto-advance, один экран без перегрузки.
    $$('#step-2 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-2 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const annualMln = Number(btn.dataset.value);
        state.annualRevenue = annualMln * 1_000_000;
        state.monthlyRevenue = Math.round(state.annualRevenue / 12);
        ym('reachGoal', 'moneydiag_revenue_selected');
        showReward(2, String(annualMln));
        setTimeout(goNext, 1400);
      };
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

    // Step 6 — Фактические часы команды на сверку (кормит формулу слепой зоны)
    $$('#step-6 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-6 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.teamHours = btn.dataset.value;
        ym('reachGoal', 'moneydiag_teamhours_selected');
        showReward(6, state.teamHours);
        setTimeout(goNext, 1400);
      };
    });

    // Step 7 — Readiness (квалификация + карточка «Ваш первый шаг» на AHA)
    $$('#step-7 .option-card').forEach(btn => {
      btn.onclick = () => {
        $$('#step-7 .option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.readiness = btn.dataset.value;
        ym('reachGoal', 'moneydiag_readiness_selected');
        showReward(7, state.readiness);
        setTimeout(goNext, 1400);
      };
    });

    // Peak-экран v5: KPI-breakdown раскрывается кликом «откуда эта оценка»
    const kpiBtn = $('kpi-expand-btn');
    const kpiBd = $('kpi-breakdown');
    if (kpiBtn && kpiBd) {
      kpiBtn.addEventListener('click', () => {
        const open = !kpiBd.hasAttribute('hidden') ? false : true;
        if (open) { kpiBd.hidden = false; kpiBtn.setAttribute('aria-expanded', 'true'); kpiBtn.classList.add('is-open'); ym('reachGoal', 'moneydiag_kpi_expand'); }
        else      { kpiBd.hidden = true;  kpiBtn.setAttribute('aria-expanded', 'false'); kpiBtn.classList.remove('is-open'); }
      });
    }

    // ── GATE · soft lead capture между AHA и микро-разбором ─
    initGateForm();

    // ── UTM → Dynamic H1 (message match) ─
    applyUtmHeroVariant();

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
    if (state.role) {
      const b = document.querySelector('#step-1 .option-card[data-value="' + state.role + '"]');
      if (b) b.classList.add('selected');
    }
    if (state.annualRevenue) {
      const annualMln = Math.round(state.annualRevenue / 1_000_000);
      // Подсветить ближайшую кнопку-диапазон на step-2 по value
      const b2 = document.querySelector('#step-2 .option-card[data-value="' + annualMln + '"]');
      if (b2) b2.classList.add('selected');
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
    if (state.teamHours) {
      const b = document.querySelector('#step-6 .option-card[data-value="' + state.teamHours + '"]');
      if (b) b.classList.add('selected');
    }
    if (state.readiness) {
      const b = document.querySelector('#step-7 .option-card[data-value="' + state.readiness + '"]');
      if (b) b.classList.add('selected');
    }
    // Имя — для peak-формы, если resume посадил пользователя прямо на peak-экран
    if (state.name) {
      const nameIn = $('gate-name');
      if (nameIn && !nameIn.value) nameIn.value = state.name;
      const nameHook = $('peak-form-name');
      if (nameHook && !nameHook.textContent && state.name.length >= 2) {
        nameHook.textContent = 'для ' + state.name;
      }
    }
  }

  function persistState() {
    S.saveState({
      cursor: state.cursor,
      role: state.role,
      monthlyRevenue: state.monthlyRevenue,
      industry: state.industry,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain,
      teamHours: state.teamHours,
      readiness: state.readiness,
      name: state.name,
      leadSent: state.leadSent,
      startedAt: state.startedAt
    });
  }

  // ── Peak-экран (step 65) v6 — hero-профиль + плотная KPI-сетка + Финтабло visual-first ──
  function renderAha() {
    const full = C.computeAll({
      role: state.role,
      monthlyRevenue: state.monthlyRevenue,
      industry: state.industry,
      accountingSystem: state.accountingSystem,
      primaryPain: state.primaryPain,
      teamHours: state.teamHours,
      readiness: state.readiness
    });
    state._aha = full;

    // 1. Hero: иконка профиля + severity + название + короткое описание
    const iconEl = $('aha-profile-icon');
    if (iconEl) iconEl.innerHTML = (C.PROFILE_ICONS && C.PROFILE_ICONS[full.profileCode]) || '';
    const pill = $('aha-severity-pill');
    if (pill && full.severity) {
      pill.textContent = full.severity.label;
      pill.className = 'peak-severity peak-severity-' + full.severity.code;
    }
    setTyped($('aha-profile-name'), full.profileName);
    setTyped($('aha-profile-desc'), full.profileDescription || '');

    // 2. Персональное узнавание — короткий AHA-блок
    setTyped($('aha-insight-body'), full.ahaInsight || '');

    // 3. KPI: 3 равные карточки
    const priceEl = $('aha-main-price');
    if (priceEl) priceEl.textContent = C.formatMoneyCompact(full.estimatedAnnualLoss).replace('\u00A0₽', '');

    const idxEl = $('aha-index'); if (idxEl) idxEl.textContent = full.transparencyIndex;
    const zoneEl = $('aha-zone');
    if (zoneEl) {
      zoneEl.textContent = full.zoneLabel || '';
      zoneEl.className = 'pkc-zone peak-zone-' + (full.zoneCode || 'red');
    }
    const teamH = $('aha-team-hours');
    if (teamH && full.lossBreakdown && full.lossBreakdown.teamTime) teamH.textContent = full.lossBreakdown.teamTime.hours;
    const teamZone = $('aha-team-zone');
    if (teamZone && full.lossBreakdown && full.lossBreakdown.teamTime) {
      const hours = full.lossBreakdown.teamTime.hours;
      teamZone.textContent = hours >= 35 ? 'Выше нормы' : hours >= 20 ? 'Средне' : 'Близко к цели';
      teamZone.className = 'pkc-zone peak-zone-' + (hours >= 35 ? 'red' : hours >= 20 ? 'orange' : 'green');
    }

    // KPI-раскрытие: что стоит за цифрой
    const bd = full.lossBreakdown;
    if (bd) {
      const pkbHours = $('pkb-hours'); if (pkbHours) pkbHours.textContent = bd.teamTime.hours;
      const pkbRate  = $('pkb-rate');  if (pkbRate)  pkbRate.textContent  = C.formatMoneyCompact(bd.teamTime.hourlyCost) + '/ч';
      const pkbTeam  = $('pkb-team');  if (pkbTeam)  pkbTeam.textContent  = '~ ' + C.formatMoneyCompact(bd.teamTime.annual);
      const pkbHid   = $('pkb-hidden');if (pkbHid)   pkbHid.textContent   = '~ ' + C.formatMoneyCompact(bd.hiddenDrops.annual);
      const pkbDel   = $('pkb-delay'); if (pkbDel)   pkbDel.textContent   = '~ ' + C.formatMoneyCompact(bd.delay.annual);
    }

    // 4.5 Ваш первый шаг — на основе readiness-ответа (step 7)
    const fsWrap = $('aha-firststep');
    if (fsWrap) {
      if (full.readinessInsight) {
        fsWrap.hidden = false;
        const fsEye = $('aha-firststep-eyebrow'); if (fsEye) fsEye.textContent = full.readinessInsight.eyebrow;
        setTyped($('aha-firststep-title'), full.readinessInsight.title);
        setTyped($('aha-firststep-desc'),  full.readinessInsight.body);
      } else {
        fsWrap.hidden = true;
      }
    }

    // 4. 3 утечки с замком — teaser
    const leaksEl = $('aha-teaser-leaks');
    if (leaksEl) {
      leaksEl.innerHTML = '';
      (full.teaserLeaks || []).slice(0, 3).forEach((title, i) => {
        const li = document.createElement('li');
        li.className = 'peak-leak';
        li.innerHTML =
          '<span class="peak-leak-lock" aria-hidden="true">' +
            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 016 0v3"/></svg>' +
          '</span>' +
          '<span class="peak-leak-num">' + (i + 1) + '</span>' +
          '<span class="peak-leak-title"></span>';
        li.querySelector('.peak-leak-title').textContent = typograph(title);
        leaksEl.appendChild(li);
      });
    }

    // 5. Финтабло-блок: проекция возврата — тонкая строка с диапазоном ₽, без обещаний
    const projRange = $('peak-proj-range');
    if (projRange && full.fintabloProjection) {
      projRange.textContent =
        '(≈\u00A0' + C.formatMoneyCompact(full.fintabloProjection.low) + '\u00A0–\u00A0' +
        C.formatMoneyCompact(full.fintabloProjection.high) + '/год)';
    }

    // 4 функции под профиль × боль — product-preview
    const featsEl = $('peak-features');
    if (featsEl) {
      const feats = featuresForPeak(full.profileCode, full.primaryPain, full.industry);
      featsEl.innerHTML = '';
      feats.forEach(f => {
        const card = document.createElement('div');
        card.className = 'peak-feat';
        card.innerHTML =
          '<div class="peak-feat-ico" aria-hidden="true">' + f.ico + '</div>' +
          '<div class="peak-feat-body">' +
            '<div class="peak-feat-name"></div>' +
            '<div class="peak-feat-desc"></div>' +
          '</div>';
        card.querySelector('.peak-feat-name').textContent = f.name;
        card.querySelector('.peak-feat-desc').textContent = typograph(f.desc);
        featsEl.appendChild(card);
      });
    }

    // Peak-mockup v7: self-рендер KPI/bars убран, блок теперь — рамка-дэшборд
    // со слотом <img> под реальный скрин интерфейса Финтабло.
    // См. peak-mockup в index.html + .pm-screen стили в style.css.
  }

  // Фичи Финтабло для peak-экрана — 4 карточки под профиль + боль + отрасль.
  // Названия и описания подстраиваются под термины отрасли
  // (объекты/проекты/клиенты/продукты/направления) — без жаргона
  // и без сужения к одной отрасли, если не выбрана.
  function featuresForPeak(profileCode, primaryPain, industry) {
    const UNITS = (C.UNITS_BY_INDUSTRY && C.UNITS_BY_INDUSTRY[industry]) || (C.UNITS_BY_INDUSTRY && C.UNITS_BY_INDUSTRY.other) || { one: 'направление', many: 'направлениям', gen: 'направления' };

    const ICOS = {
      pnl:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><rect x="5" y="10" width="3" height="8"/><rect x="10" y="6" width="3" height="12"/><rect x="15" y="13" width="3" height="5"/></svg>',
      calendar:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
      planfact:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
      cashflow:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
      receivables:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v10H4z"/><path d="M8 3v4M16 3v4M8 12h8M8 15h5"/></svg>',
      dashboard:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/></svg>'
    };
    const FEATS = {
      pnl:          { name: 'ОПиУ по ' + UNITS.many,   desc: 'Маржинальность каждой линии видна в моменте, а не после закрытия периода.' },
      calendar:     { name: 'Платёжный календарь',     desc: 'Кассовый разрыв виден за 3–5 недель, а не за 3–5 дней до события.' },
      planfact:     { name: 'План-факт в моменте',     desc: 'Отклонения подсвечиваются сразу, без сборки в конце квартала.' },
      cashflow:     { name: 'Прогноз ДДС',             desc: 'Единый горизонт денежного потока по всем счетам и ' + UNITS.many + '.' },
      receivables:  { name: 'Контроль дебиторки',      desc: 'Реестр дебиторской задолженности с приоритетом по сумме и сроку.' },
      dashboard:    { name: 'Управленческий дашборд',  desc: 'Ключевые показатели бизнеса — ДДС, ОПиУ, план-факт — в одной форме.' }
    };
    // По боли — основная фича первой
    const byPain = {
      margin_blind:    ['pnl',      'planfact', 'dashboard',    'receivables'],
      late_loss:       ['pnl',      'planfact', 'cashflow',     'dashboard'],
      cash_surprise:   ['calendar', 'cashflow', 'receivables',  'pnl'],
      data_lag:        ['dashboard','cashflow', 'planfact',     'pnl'],
      no_big_picture:  ['dashboard','pnl',      'cashflow',     'planfact']
    };
    const codes = byPain[primaryPain] || byPain.no_big_picture;
    return codes.slice(0, 4).map(code => ({
      name: FEATS[code].name,
      desc: FEATS[code].desc,
      ico:  ICOS[code]
    }));
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

  // ── GATE (hard-gate: форма-стена между AHA и полным отчётом) ──
  function initGateForm() {
    const nameEl   = $('gate-name');
    const phoneEl  = $('gate-phone');
    const emailEl  = $('gate-email');
    const submitEl = $('btn-gate-submit');
    const phoneErr = $('gate-phone-err');
    const emailErr = $('gate-email-err');
    if (!nameEl || !phoneEl || !submitEl) return;
    const gateForm = $('gate-form');
    const hpEl = gateForm ? gateForm.querySelector('input[name="website"]') : null;

    const L = window.Lead;

    phoneEl.addEventListener('input', (e) => {
      e.target.value = L ? L.maskPhone(e.target.value) : e.target.value;
      phoneEl.classList.remove('error');
      if (phoneErr) phoneErr.hidden = true;
    });
    nameEl.addEventListener('input', () => {
      nameEl.classList.remove('error');
      // Live-персонализация eyebrow: «Разбор готов · для Иван»
      const nameHook = $('peak-form-name');
      if (nameHook) {
        const v = nameEl.value.trim();
        nameHook.textContent = (v.length >= 2 && !/\d/.test(v)) ? ('для ' + v) : '';
      }
    });
    if (emailEl) {
      emailEl.addEventListener('input', () => {
        emailEl.classList.remove('error');
        if (emailErr) emailErr.hidden = true;
      });
    }

    function validate() {
      let ok = true;
      const nameR  = L ? L.validateName(nameEl.value)   : { ok: nameEl.value.trim().length >= 2 };
      const phoneR = L ? L.validatePhone(phoneEl.value) : { ok: phoneEl.value.replace(/\D/g, '').length === 11 };
      // Email — опциональный. Валидируется только если пользователь начал вводить.
      const emailVal = emailEl ? emailEl.value.trim() : '';
      const emailR = (emailEl && emailVal)
        ? (L ? L.validateEmail(emailEl.value) : { ok: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal) })
        : { ok: true };
      if (!nameR.ok)  { nameEl.classList.add('error');  ok = false; }
      if (!phoneR.ok) {
        phoneEl.classList.add('error');
        if (phoneErr && phoneR.msg) { phoneErr.textContent = phoneR.msg; phoneErr.hidden = false; }
        ok = false;
      }
      if (!emailR.ok && emailEl) {
        emailEl.classList.add('error');
        if (emailErr && emailR.msg) { emailErr.textContent = emailR.msg; emailErr.hidden = false; }
        ok = false;
      }
      return ok;
    }

    function submitGate() {
      if (!validate()) return;
      // Honeypot — бот заполнил скрытое поле: молча имитируем успех, не шлём
      const isBot = !!(hpEl && hpEl.value);

      const computed = C.computeAll({
        role: state.role,
        industry: state.industry,
        monthlyRevenue: state.monthlyRevenue,
        accountingSystem: state.accountingSystem,
        primaryPain: state.primaryPain,
        teamHours: state.teamHours,
        readiness: state.readiness
      });
      const utm = S.getUTM ? (S.getUTM() || {}) : {};

      if (!isBot) {
        const payload = {
          name: nameEl.value.trim(),
          phone: phoneEl.value,
          email: emailEl ? emailEl.value.trim() : '',
          service: 'money-diagnosis',
          source: 'gate',
          answers: {
            role: state.role,
            industry: state.industry,
            monthlyRevenue: state.monthlyRevenue,
            accountingSystem: state.accountingSystem,
            primaryPain: state.primaryPain,
            teamHours: state.teamHours,
            readiness: state.readiness
          },
          metrics: computed,
          utm,
          pageUrl: window.location.href,
          referrer: document.referrer || '',
          timestamp: new Date().toISOString()
        };
        if (L && L.submitToApi) L.submitToApi(payload).catch(() => {});
        state.leadSent = true;
        ym('reachGoal', 'moneydiag_gate_submit');
        ym('reachGoal', 'moneydiag_pixel_hot');
      }

      // Сохраняем имя в state (для resume) и в отчёт (для report.html)
      state.name = nameEl.value.trim();
      S.saveReportData(Object.assign({}, computed, {
        name: state.name,
        leadSent: true
      }));

      persistState();
      submitEl.disabled = true;
      submitEl.textContent = 'Открываем разбор…';

      // Hard-gate: сразу в отчёт (минуя промежуточные шаги)
      finishQuiz();
    }

    submitEl.addEventListener('click', submitGate);
  }

  // ── UTM → Dynamic H1 (message match для сегментированного Директа) ──
  function applyUtmHeroVariant() {
    const h1 = document.getElementById('hero-h1');
    if (!h1) return;
    const params = new URLSearchParams(window.location.search);
    const content  = (params.get('utm_content')  || '').toLowerCase();
    const campaign = (params.get('utm_campaign') || '').toLowerCase();

    const variants = {
      stroy:      { h1: 'Упущенная прибыль в стройке — <span class="accent">оценка за 2 минуты</span>',            sub: 'Декомпозиция потерь по объектам, индекс прозрачности и ориентир возврата с Финтабло.' },
      it:         { h1: 'Упущенная прибыль в IT-проектах — <span class="accent">оценка за 2 минуты</span>',        sub: 'Где прячется маржинальность по проектам и клиентам — и как её вернуть с Финтабло.' },
      agency:     { h1: 'Упущенная прибыль агентства из-за учёта по ощущениям — <span class="accent">оценка за 2 минуты</span>', sub: 'Индекс прозрачности на фоне похожих агентств и ориентир возврата с Финтабло.' },
      production: { h1: 'Упущенная прибыль в производстве — <span class="accent">оценка за 2 минуты</span>',       sub: 'Декомпозиция потерь по продуктам, индекс прозрачности и ориентир возврата с Финтабло.' },
      fin_dir:    { h1: 'Индекс системности управленческого учёта — <span class="accent">оценка за 2 минуты</span>', sub: 'Сравнение с похожими компаниями и типовая траектория перехода в «системную прозрачность».' }
    };

    const keys = Object.keys(variants);
    const match = keys.find(k => content.indexOf(k) !== -1 || campaign.indexOf(k) !== -1);
    if (!match) return;

    h1.innerHTML = variants[match].h1;
    const heroSub = document.querySelector('.step-welcome .hero-sub');
    if (heroSub) heroSub.textContent = variants[match].sub;
    ym('reachGoal', 'moneydiag_utm_variant_' + match);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
