/* ═════ Calculator · diagnostika-growth ═════
   Формулы и коэффициенты — по reference_diagnostika_growth_calculator.md.
   Источники цифр (РФ 2025-2026):
     • 45% МСБ закончили 2025 с убытками или без прибыли («Опора России», Moscow Times 03.2026)
     • 75% МСБ не имеют прибыли для развития (ЦСР, Коммерсантъ 03.2026)
     • Просрочка дебиторки 8,2 трлн ₽ = 3,8% ВВП (РБК, ДП, Probankrotstvo)
     • 31% МСБ с серьёзной просрочкой дебиторки (Moscow Times, январь 2026)
     • Инвестиции в основной капитал РФ −2,30% за 2025 (Росстат)
     • Зарплата CFO малого бизнеса 180-250 тыс ₽/мес (по отраслевым данным 2025-2026)
   Принцип: диапазоны вместо точных чисел; источник под каждой цифрой в UI. */
(function () {
  'use strict';

  // ── Коэффициенты ─────────────────────────────────────────
  const PAIN_COEF = {
    blind_decisions: 1.2,  // прямое попадание в зону «решения без цифр» — 45% МСБ с убытками
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
  // Принцип PLG: ценность = результат для бизнеса, не настроенный артефакт.
  // Поля:
  //   title — РОЛЬ-СПЕЦИФИЧНЫЙ через titleByRole (см. computeAll)
  //   body — общее описание решения
  //   decomposition — где боль проявляется в бизнесе (3-4 пункта для глубины Section 3)
  //   whyHard — почему сложно сделать самому
  //   howFintablo — как Финтабло решает
  //   roadmap — план развития (через 3 / 12 мес)
  //   proofPoint — бизнес-эффект одной строкой
  //   visual, tags — для UI
  const RECOMMENDATIONS = {
    margin_blind: {
      titleByRole: {
        owner:      'Видеть прибыль по каждому направлению — для решений по проектам и найму',
        financier:  'Считать маржу по направлениям и контурам каждый день, а не на годовом итоге',
        accountant: 'Закрыть управленческую отчётность с разбивкой по направлениям',
        other:      'Видеть прибыль и убыток по каждому направлению'
      },
      body: 'Прибыль по проектам, направлениям или объектам по факту — а не на годовом итоге, когда уже поздно реагировать. Решение закрыть убыточное направление или вложить в прибыльное — на основе цифры, а не интуиции.',
      decomposition: [
        'Берёте новый проект и не знаете заработаете ли — оценка «по интуиции»',
        'Не понимаете, какое направление приносит прибыль, а какое работает в убыток',
        'Решение закрыть направление принимаете по итогам года — слишком поздно',
        'На общих цифрах кажется «всё ок», а 1-2 направления тихо тянут вниз'
      ],
      whyHard: 'Самостоятельно собрать такой расчёт в Excel — 2-3 недели работы финансиста на настройку и 4-5 дней каждый месяц на закрытие. К моменту, когда отчёт готов, прошедший месяц уже не изменить.',
      howFintablo: 'Прибыль по контурам собирается из интеграций с банками и 1С — обновляется каждый день. Настройка под вашу отрасль и масштаб занимает 1-2 встречи с финансовым экспертом Финтабло.',
      roadmap: {
        in_3m: 'Видите маржу по каждому направлению в моменте, а не задним числом',
        in_12m: 'Закрыли 1-2 убыточных направления, пере направили ресурс в прибыльные. Эффект: 1-3 млн ₽ возвращённой прибыли в год'
      },
      proofPoint: 'Решение «закрыть или растить» — с цифрой в руках, не вслепую',
      tags: ['прибыль по направлениям', 'разбивка по контурам', 'ОПиУ'],
      visual: 'margin'
    },
    cash_surprise: {
      titleByRole: {
        owner:      'Видеть приближение кассового разрыва за недели до события',
        financier:  'Прогноз ДДС на 8–12 недель вперёд по реальным данным',
        accountant: 'Платёжный календарь без ручной выверки 5–10 счетов',
        other:      'Видеть приближение кассового разрыва за недели до события'
      },
      body: 'Прогноз поступлений и выплат на 8-12 недель вперёд по реальным данным с банковских счетов. Разрыв виден заранее — есть время договориться с банком, поставщиком или клиентом, а не тушить пожар в день платежа.',
      decomposition: [
        'Узнаёте о нехватке денег в день платежа — нет времени на манёвр',
        'Согласовываете отсрочку с поставщиками в режиме SOS',
        'Берёте экстренные кредиты под 25-30% годовых — стоимость денег растёт',
        'Платёжная дисциплина с клиентами съезжает: 31% МСБ с серьёзной просрочкой дебиторки'
      ],
      whyHard: 'В Excel платёжный календарь требует ручной выверки по 5-10 счетам каждый день. Один пропущенный платёж — и прогноз врёт. Финансист тратит 1-2 часа в день только на актуализацию.',
      howFintablo: 'Финтабло подтягивает движение по счетам напрямую из банков, считает прогноз ДДС на 90 дней и подсвечивает приближение разрыва за недели вперёд. Финансист тратит 5 минут в день на проверку, не на сборку.',
      roadmap: {
        in_3m: 'Видите все будущие разрывы за 8-12 недель, плановые платежи без сюрпризов',
        in_12m: 'Снизили долю экстренных кредитов и просроченной дебиторки. Экономия 0,5-2 млн ₽ в год на стоимости денег'
      },
      proofPoint: 'Время на манёвр вместо тушения пожара в день платежа',
      tags: ['прогноз ДДС', 'платёжный календарь', 'интеграция с банками'],
      visual: 'cash'
    },
    manual_close: {
      titleByRole: {
        owner:      'Получать цифры на следующий день после закрытия, а не через неделю',
        financier:  'Освободить 18–25 часов в месяц на аналитику вместо ручной сборки',
        accountant: 'Закрытие месяца — 2 часа вместо 4–5 дней',
        other:      'Закрытие месяца — за часы вместо дней'
      },
      body: 'Закрытие месяца — за пару часов вместо нескольких дней. Финансист перестаёт собирать цифры руками и начинает работать с ними: искать причины отклонений, делать прогнозы, готовить решения для собственника.',
      decomposition: [
        'Финансист 4-5 дней в месяц вручную выгружает операции из 5-10 банков',
        'Сверка с 1С + дополнительными таблицами — ещё 1-2 дня',
        'Ошибка в одной цифре ломает весь отчёт, поиск занимает 3-5 часов',
        'Цифры готовы только к середине месяца — для оперативных решений уже поздно'
      ],
      whyHard: 'Ручная выгрузка операций из 5-10 счетов и сверка с 1С — 18-25 часов в месяц времени финансиста. Ошибка в одной цифре ломает весь отчёт, найти её — ещё 3-5 часов.',
      howFintablo: 'Интеграции с крупнейшими банками и 1С работают через прямой API: операции в учёте появляются в течение часа после проводки в банке. Закрытие месяца — 2-3 часа вместо 4-5 дней.',
      roadmap: {
        in_3m: 'Цифры готовы на следующий день после закрытия месяца — без ручной сверки',
        in_12m: 'Финансист высвободил 200+ часов в год — переключился с сборки на аналитику и прогнозы'
      },
      proofPoint: 'Финансист работает над аналитикой, не над сборкой цифр',
      tags: ['интеграция с банками', 'выгрузка из 1С', 'без ручного ввода'],
      visual: 'time'
    },
    blind_decisions: {
      titleByRole: {
        owner:      'Опирать решения по найму, проектам и инвестициям на цифры, а не на ощущения',
        financier:  'Поставить триаду ДДС / ОПиУ / Баланс с корректной методологией',
        accountant: 'Развести кассовый и начислительный учёт, корректно учесть НЗП и обязательства',
        other:      'Опирать решения по найму и проектам на цифры, а не на ощущения'
      },
      body: 'Прежде чем брать новый проект или нанимать человека — видеть, как это влияет на прибыль, кассу и устойчивость бизнеса. Контроль по трём опорам: движение денег, прибыль с убытком, состояние активов.',
      decomposition: [
        'Решение «брать ли проект» — на интуицию, без расчёта влияния на маржу',
        'Найм нового сотрудника — без понимания, выдержит ли касса в ближайшие 3-6 месяцев',
        '«Как у нас идут дела?» — нет однозначного ответа, цифры в разных таблицах',
        '45% МСБ закончили 2025 с убытками — большинство не понимало почему до итогов года'
      ],
      whyHard: 'С нуля в Excel правильно поставить такой контроль — 2-3 месяца методологической настройки. Без опыта легко ошибиться: смешать кассовый и начислительный методы, не учесть НЗП, забыть про обязательства. Отчёты получаются, но решения по ним принимать опасно.',
      howFintablo: 'В Финтабло методология заложена в продукт — три управленческих отчёта (ДДС, ОПиУ, баланс) собираются из готового шаблона под вашу отрасль за 1-2 встречи с финансовым экспертом. Кассовый и начислительный учёт разведены, НЗП и обязательства считаются корректно.',
      roadmap: {
        in_3m: 'Триада отчётов работает, видите бизнес «как на ладони». Решения по проектам и найму — с цифрой',
        in_12m: 'Качество решений выросло: ROI новых проектов выше, найм — под подтверждённую нагрузку'
      },
      proofPoint: 'Решения по найму и проектам — с цифрой в руках',
      tags: ['ДДС', 'ОПиУ', 'управленческий баланс'],
      visual: 'pillars'
    }
  };

  // ── Маршрутизация — 4 ветки (см. project_diagnostika_growth_state.md) ──
  // Приоритет правил (сверху вниз):
  //   1. Тип = trade или services → Anti-ICP (структурный блокер)
  //   2. Выручка <30 млн → Anti-ICP (рано для нас)
  //   3. Выручка 30-60 → Warm ICP (продуктовая воронка register)
  //   4. Выручка 60+ + (есть финансист или бухгалтер совмещает) → Hot ICP
  //   5. Выручка 60+ + (сам собственник, нет ФФ) → Hot ICP без ФФ + допродажа партнёра
  // Возраст и роль — не блокируют маршрут, передаются в amoCRM как контекст.
  function classifyRoute(answers) {
    const type = answers.businessType;
    const rev = answers.annualRevenue;
    if (type === 'trade' || type === 'services') return 'anti_icp';
    if (rev < 30) return 'anti_icp';
    if (rev < 60) return 'warm_icp';
    if (answers.cfoStatus === 'self_only') return 'hot_icp_no_finance';
    return 'hot_icp';
  }

  // Подтип anti-ICP — нужен для подбора шаблонов и пиксельных событий.
  function getAntiSubtype(answers) {
    if (answers.businessType === 'trade') return 'trade';
    if (answers.businessType === 'services') return 'services';
    if (answers.annualRevenue < 30) return 'small';
    return null;
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
          source: 'Расчётно: время финансиста на ручное закрытие × зарплата CFO МСБ (по отраслевым данным 2025-2026)'
        },
        {
          name: 'Невидимые просадки прибыли',
          rangeMin: round(src2Min),
          rangeMax: round(src2Max),
          source: 'По данным «Опоры России» / Moscow Times (45% МСБ закончили 2025 с убытками) и ЦСР / Коммерсантъ (75% МСБ без прибыли для развития)'
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
  // Зоны и интерпретации — на языке ценности, не академии.
  // zoneHeadline = что зона значит в одной фразе (вместо «Фрагментарная видимость»).
  // zoneGap = что юзер реально упускает на этом уровне (мотиватор внедрения).
  // peerLabel/topLabel = понятные термины вместо «когорта» и «лидеры по учёту».
  const ZONE_HEADLINES = {
    low:  'Решения принимаете без цифр',
    mid:  'Видите половину — остальное на ощупь',
    good: 'Контроль есть, но цифры приходят с опозданием',
    top:  'Финансы прозрачны в реальном времени'
  };
  const ZONE_GAPS = {
    low:  'Каждое второе решение по найму, проектам, инвестициям — на ощупь. План и факт расходятся, а узнаёте об этом по итогам года.',
    mid:  'Половина процессов оцифрована, половина — нет. Решения возможны, но риск ошибки высокий: картина неполная.',
    good: 'Регулярная отчётность ведётся, но цифры готовы через 3–5 дней после закрытия — поздно для оперативных решений.',
    top:  'Финансы видны в реальном времени. Решения по найму, проектам и инвестициям принимаете с цифрой в руках.'
  };

  function calcTransparencyIndex(answers) {
    let score = 30; // база

    const cfoBonus = { yes_cfo: 25, yes_specialist: 20, accountant_combined: 8, self_only: 3 };
    score += cfoBonus[answers.cfoStatus] || 0;

    const typeBonus = { project: 5, production: 0, services: 5, trade: -5 };
    score += typeBonus[answers.businessType] || 0;

    const painPenalty = { blind_decisions: -15, margin_blind: -10, cash_surprise: -5, manual_close: -5 };
    score += painPenalty[answers.primaryPain] || 0;

    const ageBonus = { young: 0, mid: 5, mature: 10, veteran: 15 };
    score += ageBonus[answers.businessAge] || 0;

    score = Math.max(0, Math.min(100, score));

    let zone;
    if (score < 35)      zone = 'low';
    else if (score < 55) zone = 'mid';
    else if (score < 75) zone = 'good';
    else                 zone = 'top';

    const zoneHeadline = ZONE_HEADLINES[zone];
    const zoneGap = ZONE_GAPS[zone];
    // zoneLabel — короткая бирка для бэйджа около цифры (используется в новом UI).
    const zoneLabel = zoneHeadline;

    // Бенчмарк похожих компаний — типичный профиль с финансистом и без острой боли.
    const peerScore = (function () {
      let s = 30 + 20 + (typeBonus[answers.businessType] || 0) - 10 + (ageBonus[answers.businessAge] || 0);
      return Math.max(20, Math.min(85, s));
    })();
    const topScore = Math.min(95, peerScore + 20);

    // Понятные термины вместо «когорта» и «лидеры по учёту»
    const typeWord = (answers.businessType === 'trade' || answers.businessType === 'services')
      ? 'компании похожего профиля'
      : 'компании с похожим типом бизнеса и выручкой';
    const peerLabel = typeWord;
    const peerSubLabel = 'типичный уровень управленческого учёта';
    const topLabel = 'Топ-25% компаний';
    const topSubLabel = 'с прозрачным управленческим учётом';

    return {
      score, zone, zoneLabel,
      zoneHeadline, zoneGap,
      peerScore, peerLabel, peerSubLabel,
      topScore, topLabel, topSubLabel
    };
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
    const antiSubtype = getAntiSubtype(answers);
    const baseRec = RECOMMENDATIONS[answers.primaryPain] || RECOMMENDATIONS.margin_blind;
    // Роль-специфичный title — выбираем из titleByRole по answers.role
    // Owner получает фокус «решения», финансист — «методология», бухгалтер — «отчётность»
    const role = answers.role || 'other';
    const recommendation = Object.assign({}, baseRec, {
      title: (baseRec.titleByRole && (baseRec.titleByRole[role] || baseRec.titleByRole.other)) || baseRec.title || ''
    });

    return {
      profile,
      lossRange,
      transparency,
      route,
      antiSubtype,
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
    getAntiSubtype,
    calcLossRange,
    calcTransparencyIndex,
    formatMoney,
    formatRange,
    PAIN_LABEL,
    TYPE_LABEL
  };
})();
