/* ═════ CHART · live viz (step-calc) + full report (step-report after gate) ═════ */
(function(global){
  'use strict';
  var MP = global.MoneyProfit = global.MoneyProfit || {};
  var c = MP.calc;

  function pct(val, max){ return Math.max(2, Math.round((val / Math.max(max, 1)) * 100)); }

  /* ── Горизонтальный сравн-чарт (используется на step-calc и внутри report) ── */
  function renderLive(container, model, industry){
    var fmt = c.formatRub;
    var max = Math.max(model.earnedRevenue, model.expenses, model.balance, 1);
    var gapCls = model.gapLevel;
    var gapPrefix = model.gap > 0 ? '+' : model.gap < 0 ? '−' : '';
    var profitPrefix = model.realProfit >= 0 ? '' : '−';
    var badgeText = gapCls === 'ok' ? 'В норме' : gapCls === 'warn' ? 'Умеренный разрыв' : 'Критический разрыв';

    container.innerHTML =
      '<div class="viz-head">' +
        '<span class="viz-head-title">Ваша картина за месяц</span>' +
        '<span class="viz-head-badge ' + gapCls + '">' + badgeText + '</span>' +
      '</div>' +
      '<div class="viz-compare">' +
        '<div class="viz-cmp-row">' +
          '<div class="vc-label"><b>Заработали</b><br><small>Деньги + дебиторка</small></div>' +
          '<div class="vc-bar"><div class="vc-fill earned" style="width:' + pct(model.earnedRevenue, max) + '%"></div></div>' +
          '<div class="vc-val">' + fmt(model.earnedRevenue) + '<span class="rub"> ₽</span></div>' +
        '</div>' +
        '<div class="viz-cmp-row">' +
          '<div class="vc-label"><b>Потратили</b><br><small>Все расходы месяца</small></div>' +
          '<div class="vc-bar"><div class="vc-fill profit-neg" style="width:' + pct(model.expenses, max) + '%"></div></div>' +
          '<div class="vc-val neg">−' + fmt(model.expenses) + '<span class="rub"> ₽</span></div>' +
        '</div>' +
        '<div class="viz-cmp-row">' +
          '<div class="vc-label"><b>Деньги на счёте</b><br><small>Фактически сейчас</small></div>' +
          '<div class="vc-bar"><div class="vc-fill cash" style="width:' + pct(model.balance, max) + '%"></div></div>' +
          '<div class="vc-val">' + fmt(model.balance) + '<span class="rub"> ₽</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="viz-gap-highlight ' + gapCls + '">' +
        '<div class="vgh-label">Разрыв «деньги vs прибыль»<small>Реальная прибыль ' + profitPrefix + fmt(Math.abs(model.realProfit)) + ' ₽ − деньги на счёте ' + fmt(model.balance) + ' ₽</small></div>' +
        '<div class="vgh-value">' + gapPrefix + fmt(Math.abs(model.gap)) + ' ₽</div>' +
      '</div>' +
      '<div class="viz-interp">' + c.interpretation(model) + '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     FULL REPORT — 7 секций после гейта
     ══════════════════════════════════════════════════════════════════ */
  function renderFull(containers, model, state){
    var fmt = c.formatRub;
    var industry = state.industry || 'other';
    var industryName = { construction:'строительстве', it:'IT', agency:'агентском бизнесе', production:'производстве', other:'проектном бизнесе' }[industry];
    var name = state.name || '';

    /* 1. HEADER — severity + имя + оценка */
    var level = model.gapLevel;
    var levelText = level === 'ok' ? 'В норме' : level === 'warn' ? 'Умеренный разрыв' : 'Критический разрыв';
    var headline = name ? (name + ', ') : '';
    if (level === 'danger') headline += 'у вашего бизнеса серьёзный разрыв';
    else if (level === 'warn') headline += 'есть над чем работать';
    else headline += 'суммарно всё стабильно';

    containers.header.innerHTML =
      '<div class="rh-pill ' + level + '"><span class="rh-pill-dot"></span>' + levelText + '</div>' +
      '<div class="rh-title">' + headline + '</div>' +
      '<div class="rh-sub">Персональный анализ на основе ваших 7 ответов и расчёта. Дальше — что именно «съедает» прибыль и план на 30 дней.</div>';

    /* 2. KPI-карточки */
    var profitSign = model.realProfit >= 0 ? 'pos' : 'neg';
    var profitPrefix = model.realProfit >= 0 ? '' : '−';
    var gapPrefix = model.gap > 0 ? '+' : model.gap < 0 ? '−' : '';
    containers.kpis.innerHTML =
      '<div class="rk-card"><div class="rk-label">Реальная прибыль</div>' +
        '<div class="rk-value ' + profitSign + '">' + profitPrefix + fmt(Math.abs(model.realProfit)) + '<span class="rub"> ₽</span></div>' +
        '<div class="rk-sub">за месяц, начислит. метод</div></div>' +
      '<div class="rk-card highlight"><div class="rk-label">Ваш разрыв</div>' +
        '<div class="rk-value blue">' + gapPrefix + fmt(Math.abs(model.gap)) + '<span class="rub"> ₽</span></div>' +
        '<div class="rk-sub">прибыль на бумаге − деньги в кассе</div></div>' +
      '<div class="rk-card ' + (level === 'danger' ? 'danger' : '') + '"><div class="rk-label">Эффект за год</div>' +
        '<div class="rk-value ' + (level === 'ok' ? 'pos' : 'warn') + '">≈ ' + fmt(model.annualGap) + '<span class="rub"> ₽</span></div>' +
        '<div class="rk-sub">замороженная оборотка ×12</div></div>';

    /* 3. BENCHMARK — vs отрасль */
    var bench = c.industryBenchmark(industry);
    var myShare = Math.min(90, Math.max(2, model.receivablesShare));
    var userPos = c.benchPosition(model.receivablesShare, industry);
    var posText = userPos === 'top' ? 'Вы в топ-25% по отрасли' :
                  userPos === 'median' ? 'Вы примерно в медиане' :
                  userPos === 'weak' ? 'Вы ниже медианы' :
                  'Ваша ситуация хуже чем у 75% отрасли';
    var posCls = userPos === 'top' ? 'ok' : userPos === 'median' ? 'warn' : 'danger';

    containers.bench.innerHTML =
      '<div class="rb-title">Сравнение с <span class="accent">' + industryName + '</span></div>' +
      '<div class="rb-chart">' +
        '<div class="rb-scale">' +
          '<div class="rb-seg top" style="flex:' + bench.top + '"><span>Топ-25% &lt;' + bench.top + '%</span></div>' +
          '<div class="rb-seg median" style="flex:' + (bench.median - bench.top) + '"><span>Медиана ~' + bench.median + '%</span></div>' +
          '<div class="rb-seg weak" style="flex:' + (bench.bottom - bench.median) + '"><span>Отстающие &gt;' + bench.bottom + '%</span></div>' +
          '<div class="rb-seg critical" style="flex:' + Math.max(10, 100 - bench.bottom) + '"><span>Критично</span></div>' +
        '</div>' +
        '<div class="rb-pointer" style="left:' + myShare + '%"><div class="rb-pt-arrow"></div><div class="rb-pt-label ' + posCls + '">Вы · ' + model.receivablesShare + '%</div></div>' +
      '</div>' +
      '<div class="rb-verdict ' + posCls + '">' + posText + '</div>';

    /* 4. Горизонтальный чарт (тот же, что на calc) */
    renderLive(containers.chart, model, industry);

    /* 5. LEAKS — 3 точки утечки, персонализированные */
    var leaks = c.personalLeaks(state, model);
    var leakItems = leaks.map(function(l, i){
      return '<div class="rl-item locked">' +
        '<div class="rl-num">' + (i+1) + '</div>' +
        '<div class="rl-body"><b>' + l.title + '</b><span>' + l.desc + '</span></div>' +
      '</div>';
    }).join('');
    containers.leaks.innerHTML =
      '<div class="rl-title">Где искать в <span class="accent">' + industryName + '</span> — 3 точки утечки</div>' +
      '<div class="rl-sub">Самые частые причины вашего типа разрыва с учётом способа ведения учёта, отсрочек и горизонта планирования.</div>' +
      '<div class="rl-items">' + leakItems + '</div>';

    /* 6. ПЛАН НА 30 ДНЕЙ */
    var plan = c.actionPlan(state, model);
    var planItems = plan.map(function(p, i){
      return '<div class="rp-plan-step">' +
        '<div class="rps-num">' + (i+1) + '</div>' +
        '<div class="rps-body"><b>' + p.title + '</b><span>' + p.desc + '</span></div>' +
      '</div>';
    }).join('');
    containers.plan.innerHTML =
      '<div class="rp-plan-title">Ваш план на <span class="accent">30 дней</span></div>' +
      '<div class="rp-plan-sub">Приоритеты восстановления прибыли для вашего профиля. Последовательно, неделя за неделей.</div>' +
      '<div class="rp-plan-list">' + planItems + '</div>';

    /* 7. PROJECTION — без vs с Финтабло */
    var pr = c.projection(model);
    containers.projection.innerHTML =
      '<div class="rpr-title">Что будет через <span class="accent">12 месяцев</span></div>' +
      '<div class="rpr-grid">' +
        '<div class="rpr-col rpr-bad">' +
          '<div class="rpr-lbl">Без изменений</div>' +
          '<div class="rpr-val">' + fmt(pr.doNothingAnnual) + ' ₽</div>' +
          '<div class="rpr-sub">продолжит «циркулировать» вне кассы</div>' +
        '</div>' +
        '<div class="rpr-arrow">→</div>' +
        '<div class="rpr-col rpr-good">' +
          '<div class="rpr-lbl">С управленческим учётом</div>' +
          '<div class="rpr-val">' + fmt(pr.withFintabloAnnual) + ' ₽</div>' +
          '<div class="rpr-sub">по опыту клиентов Финтабло · −' + pr.reductionPct + '% за 3 мес</div>' +
        '</div>' +
      '</div>' +
      '<div class="rpr-saved">' +
        '<span class="rpr-saved-lbl">Вернётся в кассу</span>' +
        '<span class="rpr-saved-val">' + fmt(pr.saved) + ' ₽/год</span>' +
        '<span class="rpr-saved-sub">≈ ' + fmt(pr.savedMonthly) + ' ₽ в месяц</span>' +
      '</div>';

    /* 8. PLG-explainer */
    containers.plg.innerHTML =
      '<div class="rp-title">Что даёт Финтабло для вашего профиля</div>' +
      '<div class="rp-text">Финтабло собирает вашу финансовую картину <b>автоматически</b> из банка и даёт каждое из этого без ручного ввода:</div>' +
      '<div class="rp-bullets">' +
        '<div class="rp-bullet">ОПиУ и ДДС по каждому проекту отдельно</div>' +
        '<div class="rp-bullet">Платёжный календарь на 30 дней вперёд</div>' +
        '<div class="rp-bullet">Контроль дебиторки по срокам и клиентам</div>' +
        '<div class="rp-bullet">План-факт отклонений еженедельно</div>' +
      '</div>';
  }

  MP.chart = { renderLive: renderLive, renderFull: renderFull, render: renderLive };
})(typeof window !== 'undefined' ? window : globalThis);
