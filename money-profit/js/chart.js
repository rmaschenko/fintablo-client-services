/* ═════ CHART · horizontal compare viz + rich report render ═════ */
(function(global){
  'use strict';
  var MP = global.MoneyProfit = global.MoneyProfit || {};
  var c = MP.calc;

  function pct(val, max){ return Math.max(2, Math.round((val / Math.max(max, 1)) * 100)); }

  // ── Шаг 4: живая виз под полями (horizontal compare) ──
  function renderLive(container, model, industry){
    if (!model.filled) return;
    var fmt = c.formatRub;
    var max = Math.max(model.earnedRevenue, model.expenses, model.balance, 1);

    var gapCls = model.gapLevel;                 // ok | warn | danger
    var gapPrefix = model.gap > 0 ? '+' : model.gap < 0 ? '−' : '';
    var profitSign = model.realProfit >= 0 ? 'pos' : 'neg';
    var profitPrefix = model.realProfit >= 0 ? '' : '−';

    var badgeText = model.gapLevel === 'ok' ? 'В норме' :
                    model.gapLevel === 'warn' ? 'Умеренный разрыв' : 'Критический разрыв';

    var html =
      '<div class="viz-head">' +
        '<span class="viz-head-title">Ваша картина за месяц</span>' +
        '<span class="viz-head-badge ' + gapCls + '">' + badgeText + '</span>' +
      '</div>' +

      '<div class="viz-compare">' +

        '<div class="viz-cmp-row">' +
          '<div class="vc-label"><b>Заработали</b><br><small style="font-size:11px;color:var(--text-muted)">Деньги + дебиторка</small></div>' +
          '<div class="vc-bar"><div class="vc-fill earned" style="width:' + pct(model.earnedRevenue, max) + '%"></div></div>' +
          '<div class="vc-val">' + fmt(model.earnedRevenue) + '<span class="rub"> ₽</span></div>' +
        '</div>' +

        '<div class="viz-cmp-row">' +
          '<div class="vc-label"><b>Потратили</b><br><small style="font-size:11px;color:var(--text-muted)">Все расходы месяца</small></div>' +
          '<div class="vc-bar"><div class="vc-fill profit-neg" style="width:' + pct(model.expenses, max) + '%"></div></div>' +
          '<div class="vc-val neg">−' + fmt(model.expenses) + '<span class="rub"> ₽</span></div>' +
        '</div>' +

        '<div class="viz-cmp-row">' +
          '<div class="vc-label"><b>Деньги на счёте</b><br><small style="font-size:11px;color:var(--text-muted)">Фактически сейчас</small></div>' +
          '<div class="vc-bar"><div class="vc-fill cash" style="width:' + pct(model.balance, max) + '%"></div></div>' +
          '<div class="vc-val">' + fmt(model.balance) + '<span class="rub"> ₽</span></div>' +
        '</div>' +

      '</div>' +

      '<div class="viz-gap-highlight ' + gapCls + '">' +
        '<div class="vgh-label">Разрыв «деньги vs прибыль»<small>Реальная прибыль ' + profitPrefix + fmt(Math.abs(model.realProfit)) + ' ₽ − деньги на счёте ' + fmt(model.balance) + ' ₽</small></div>' +
        '<div class="vgh-value">' + gapPrefix + fmt(Math.abs(model.gap)) + ' ₽</div>' +
      '</div>' +

      '<div class="viz-interp">' + c.interpretation(model) + '</div>' +

      '<div class="viz-teaser"><b>Это общий разрыв по компании.</b> Дальше покажем: где именно по типу вашего бизнеса эти деньги «заморожены» — и что с этим делает Финтабло.</div>';

    container.innerHTML = html;
  }

  // ── Шаг 4.5: богатый персональный разбор (PLG aha-moment) ──
  // Отраслевые точки утечки — 3 типовые точки для каждой отрасли × типа диагноза
  var INDUSTRY_LEAKS = {
    construction: {
      receivables: [
        { title: 'Этапные платежи без контроля сроков', desc: 'Заказчик задерживает оплату по актам — вы уже оплатили субподряд и материалы.' },
        { title: 'Гарантийные удержания 5–10%', desc: 'Заказчик держит часть денег «до конца гарантии». Формально — ваша прибыль, реально — его сейф.' },
        { title: 'Незавершёнка и неподписанные акты', desc: 'Работы есть, акта нет → деньги у заказчика. Часто не учитывается в моменте.' },
      ],
      advance: [
        { title: 'Аванс потрачен, работа не выполнена', desc: 'Деньги клиента уже ушли поставщикам и субподряду. На счёте — обязательство, не прибыль.' },
        { title: 'Перекрёстное финансирование проектов', desc: 'Аванс нового проекта закрывает расходы старого. Классический карточный домик.' },
        { title: 'Курсовые разницы по валютным контрактам', desc: 'Аванс получили по одному курсу, материалы закупать — по другому.' },
      ],
      loss: [
        { title: 'Неучтённый субподряд', desc: 'Субподрядчики не учтены в смете. Проект «в плюсе» на бумаге, минус в кассе.' },
        { title: 'Материалы выше сметы', desc: 'Цены с момента подписания выросли, смета зафиксирована. Маржа съедена молча.' },
        { title: 'Простои техники и бригад', desc: 'Не учтено в себестоимости. Прибыль по проекту выглядит нормальной — только деньги не сходятся.' },
      ],
      healthy: [
        { title: 'Один убыточный проект среди прибыльных', desc: 'Общая картина в норме, но 1–2 конкретных проекта могут тихо тянуть вниз.' },
        { title: 'Скрытый перекос по заказчикам', desc: 'Один клиент платит с отсрочкой 60+ дней — кассу держат остальные.' },
        { title: 'Себестоимость без накладных', desc: 'Управленческие расходы не разнесены по проектам. Реальная маржа может быть меньше.' },
      ],
    },
    it: {
      receivables: [
        { title: 'Постоплата 30–60 дней', desc: 'Проект сдан, акт есть, деньги идут. Но команда уже получила зарплату за этот период.' },
        { title: 'Технический долг как скрытая дебиторка', desc: 'Переделки после сдачи — часы съедаются, клиент не платит.' },
        { title: 'Клиент удерживает часть до стабилизации', desc: '«20% после месяца без багов» — задерживается, если обнаружилось что-то мелкое.' },
      ],
      advance: [
        { title: 'Предоплата 30–50% уже в работе', desc: 'Деньги на счёте, но команда забирает зарплату следующие 2–3 месяца. Это не прибыль.' },
        { title: 'Несколько активных проектов на одном аванусе', desc: 'Подушка из авансов маскирует проблемы с экономикой отдельных контрактов.' },
        { title: 'Обязательства по SLA и поддержке', desc: 'Деньги пришли за разработку, но впереди ещё месяцы гарантийной поддержки.' },
      ],
      loss: [
        { title: 'Недооценённые трудозатраты', desc: 'Оценили на 200 ч, потратили 340. Маржа ушла в минус, но в отчёте может не видеться.' },
        { title: 'Инфраструктура (хостинг, сервисы, лицензии)', desc: 'Fixed-cost не разнесён по проектам — уменьшает реальную прибыль каждого.' },
        { title: 'Отток/простой разработчиков', desc: 'Зарплата платится, загрузки нет — незаметно растворяет маржу.' },
      ],
      healthy: [
        { title: 'Один убыточный клиент', desc: 'По обороту всё ок, но один крупный контракт может тихо вытаскивать ресурсы.' },
        { title: 'Скрытая сверхурочная работа', desc: 'Часы за пределами оценки не фиксируются — проект кажется прибыльным.' },
        { title: 'Неоправданные премии и бонусы', desc: 'Начисления идут раньше, чем клиент закрыл платёж.' },
      ],
    },
    agency: {
      receivables: [
        { title: 'Постоплата клиентов + предоплата субподряду', desc: 'Вы заплатили дизайнерам/подрядчикам, клиент ещё не заплатил вам.' },
        { title: 'Длинный цикл согласований', desc: 'Работа сдана, счёт выставлен — клиент согласует ещё 2–4 недели.' },
        { title: 'Нецельные правки без доплаты', desc: 'Часы команды растут, счёт не увеличивается. Скрытая дебиторка «в виде времени».' },
      ],
      advance: [
        { title: 'Ретейнер как подушка', desc: 'Ежемесячный платёж создаёт иллюзию стабильности — но работа должна быть впереди.' },
        { title: 'Предоплата кампании перед запуском', desc: 'Деньги клиента есть, расходы на рекламу — впереди, гонорар команды — впереди.' },
        { title: 'Одновременные проекты на общем поступлении', desc: 'Один большой аванс закрывает кассовые разрывы нескольких параллельных проектов.' },
      ],
      loss: [
        { title: 'Внутреннее время команды не в смете', desc: 'Стратегия, созвоны, правки — часы идут, клиент платит за готовый результат.' },
        { title: 'Подрядчики и инструменты сверх бюджета', desc: 'Платные сервисы, видеомонтаж, дикторы — не всегда отражены в цене услуги.' },
        { title: 'Недооценённая сложность брифов', desc: 'Проект казался «на 2 недели», делали 6 — маржа съедена молча.' },
      ],
      healthy: [
        { title: 'Один убыточный клиент в портфеле', desc: 'По обороту норма, но один клиент может тихо тянуть команду в минус.' },
        { title: 'Скрытая зависимость от топ-клиента', desc: 'Если 40%+ выручки от одного — риск концентрации, маскируется прибылью других.' },
        { title: 'Неполный учёт накладных расходов', desc: 'Аренда, CRM, подписки — не разнесены. Маржа проектов завышена.' },
      ],
    },
    production: {
      receivables: [
        { title: 'Отгрузка без предоплаты', desc: 'Продукция ушла, деньги идут 30–60 дней. Склад и сырьё — уже оплачены.' },
        { title: 'Длинные цепочки субконтрактации', desc: 'Вы получите деньги, когда ваш клиент получит от своего клиента.' },
        { title: 'Сезонные колебания', desc: 'В пике продаж кажется всё ок — но деньги приходят на 2 месяца позже.' },
      ],
      advance: [
        { title: 'Аванс под заказ до закупки сырья', desc: 'Деньги есть, материалы ещё не куплены — по курсу, который может измениться.' },
        { title: 'Обязательства по срокам поставки', desc: 'Аванс получен, но впереди производственный цикл, зарплаты, энергоносители.' },
        { title: 'Предоплата клиентов на сезонные запасы', desc: 'Деньги в кассе, но впереди — сборка, логистика, монтаж.' },
      ],
      loss: [
        { title: 'Рост стоимости сырья', desc: 'Контракт подписан по старой цене, сырьё покупать — по новой. Маржа испарилась.' },
        { title: 'Переработка и штрафы за срыв сроков', desc: 'Не учитывается в плановой себестоимости, но реально съедает прибыль.' },
        { title: 'Простой оборудования и брак', desc: 'Невидимые потери в производственном цикле, не разнесённые по заказам.' },
      ],
      healthy: [
        { title: 'Один заказ в минусе среди прибыльных', desc: 'По общей марже норма, но крупный контракт может тихо тянуть вниз.' },
        { title: 'Скрытый склад неликвида', desc: 'Замороженные деньги в материалах, которые не уйдут в ближайший квартал.' },
        { title: 'Накладные расходы не разнесены', desc: 'Цеховые расходы, энергия, амортизация — реальная себестоимость заказов занижена.' },
      ],
    },
    other: {
      receivables: [
        { title: 'Длинная дебиторка по ключевым клиентам', desc: 'Работа выполнена, оплата задерживается.' },
        { title: 'Нерегулярные платежи клиентов', desc: 'Один крупный задерживает — вся касса под риском.' },
        { title: 'Скрытая дебиторка в виде отсрочек', desc: 'Договорённости «потом заплатим» без контроля сроков.' },
      ],
      advance: [
        { title: 'Аванс не разделён с обязательствами', desc: 'Деньги в кассе, работа впереди — не видно в моменте.' },
        { title: 'Переплата клиентов по ошибке', desc: 'Иногда задваивается оплата — это не прибыль, а возврат.' },
        { title: 'Депозиты и гарантийные суммы', desc: 'Формально на счёте, реально — чужие деньги.' },
      ],
      loss: [
        { title: 'Неучтённые прямые расходы', desc: 'Мелкие статьи суммарно могут съедать всю маржу.' },
        { title: 'Скрытые постоянные расходы', desc: 'Аренда, подписки, комиссии — не всегда разнесены.' },
        { title: 'Отток клиентов при высокой стоимости привлечения', desc: 'CAC выше чем пожизненная ценность — убыток растёт.' },
      ],
      healthy: [
        { title: 'Скрытый перекос между продуктами/услугами', desc: 'По общей картине норма, внутри могут быть убыточные линии.' },
        { title: 'Зависимость от одного клиента', desc: 'Концентрация риска не видна в моменте.' },
        { title: 'Реальная маржа без накладных завышена', desc: 'Управленческие расходы не разнесены.' },
      ],
    },
  };

  function renderReport(containers, model, industry, name){
    var fmt = c.formatRub;

    // 1. Hero
    var level = model.gapLevel;
    var levelText = level === 'ok' ? 'В норме' : level === 'warn' ? 'Умеренный разрыв' : 'Критический разрыв';
    var pas = c.pasHeadline(model, name);
    containers.hero.innerHTML =
      '<div class="rh-pill ' + level + '"><span class="rh-pill-dot"></span>' + levelText + '</div>' +
      '<div class="rh-title">' + pas.h + '</div>' +
      '<div class="rh-sub">' + pas.sub + '</div>';

    // 2. Chart (та же horizontal compare)
    renderLive(containers.chart, model, industry);

    // 3. KPI-cards
    var profitSign = model.realProfit >= 0 ? 'pos' : 'neg';
    var profitPrefix = model.realProfit >= 0 ? '' : '−';
    var gapClass = level === 'ok' ? 'pos' : level === 'warn' ? 'warn' : 'neg';
    var gapPrefix = model.gap > 0 ? '+' : model.gap < 0 ? '−' : '';
    containers.kpis.innerHTML =
      '<div class="rk-card">' +
        '<div class="rk-label">Реальная прибыль (мес.)</div>' +
        '<div class="rk-value ' + profitSign + '">' + profitPrefix + fmt(Math.abs(model.realProfit)) + '<span class="rub"> ₽</span></div>' +
        '<div class="rk-sub">Начислительный метод</div>' +
      '</div>' +
      '<div class="rk-card highlight">' +
        '<div class="rk-label">Ваш разрыв</div>' +
        '<div class="rk-value blue">' + gapPrefix + fmt(Math.abs(model.gap)) + '<span class="rub"> ₽</span></div>' +
        '<div class="rk-sub">Прибыль на бумаге − деньги в кассе</div>' +
      '</div>' +
      '<div class="rk-card ' + (level === 'danger' ? 'danger' : '') + '">' +
        '<div class="rk-label">Эффект за год (×12)</div>' +
        '<div class="rk-value ' + (level === 'ok' ? 'pos' : 'warn') + '">≈ ' + fmt(model.annualGap) + '<span class="rub"> ₽</span></div>' +
        '<div class="rk-sub">Столько «циркулирует» вне кассы</div>' +
      '</div>';

    // 4. Leaks (отраслевые 3 точки — это и есть PLG-гейт)
    var leaks = (INDUSTRY_LEAKS[industry] || INDUSTRY_LEAKS.other)[model.diagnosisType] ||
                 INDUSTRY_LEAKS.other[model.diagnosisType] || [];
    var industryLabel = {construction:'строительстве',it:'IT',agency:'агентском бизнесе',production:'производстве',other:'вашей сфере'}[industry] || 'вашей сфере';
    var leakItems = leaks.map(function(l, i){
      return '<div class="rl-item locked">' +
        '<div class="rl-num">' + (i+1) + '</div>' +
        '<div class="rl-body">' +
          '<b>' + l.title + '</b>' +
          '<span>' + l.desc + '</span>' +
        '</div>' +
        '<div class="rl-lock">в Финтабло</div>' +
      '</div>';
    }).join('');
    containers.leaks.innerHTML =
      '<div class="rl-title">Где искать в <span class="accent">' + industryLabel + '</span> — 3 типичные точки утечки</div>' +
      '<div class="rl-sub">Эти 3 сценария — самые частые причины вашего типа разрыва. Конкретный проект и транзакцию покажет Финтабло в «Движении денежных средств».</div>' +
      '<div class="rl-items">' + leakItems + '</div>';

    // 5. PLG-explainer
    containers.plg.innerHTML =
      '<div class="rp-title">Второй слой — только внутри Финтабло</div>' +
      '<div class="rp-text">Сейчас вы видите <b>общую картину по компании</b>. Финтабло показывает <b>каждый проект</b> отдельно: где конкретно застряли деньги, в каком клиенте, какая транзакция вернёт кассу — без ручного ввода.</div>' +
      '<div class="rp-bullets">' +
        '<div class="rp-bullet">ОПиУ и ДДС по каждому проекту</div>' +
        '<div class="rp-bullet">Платёжный календарь на 30 дней вперёд</div>' +
        '<div class="rp-bullet">Контроль дебиторки по срокам</div>' +
        '<div class="rp-bullet">План-факт отклонений еженедельно</div>' +
      '</div>';
  }

  MP.chart = { renderLive: renderLive, renderReport: renderReport, render: renderLive };
})(typeof window !== 'undefined' ? window : globalThis);
