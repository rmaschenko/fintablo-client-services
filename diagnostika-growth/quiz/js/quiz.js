/* ═════ QUIZ · 6-шаговая воронка diagnostika-growth ═════
   После 6-го вопроса → Calculator.computeAll() → redirect на report.html.
   Без отдельного AHA-экрана: разбор открывается сразу в report.html. */
(function () {
  'use strict';

  const C = window.Calculator;
  const S = window.Storage;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => (root || document).querySelectorAll(sel);

  // Welcome убран — сразу первый вопрос (без дубля лендинга)
  const STEP_ORDER = [1, 2, 3, 4, 5, 6];
  const TOTAL_QUESTIONS = 6;

  const PROGRESS_LABELS = {
    1: 'Хорошее начало',
    2: 'Разгоняемся',
    3: 'Треть пути',
    4: 'Половина',
    5: 'Почти готово',
    6: 'Последний вопрос'
  };

  // ── State ────────────────────────────────────────────────
  const state = {
    cursor: 0,
    role: null,            // owner / financier / accountant / other
    businessType: null,    // project / production / services / trade
    annualRevenue: null,   // млн ₽/год (число)
    businessAge: null,     // young / mid / mature / veteran
    primaryPain: null,     // margin_blind / cash_surprise / manual_close / blind_decisions
    cfoStatus: null,       // yes_cfo / yes_specialist / part_time / no
    startedAt: Date.now(),
    leadSent: false
  };

  // ── Helpers ──────────────────────────────────────────────
  const SHORT_WORDS = ['в','во','на','с','со','за','по','до','от','из','ко','об','о','у','к','и','а','я','но','не','ни','для','без','про','под','над','при','что','как','это','или','же','бы','ли','чем','был','ещё','уж','вы'];
  const SW_RE = new RegExp('(^|[\\s(«"\'—])(' + SHORT_WORDS.join('|') + ')(\\s)', 'giu');
  function typograph(s) {
    if (s == null) return s;
    let out = String(s);
    for (let i = 0; i < 2; i++) out = out.replace(SW_RE, '$1$2 ');
    out = out
      .replace(/(\d)\s(₽|руб|млн|млрд|тыс|ч|мес|%|дн|дней|лет|года|год|месяц[ауев]?|дня|часов)/g, '$1 $2')
      .replace(/\s—\s/g, ' — ')
      .replace(/\bот\s(\d)/g, 'от $1')
      .replace(/\bдо\s(\d)/g, 'до $1');
    return out;
  }

  function showStep(id) {
    $$('.step').forEach(s => s.classList.remove('active'));
    const el = $('step-' + id);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.ym) ym(61131877, 'reachGoal', 'dg_step_' + id);
  }

  function currentStepId() { return STEP_ORDER[state.cursor]; }

  function updateProgress() {
    const wrap = $('progress-wrapper');
    const stepId = currentStepId();
    if (stepId === 0) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const stepIdx = stepId; // 1..6
    const pct = Math.round((stepIdx / TOTAL_QUESTIONS) * 100);
    $('progress-fill').style.width = pct + '%';
    $('progress-label').textContent = PROGRESS_LABELS[stepIdx] || ('Шаг ' + stepIdx);
  }

  function showNav(stepId) {
    const nav = $('quiz-nav');
    if (stepId === 0) { nav.hidden = true; return; }
    nav.hidden = false;
    const back = $('btn-back');
    back.style.visibility = stepId > 1 ? 'visible' : 'hidden';
    $('btn-next').disabled = !isStepValid(stepId);
  }

  function isStepValid(stepId) {
    switch (stepId) {
      case 1: return !!state.role;
      case 2: return !!state.businessType;
      case 3: return state.annualRevenue != null;
      case 4: return !!state.businessAge;
      case 5: return !!state.primaryPain;
      case 6: return !!state.cfoStatus;
      default: return true;
    }
  }

  // ── Navigation ───────────────────────────────────────────
  function goNext() {
    if (state.cursor >= STEP_ORDER.length - 1) return finishQuiz();
    state.cursor++;
    goCurrent();
  }
  function goBack() {
    if (state.cursor > 0) { state.cursor--; goCurrent(); }
  }
  function goCurrent() {
    const id = currentStepId();
    showStep(id);
    updateProgress();
    showNav(id);
    persistState();
  }

  function finishQuiz() {
    if (window.ym) ym(61131877, 'reachGoal', 'dg_quiz_complete');
    // Считаем профиль и сохраняем для report.html
    const computed = C.computeAll({
      role: state.role,
      businessType: state.businessType,
      annualRevenue: state.annualRevenue,
      businessAge: state.businessAge,
      primaryPain: state.primaryPain,
      cfoStatus: state.cfoStatus
    });
    S.saveReportData(Object.assign({}, computed, { startedAt: state.startedAt }));
    // Передаём UTM в report.html (для финальной развилки)
    const utm = (function(){ try { return localStorage.getItem('ft_utm') || ''; } catch(e){ return ''; } })();
    location.href = 'report.html' + (utm ? '?has_utm=1' : '');
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    if (window.ym) ym(61131877, 'reachGoal', 'dg_quiz_loaded');

    // Restore state if any (loadState возвращает {data, ts} с TTL-проверкой внутри)
    const saved = S.loadState();
    if (saved && saved.data && saved.data.cursor > 0) {
      const rb = $('resume-banner');
      rb.hidden = false;
      $('rb-ago').textContent = S.agoText(saved.ts);
      $('rb-resume').addEventListener('click', () => {
        Object.assign(state, saved.data);
        rb.hidden = true;
        goCurrent();
      });
      $('rb-reset').addEventListener('click', () => {
        S.clearState();
        rb.hidden = true;
      });
    }

    // Welcome убран — квиз стартует с шага 1 сразу
    if (window.ym) ym(61131877, 'reachGoal', 'dg_quiz_start');

    // Option cards (auto-advance after click)
    $$('.option-card').forEach(card => {
      card.addEventListener('click', () => {
        const step = card.closest('.step');
        const stepId = parseInt(step.id.replace('step-', ''), 10);
        const value = card.getAttribute('data-value');

        // Snimaem selected у соседей
        $$('.option-card', step).forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Fix state
        switch (stepId) {
          case 1: state.role = value; break;
          case 2: state.businessType = value; break;
          case 3: state.annualRevenue = parseFloat(value); break;
          case 4: state.businessAge = value; break;
          case 5: state.primaryPain = value; break;
          case 6: state.cfoStatus = value; break;
        }
        persistState();

        // Auto-advance с маленькой паузой для visual feedback
        setTimeout(() => {
          if (stepId === 6) finishQuiz();
          else goNext();
        }, 280);
      });
    });

    // Nav buttons
    $('btn-back').addEventListener('click', goBack);
    $('btn-next').addEventListener('click', goNext);

    // Cookie banner
    try {
      const cb = $('cookie-banner');
      if (cb && !localStorage.getItem('ft_cookie_ok')) {
        cb.classList.add('is-active');
      }
      $('cb-accept').addEventListener('click', () => {
        try { localStorage.setItem('ft_cookie_ok', '1'); } catch(e) {}
        cb.classList.remove('is-active');
      });
    } catch(e) {}

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && state.cursor > 0) goBack();
      if (e.key === 'ArrowRight' && isStepValid(currentStepId())) goNext();
    });

    // Показать первый шаг (прогресс + nav)
    goCurrent();
  }

  function persistState() {
    state.savedAt = Date.now();
    S.saveState(state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
