/* ═════ CALCULATOR · формулы по ТЗ ═════
   earnedRevenue = cashIn + receivables
   realProfit    = earnedRevenue - expenses
   cashResult    = cashIn - expenses
   gap           = realProfit - cashResult  (== receivables)
   diagnosisType: loss / receivables / advance / healthy */
(function(global){
  'use strict';
  var MoneyProfit = global.MoneyProfit = global.MoneyProfit || {};

  var nfInt = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function formatRub(n){
    if (!isFinite(n) || n === 0) return '0';
    return nfInt.format(Math.round(n));
  }
  function formatShort(n){
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n/1e9).toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' млрд';
    if (abs >= 1e6) return (n/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' млн';
    if (abs >= 1e3) return Math.round(n/1e3) + 'к';
    return formatRub(n);
  }
  function parseRub(str){
    if (typeof str !== 'string') str = String(str || '');
    var cleaned = str.replace(/[^\d,.\-]/g, '').replace(',', '.');
    var n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  }

  // Основная модель
  function calcModel(input){
    var cashIn       = Math.max(0, Number(input.cashIn) || 0);
    var receivables  = Math.max(0, Number(input.receivables) || 0);
    var expenses     = Math.max(0, Number(input.expenses) || 0);
    var balance      = Math.max(0, Number(input.balance) || 0);

    var earnedRevenue = cashIn + receivables;
    var realProfit    = earnedRevenue - expenses;
    var cashResult    = cashIn - expenses;
    var gap           = realProfit - cashResult;  // математически = receivables
    var receivablesShare = earnedRevenue > 0 ? Math.round((receivables / earnedRevenue) * 100) : 0;
    var annualGap     = Math.abs(gap) * 12;

    // diagnosisType — приоритетная логика ТЗ
    var diagnosisType, diagnosis;
    if (realProfit < 0) {
      diagnosisType = 'loss';
      diagnosis = 'Бизнес работает в убыток';
    } else if (receivables > cashIn * 0.3) {
      diagnosisType = 'receivables';
      diagnosis = receivablesShare + '% заработанного «заморожено» у клиентов';
    } else if (gap < -cashIn * 0.2) {
      diagnosisType = 'advance';
      diagnosis = 'На счёте есть деньги клиентов — ещё не заработанные';
    } else {
      diagnosisType = 'healthy';
      diagnosis = 'Разрыв в пределах нормы';
    }

    // Визуальный уровень gap-блока
    var gapLevel;
    if (diagnosisType === 'loss') gapLevel = 'danger';
    else if (diagnosisType === 'healthy') gapLevel = 'ok';
    else if (Math.abs(gap) < cashIn * 0.2) gapLevel = 'warn';
    else gapLevel = 'danger';

    var profitSign = realProfit >= 0 ? 'pos' : 'neg';

    return {
      cashIn: cashIn, receivables: receivables, expenses: expenses, balance: balance,
      earnedRevenue: earnedRevenue, realProfit: realProfit, cashResult: cashResult,
      gap: gap, annualGap: annualGap, receivablesShare: receivablesShare,
      diagnosisType: diagnosisType, diagnosis: diagnosis,
      gapLevel: gapLevel, profitSign: profitSign,
      filled: cashIn > 0 && receivables >= 0 && expenses > 0 && balance >= 0 &&
              (cashIn > 0 || receivables > 0 || expenses > 0 || balance > 0)
    };
  }

  // Отраслевой текст под визуализацией
  var INDUSTRY_CONTEXT = {
    construction: {
      receivables:'В строительстве дебиторка {p}% от заработанного — это типичная ситуация при этапных платежах. Работу сделали, акт подписан — деньги ещё не пришли.',
      advance:    'В строительстве аванс — обычная практика. Деньги клиента получены, но работа ещё не выполнена — с точки зрения прибыли это пока не ваши деньги.',
      loss:       'В строительстве убытки чаще всего прячутся в неучтённом субподряде или материалах. Когда это становится видно — обычно уже поздно исправлять.',
      healthy:    'В строительстве разрыв в норме — но это редкий случай. Проверьте по каждому проекту: где-то может быть перекос, который компенсирует другой.'
    },
    it: {
      receivables:'В IT дебиторка {p}% — классика при постоплатных контрактах. Проект сдан, акт есть, деньги идут.',
      advance:    'В IT-проектах предоплата 30–50% — норма. Деньги клиента пришли, но работа впереди. Это не прибыль — это обязательство.',
      loss:       'В IT убытки часто скрыты в недооценённых трудозатратах: проект оценивали на 200 часов, потратили 340.',
      healthy:    'В IT разрыв в норме — редкость. Обычно есть недооценки по одному из проектов, которые маскируют общий результат.'
    },
    agency: {
      receivables:'В агентстве дебиторка {p}% — результат постоплатных клиентов. Работу сделали, ждём оплаты.',
      advance:    'В агентстве авансы от клиентов создают иллюзию хорошего месяца — но работа ещё впереди.',
      loss:       'В агентстве убытки часто прячутся в субподрядчиках, инструментах и внутреннем времени команды, которое не включается в смету.',
      healthy:    'В агентстве норма по общему обороту — но по одному клиенту может быть минус, который маскируется прибылью других.'
    },
    production: {
      receivables:'В производстве дебиторка {p}% — типична при оплате по факту сдачи. Сделали, ждём.',
      advance:    'В производстве авансы под заказ — нормально. Деньги есть, материалы ещё не закуплены, работа не начата.',
      loss:       'В производстве убытки часто в сырье и комплектующих: цены выросли после подписания контракта.',
      healthy:    'В производстве разрыв в норме — но внутри себестоимости могут быть отдельные заказы в минусе.'
    },
    other: {
      receivables:'Дебиторка {p}% — деньги заработаны, но ещё не получены.',
      advance:    'На счёте есть предоплата — деньги клиента, которые ещё нужно отработать.',
      loss:       'Расходы превышают заработанную выручку.',
      healthy:    'Разрыв в норме.'
    }
  };
  function industryContext(industry, model){
    var map = INDUSTRY_CONTEXT[industry] || INDUSTRY_CONTEXT.other;
    return (map[model.diagnosisType] || '').replace('{p}', model.receivablesShare);
  }

  // Тексты интерпретаций (показывать под визуализацией)
  function interpretation(model){
    var fmt = formatRub;
    switch (model.diagnosisType) {
      case 'receivables':
        return '<b>У вас есть реальная прибыль ' + fmt(model.realProfit) + ' ₽</b> — но ' +
          fmt(model.gap) + ' ₽ «заморожено» у клиентов в виде долга. Деньги заработаны, но ещё не получены. ' +
          'Если всё, что должны, поступит на счёт — остаток вырастет с ' + fmt(model.balance) + ' ₽ до ' + fmt(model.balance + model.receivables) + ' ₽.';
      case 'advance':
        return '<b>На счёте есть ' + fmt(model.balance) + ' ₽ от клиентов</b>, которые вы ещё не заработали. Работа впереди — это обязательство, а не прибыль.';
      case 'loss':
        return '<b>По введённым данным реальная прибыль за месяц отрицательная: ' + fmt(model.realProfit) + ' ₽.</b> Расходы превышают заработанную выручку.';
      case 'healthy':
      default:
        return '<b>Разрыв между деньгами и прибылью минимальный</b> — в пределах нормы.';
    }
  }

  // PAS-заголовок этапа 3 (форма контакта)
  function pasHeadline(model, name){
    var whoPrefix = name ? (name + ', в') : 'В';
    switch (model.diagnosisType) {
      case 'receivables':
      case 'advance':
        return {
          h: whoPrefix + 'от почему деньги есть, а прибыли нет',
          sub: 'Вы видели суммарную цифру. Чтобы получить полный анализ — в каком именно проекте и почему — оставьте контакт. Наш эксперт разберёт вашу ситуацию конкретно.'
        };
      case 'loss':
        return {
          h: whoPrefix + 'аш бизнес сейчас работает в минус',
          sub: 'Наш эксперт поможет найти, где именно теряется прибыль — на конкретных данных вашего бизнеса.'
        };
      case 'healthy':
      default:
        return {
          h: 'Суммарно разрыв в норме — но это не значит, что по каждому проекту так же',
          sub: 'Компании часто видят норму в целом — и не замечают один убыточный проект среди прибыльных. Финтабло показывает это по каждому проекту. Эксперт покажет, как это выглядит на вашем типе бизнеса.'
        };
    }
  }

  /* ═════ БЕНЧМАРКИ ПО ОТРАСЛЯМ (receivables % от earned revenue) ═════ */
  var INDUSTRY_BENCH = {
    construction: { top: 15, median: 35, bottom: 55 },
    it:           { top: 10, median: 25, bottom: 45 },
    agency:       { top: 12, median: 28, bottom: 50 },
    production:   { top: 15, median: 30, bottom: 50 },
    other:        { top: 10, median: 25, bottom: 45 }
  };
  function industryBenchmark(industry){ return INDUSTRY_BENCH[industry] || INDUSTRY_BENCH.other; }

  // Позиция пользователя относительно бенчмарка: 'top' | 'median' | 'weak' | 'critical'
  function benchPosition(share, industry){
    var b = industryBenchmark(industry);
    if (share <= b.top) return 'top';
    if (share <= b.median) return 'median';
    if (share <= b.bottom) return 'weak';
    return 'critical';
  }

  /* ═════ ПЛАН НА 30 ДНЕЙ (персонализированный по answers) ═════ */
  function actionPlan(state, model){
    var plan = [];
    // Always first: навести управленческий учёт если нет
    if (state.accounting === 'none' || state.accounting === 'excel') {
      plan.push({
        title: 'Неделя 1: навести факт',
        desc: 'Свести все поступления и платежи за последние 30 дней в один отчёт ДДС. Без категоризации — пока просто факт. Цель: увидеть реальный денежный поток.'
      });
    } else {
      plan.push({
        title: 'Неделя 1: сверить факт с ощущениями',
        desc: 'Выгрузить ДДС за последний месяц из текущей системы. Проверить что все поступления и платежи реально отражены — иначе модель разрыва врёт.'
      });
    }
    // Second: зависит от payment terms и основной боли
    if (state.payment === 'long' || state.payment === 'very-long') {
      plan.push({
        title: 'Неделя 2: контроль дебиторки',
        desc: 'Список всех должников по срокам (до 30 / 30-60 / 60+ дней). По каждому — ответственный и дата обещанной оплаты. При отсрочках 45+ дней нужен отдельный платёжный календарь — иначе кассовые разрывы неизбежны.'
      });
    } else if (state.pain === 'project-economy') {
      plan.push({
        title: 'Неделя 2: P&L по проектам',
        desc: 'Разделить выручку и расходы по проектам/клиентам. Это даст точку, откуда убытки. Часто 1 проект в минусе «съедает» всю прибыль остальных.'
      });
    } else {
      plan.push({
        title: 'Неделя 2: платёжный календарь',
        desc: 'План поступлений и платежей на 30 дней вперёд. Недельный апдейт. Цель: никаких сюрпризов в кассе за пределами 7 дней.'
      });
    }
    // Third: зависит от планирования
    if (state.planning === 'none' || state.planning === 'week') {
      plan.push({
        title: 'Недели 3–4: системный ОПиУ',
        desc: 'Начислительный отчёт о прибылях и убытках — ежемесячно. Не путать с бухгалтерским. Даёт реальную прибыль, а не «деньги - расходы». Параллельно — бюджет на следующий квартал как ориентир.'
      });
    } else {
      plan.push({
        title: 'Недели 3–4: план-факт и бюджет',
        desc: 'Сверка бюджета с фактом. Отклонения >10% — разбирать. Горизонт планирования увеличить до квартала+. Это переход от управления кассой к управлению прибылью.'
      });
    }
    return plan;
  }

  /* ═════ 3 ТОЧКИ УТЕЧКИ — ПЕРСОНАЛИЗАЦИЯ ═════ */
  // Базовые отраслевые сценарии + модификаторы по учёту + отсрочкам
  function personalLeaks(state, model){
    var industry = state.industry || 'other';
    var base = INDUSTRY_LEAKS[industry] || INDUSTRY_LEAKS.other;
    var typeLeaks = base[model.diagnosisType] || base.receivables;

    // Клонируем, чтобы не мутировать исходник
    var leaks = typeLeaks.slice(0, 3).map(function(l){ return { title: l.title, desc: l.desc }; });

    // Подстройки по ответам
    if (state.payment === 'long' || state.payment === 'very-long') {
      // Усилить текст #1 (обычно про дебиторку)
      if (leaks[0]) leaks[0].desc += ' <b>При ваших отсрочках ' + (state.payment === 'very-long' ? '90+ дней' : '45–60 дней') + '</b> — эта точка самая горячая.';
    }
    if (state.accounting === 'none') {
      leaks.push({
        title: 'Нет факта — нет контроля',
        desc: 'Без системного ДДС/ОПиУ любая точка утечки живёт месяцами незамеченной. Это не «ещё одна» точка, а усилитель всех остальных.'
      });
      leaks = leaks.slice(-3); // оставим последнюю (важнее) + 2 отраслевых
      leaks = [leaks[leaks.length - 1]].concat(leaks.slice(0, -1));
    }
    if (state.planning === 'none' && !leaks.find(function(l){ return l.title.indexOf('планирования') >= 0; })) {
      // add only if we have room and no similar
      if (leaks.length < 3) {
        leaks.push({
          title: 'Деньги не видны вперёд',
          desc: 'Без платёжного календаря разрыв между «заработано» и «в кассе» проявляется как сюрприз каждый месяц. Это не причина разрыва, но причина того, что он сохраняется.'
        });
      }
    }
    return leaks.slice(0, 3);
  }

  // База сценариев (как в старом chart.js)
  var INDUSTRY_LEAKS = {
    construction: {
      receivables: [
        { title: 'Этапные платежи без контроля сроков', desc: 'Заказчик задерживает оплату по актам — вы уже оплатили субподряд и материалы.' },
        { title: 'Гарантийные удержания 5–10%', desc: 'Заказчик держит часть денег «до конца гарантии». Формально — ваша прибыль, реально — его сейф.' },
        { title: 'Незавершёнка без подписанных актов', desc: 'Работы есть, акта нет → деньги у заказчика. Часто не учитывается в моменте.' }
      ],
      advance: [
        { title: 'Аванс потрачен, работа не выполнена', desc: 'Деньги клиента уже ушли поставщикам и субподряду. На счёте — обязательство, не прибыль.' },
        { title: 'Перекрёстное финансирование проектов', desc: 'Аванс нового проекта закрывает расходы старого. Классический карточный домик.' },
        { title: 'Курсовые разницы по валютным контрактам', desc: 'Аванс получили по одному курсу, материалы закупать — по другому.' }
      ],
      loss: [
        { title: 'Неучтённый субподряд', desc: 'Субподрядчики не учтены в смете. Проект «в плюсе» на бумаге, минус в кассе.' },
        { title: 'Материалы выше сметы', desc: 'Цены с момента подписания выросли, смета зафиксирована. Маржа съедена молча.' },
        { title: 'Простои техники и бригад', desc: 'Не учтено в себестоимости. Прибыль по проекту выглядит нормальной — только деньги не сходятся.' }
      ],
      healthy: [
        { title: 'Один убыточный проект среди прибыльных', desc: 'Общая картина в норме, но 1–2 конкретных проекта могут тихо тянуть вниз.' },
        { title: 'Скрытый перекос по заказчикам', desc: 'Один клиент платит с отсрочкой 60+ дней — кассу держат остальные.' },
        { title: 'Себестоимость без накладных', desc: 'Управленческие расходы не разнесены по проектам. Реальная маржа может быть меньше.' }
      ]
    },
    it: {
      receivables: [
        { title: 'Постоплата 30–60 дней', desc: 'Проект сдан, акт есть, деньги идут. Команда уже получила зарплату за этот период.' },
        { title: 'Технический долг как скрытая дебиторка', desc: 'Переделки после сдачи — часы съедаются, клиент не платит.' },
        { title: 'Удержание части до стабилизации', desc: '«20% после месяца без багов» задерживается, если обнаружилось что-то мелкое.' }
      ],
      advance: [
        { title: 'Предоплата 30–50% уже в работе', desc: 'Деньги на счёте, но команда забирает зарплату ещё 2–3 месяца.' },
        { title: 'Несколько проектов на одном авансе', desc: 'Подушка из авансов маскирует проблемы в экономике отдельных контрактов.' },
        { title: 'SLA и гарантийная поддержка', desc: 'Деньги за разработку, а впереди ещё месяцы поддержки.' }
      ],
      loss: [
        { title: 'Недооценённые трудозатраты', desc: 'Оценили на 200 ч, потратили 340. Маржа в минусе, в отчёте может не видеться.' },
        { title: 'Fixed-cost инфраструктура', desc: 'Хостинг, сервисы, лицензии — не разнесены по проектам.' },
        { title: 'Отток/простой разработчиков', desc: 'Зарплата платится, загрузки нет — маржа растворяется.' }
      ],
      healthy: [
        { title: 'Один убыточный клиент', desc: 'По обороту всё ок, но один контракт тихо тянет ресурсы.' },
        { title: 'Скрытая сверхурочка', desc: 'Часы за пределами оценки не фиксируются — проект кажется прибыльным.' },
        { title: 'Премии раньше денег', desc: 'Начисления идут раньше, чем клиент закрыл платёж.' }
      ]
    },
    agency: {
      receivables: [
        { title: 'Постоплата клиентов + предоплата подрядчикам', desc: 'Вы заплатили дизайнерам/подрядчикам, клиент ещё нет.' },
        { title: 'Длинный цикл согласований', desc: 'Работа сдана, счёт выставлен — согласование 2–4 недели.' },
        { title: 'Правки без доплаты', desc: 'Часы команды растут, счёт не увеличивается.' }
      ],
      advance: [
        { title: 'Ретейнер как подушка', desc: 'Ежемесячный платёж даёт иллюзию стабильности — работа впереди.' },
        { title: 'Предоплата перед запуском кампании', desc: 'Деньги клиента есть, расходы на рекламу — впереди.' },
        { title: 'Параллельные проекты на общем поступлении', desc: 'Большой аванс закрывает кассовые разрывы других проектов.' }
      ],
      loss: [
        { title: 'Внутреннее время команды не в смете', desc: 'Стратегия, созвоны, правки — часы идут, клиент платит за результат.' },
        { title: 'Подрядчики и инструменты сверх бюджета', desc: 'Платные сервисы, видео, дикторы — не всегда отражены в цене.' },
        { title: 'Недооценённая сложность брифов', desc: 'Проект казался «на 2 недели», делали 6 — маржа съедена.' }
      ],
      healthy: [
        { title: 'Один убыточный клиент в портфеле', desc: 'По обороту норма, один клиент тихо тянет команду в минус.' },
        { title: 'Скрытая зависимость от топ-клиента', desc: '40%+ выручки от одного — риск концентрации.' },
        { title: 'Неполный учёт накладных', desc: 'Аренда, CRM, подписки — не разнесены.' }
      ]
    },
    production: {
      receivables: [
        { title: 'Отгрузка без предоплаты', desc: 'Продукция ушла, деньги идут 30–60 дней. Склад и сырьё уже оплачены.' },
        { title: 'Длинные цепочки субконтрактации', desc: 'Получите деньги, когда ваш клиент получит от своего.' },
        { title: 'Сезонные колебания', desc: 'В пике продаж кажется ок — деньги приходят на 2 месяца позже.' }
      ],
      advance: [
        { title: 'Аванс под заказ до закупки сырья', desc: 'Деньги есть, материалы ещё не куплены — по курсу, который может измениться.' },
        { title: 'Обязательства по срокам поставки', desc: 'Аванс получен, впереди цикл, зарплаты, энергоносители.' },
        { title: 'Сезонные запасы клиентов', desc: 'Деньги в кассе, но впереди сборка, логистика, монтаж.' }
      ],
      loss: [
        { title: 'Рост стоимости сырья', desc: 'Контракт подписан по старой цене, сырьё — по новой. Маржа испарилась.' },
        { title: 'Переработка и штрафы за срыв сроков', desc: 'Не учитывается в плановой себестоимости.' },
        { title: 'Простой оборудования и брак', desc: 'Невидимые потери в цикле, не разнесённые по заказам.' }
      ],
      healthy: [
        { title: 'Один заказ в минусе', desc: 'По общей марже норма, крупный контракт тянет вниз.' },
        { title: 'Скрытый неликвид на складе', desc: 'Замороженные деньги в материалах на квартал+.' },
        { title: 'Накладные не разнесены', desc: 'Цеховые расходы, энергия, амортизация — себестоимость занижена.' }
      ]
    },
    other: {
      receivables: [
        { title: 'Длинная дебиторка ключевых клиентов', desc: 'Работа выполнена, оплата задерживается.' },
        { title: 'Нерегулярные платежи', desc: 'Один крупный задерживает — вся касса под риском.' },
        { title: 'Скрытая дебиторка в отсрочках', desc: 'Договорённости «потом заплатим» без контроля.' }
      ],
      advance: [
        { title: 'Аванс не отделён от обязательств', desc: 'Деньги в кассе, работа впереди.' },
        { title: 'Переплата клиентов', desc: 'Иногда задваивается оплата — это не прибыль.' },
        { title: 'Депозиты и гарантийные суммы', desc: 'Формально на счёте, реально — чужие деньги.' }
      ],
      loss: [
        { title: 'Неучтённые прямые расходы', desc: 'Мелкие статьи суммарно съедают маржу.' },
        { title: 'Скрытые постоянные расходы', desc: 'Аренда, подписки, комиссии — не разнесены.' },
        { title: 'Отток клиентов при высоком CAC', desc: 'CAC выше LTV — убыток растёт.' }
      ],
      healthy: [
        { title: 'Перекос между продуктами/услугами', desc: 'По общей картине норма, внутри могут быть убыточные линии.' },
        { title: 'Зависимость от одного клиента', desc: 'Концентрация риска не видна.' },
        { title: 'Маржа без накладных завышена', desc: 'Управленческие расходы не разнесены.' }
      ]
    }
  };

  /* ═════ ПРОЕКЦИЯ: без Финтабло vs с Финтабло (12 мес) ═════ */
  function projection(model){
    var monthly = Math.abs(model.gap);
    // Без изменений — разрыв накапливается линейно ×12
    var doNothingAnnual = monthly * 12;
    // С Финтабло — типичное сокращение разрыва 40–60% за 3 мес, потом стабильно ~30% от исходного
    // Консервативная оценка: за год средний разрыв становится 35% от исходного
    var withFintabloAnnual = Math.round(monthly * 12 * 0.35);
    var saved = doNothingAnnual - withFintabloAnnual;
    return {
      monthly: monthly,
      doNothingAnnual: doNothingAnnual,
      withFintabloAnnual: withFintabloAnnual,
      saved: saved,
      savedMonthly: Math.round(saved / 12),
      reductionPct: 65
    };
  }

  MoneyProfit.calc = {
    calcModel: calcModel,
    formatRub: formatRub,
    formatShort: formatShort,
    parseRub: parseRub,
    industryContext: industryContext,
    interpretation: interpretation,
    pasHeadline: pasHeadline,
    industryBenchmark: industryBenchmark,
    benchPosition: benchPosition,
    actionPlan: actionPlan,
    personalLeaks: personalLeaks,
    projection: projection
  };

})(typeof window !== 'undefined' ? window : globalThis);
