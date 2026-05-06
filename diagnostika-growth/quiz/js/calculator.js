/* ═════ Calculator · diagnostika-growth ═════
   Формулы и коэффициенты — по reference_diagnostika_growth_calculator.md.
   Источники цифр (РФ 2025-2026):
     • Прибыль МСБ −10% при росте выручки +26% (Adesk, перепечатки в деловых СМИ)
     • Просрочка дебиторки 8,2 трлн ₽ = 3,8% ВВП (РБК, ДП, Probankrotstvo)
     • 31% МСБ с серьёзной просрочкой (Moscow Times, январь 2026)
     • Зарплата CFO малого бизнеса 180-250 тыс ₽/мес (HH.ru 2025)
   Принцип: диапазоны вместо точных чисел; источник под каждой цифрой в UI. */
(function () {
  'use strict';

  // ── Коэффициенты ─────────────────────────────────────────
  const PAIN_COEF = {
    blind_decisions: 1.2,  // прямое попадание в общие -10% Adesk
    margin_blind:    1.0,  // база
    cash_surprise:   0.8,  // 96% МСБ × стоимость экстренного кредита
    manual_close:    0.6   // только время сверок + минимальное запаздывание
  };

  const TYPE_COEF = {
    project:    1.2,  // большой разброс маржи между проектами; IT-сектор -15%
    production: 1.1,  // НЗП с большим разбросом + 38% столкнулись с просрочкой
    services:   1.0,  // база
    trade:      0.8   // anti-ICP, другая модель оборачиваемости
  };

  // ── Тексты для разбора ───────────────────────────────────
  const PAIN_LABEL = {
    margin_blind:    'Не знаю прибыль по направлениям',
    cash_surprise:   'Кассовые разрывы появляются внезапно',
    manual_close:    'Ручной свод занимает дни',
    blind_decisions: 'Решения принимаю наугад'
  };

  const TYPE_LABEL = {
    project:    'проектный бизнес',
    production: 'производство',
    services:   'услуги',
    trade:      'торговля со складом'
  };

  // Рекомендация «что исправить в первую очередь» — по главной боли.
  // Прогон через скилл fintablo-copywriter (активные глаголы, без англицизмов кроме проф. терминов).
  const RECOMMENDATIONS = {
    margin_blind: {
      title: 'Разделите прибыль и убыток по направлениям',
      body: 'Соберите ОПиУ с разбивкой по проектам, направлениям или объектам. Покажет, кто кормит бизнес, а кто съедает. Это первая цифра, на которую опирается решение «закрывать или растить».',
      tags: ['ОПиУ по направлениям', 'разбивка по контурам', 'маржа по направлениям']
    },
    cash_surprise: {
      title: 'Запустите платёжный календарь на 2-3 месяца вперёд',
      body: 'Ежедневный календарь поступлений и выплат с горизонтом 8-12 недель. Разрыв виден заранее — есть время договориться с банком, поставщиком, клиентом. Снимает основную тревогу собственника.',
      tags: ['платёжный календарь', 'прогноз ДДС', 'горизонт 2-3 мес']
    },
    manual_close: {
      title: 'Подключите интеграцию с банками и 1С',
      body: 'Операции попадают в учёт автоматически — без ручного ввода в таблицы. Закрытие месяца сокращается с нескольких дней до нескольких часов. Финансист освобождается от рутины и может работать над аналитикой.',
      tags: ['интеграция с банками', 'выгрузка из 1С', 'без ручного ввода']
    },
    blind_decisions: {
      title: 'Настройте три управленческих отчёта: ДДС, ОПиУ, баланс',
      body: 'Это базовая тройка, на которой держатся решения собственника. ДДС — про деньги, ОПиУ — про прибыль, баланс — про активы и обязательства. Без них решения «нанимать / брать проект / инвестировать» принимаются на ощупь.',
      tags: ['ДДС', 'ОПиУ', 'управленческий баланс']
    }
  };

  // ── Маршрутизация (3 ветки по reference_diagnostika_growth_icp.md) ──
  function classifyRoute(answers) {
    const isOwnerOrFinancier = answers.role === 'owner' || answers.role === 'financier';
    const isProjectOrProduction = answers.businessType === 'project' || answers.businessType === 'production';
    const revenueOk = answers.annualRevenue >= 60; // млн ₽/год
    const ageOk = answers.businessAge !== 'young'; // 3+ лет

    const isICP = isOwnerOrFinancier && isProjectOrProduction && revenueOk && ageOk;
    const hasCfo = answers.cfoStatus === 'yes_cfo' || answers.cfoStatus === 'yes_specialist';

    if (isICP && hasCfo) return 'icp_cfo';        // встреча с менеджером
    if (isICP && !hasCfo) return 'icp_no_cfo';    // партнёр-финансист
    return 'self_serve';                           // триал app.fintablo.ru
  }

  // ── Упущенная прибыль — диапазон-вилка ───────────────────
  function calcLossRange(answers) {
    const revenue = (answers.annualRevenue || 60) * 1_000_000; // в рублях
    const painK = PAIN_COEF[answers.primaryPain] || 1.0;
    const typeK = TYPE_COEF[answers.businessType] || 1.0;

    // Источник 1: ручные сверки 0.5-1.5% × type
    const src1Min = revenue * 0.005 * typeK;
    const src1Max = revenue * 0.015 * typeK;
    // Источник 2: просадки маржи 2-5% × type × pain
    const src2Min = revenue * 0.020 * typeK * painK;
    const src2Max = revenue * 0.050 * typeK * painK;
    // Источник 3: задержка решений 1-3% × pain
    const src3Min = revenue * 0.010 * painK;
    const src3Max = revenue * 0.030 * painK;

    const round = (n) => Math.round(n / 100_000) * 100_000;

    return {
      min: round(src1Min + src2Min + src3Min),
      max: round(src1Max + src2Max + src3Max),
      sources: [
        {
          name: 'Время команды на ручные сверки',
          rangeMin: round(src1Min),
          rangeMax: round(src1Max),
          source: 'Расчётно: время финансиста на ручное закрытие × зарплата CFO МСБ (HeadHunter 2025)'
        },
        {
          name: 'Невидимые просадки маржи',
          rangeMin: round(src2Min),
          rangeMax: round(src2Max),
          source: 'По данным Adesk (прибыль МСБ −10% за 2025) и Moscow Times (31% МСБ с серьёзной просрочкой дебиторки)'
        },
        {
          name: 'Задержка решений по убыточным направлениям',
          rangeMin: round(src3Min),
          rangeMax: round(src3Max),
          source: 'Оценка по сроку закрытия месяца × длительность реакции на убыточные направления'
        }
      ]
    };
  }

  // ── Индекс прозрачности 0-100 ────────────────────────────
  function calcTransparencyIndex(answers) {
    let score = 30; // база

    const cfoBonus = { yes_cfo: 25, yes_specialist: 20, part_time: 10, no: 5 };
    score += cfoBonus[answers.cfoStatus] || 0;

    const typeBonus = { project: 5, production: 0, services: 5, trade: -5 };
    score += typeBonus[answers.businessType] || 0;

    const painPenalty = { blind_decisions: -15, margin_blind: -10, cash_surprise: -5, manual_close: -5 };
    score += painPenalty[answers.primaryPain] || 0;

    const ageBonus = { young: 0, mid: 5, mature: 10, veteran: 15 };
    score += ageBonus[answers.businessAge] || 0;

    score = Math.max(0, Math.min(100, score));

    let zone, zoneLabel;
    if (score < 35)      { zone = 'low'; zoneLabel = 'Реактивное управление'; }
    else if (score < 55) { zone = 'mid'; zoneLabel = 'Фрагментарная видимость'; }
    else if (score < 75) { zone = 'good'; zoneLabel = 'Системный учёт'; }
    else                 { zone = 'top'; zoneLabel = 'Прозрачный учёт'; }

    // Бенчмарк когорты — типичный профиль с финансистом и без острой боли
    const peerScore = (function () {
      let s = 30 + 20 + (typeBonus[answers.businessType] || 0) - 10 + (ageBonus[answers.businessAge] || 0);
      return Math.max(20, Math.min(85, s));
    })();
    const topScore = Math.min(95, peerScore + 20);

    return { score, zone, zoneLabel, peerScore, topScore };
  }

  // ── Профиль клиента ─────────────────────────────────────
  function calcProfile(answers) {
    return {
      role: answers.role,
      businessType: answers.businessType,
      businessTypeLabel: TYPE_LABEL[answers.businessType] || 'бизнес',
      annualRevenue: answers.annualRevenue,
      businessAge: answers.businessAge,
      primaryPain: answers.primaryPain,
      primaryPainLabel: PAIN_LABEL[answers.primaryPain] || '',
      cfoStatus: answers.cfoStatus
    };
  }

  // ── Главная функция ─────────────────────────────────────
  function computeAll(answers) {
    const profile = calcProfile(answers);
    const lossRange = calcLossRange(answers);
    const transparency = calcTransparencyIndex(answers);
    const route = classifyRoute(answers);
    const recommendation = RECOMMENDATIONS[answers.primaryPain] || RECOMMENDATIONS.margin_blind;

    return {
      profile,
      lossRange,
      transparency,
      route,
      recommendation,
      computedAt: Date.now()
    };
  }

  // ── Форматирование чисел (русский ГОСТ: пробел-разделитель, ₽) ───
  function formatMoney(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    let val, unit;
    if (abs >= 1_000_000) { val = (n / 1_000_000).toFixed(1); unit = 'млн ₽'; }
    else if (abs >= 1_000) { val = (n / 1_000).toFixed(0); unit = 'тыс ₽'; }
    else { val = String(n); unit = '₽'; }
    val = String(val).replace('.', ',').replace(',0', '');
    return val + ' ' + unit;
  }

  function formatRange(min, max) {
    return formatMoney(min) + ' — ' + formatMoney(max);
  }

  // Export
  window.Calculator = {
    computeAll,
    classifyRoute,
    calcLossRange,
    calcTransparencyIndex,
    formatMoney,
    formatRange,
    PAIN_LABEL,
    TYPE_LABEL
  };
})();
