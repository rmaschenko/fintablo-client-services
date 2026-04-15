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

  MoneyProfit.calc = {
    calcModel: calcModel,
    formatRub: formatRub,
    formatShort: formatShort,
    parseRub: parseRub,
    industryContext: industryContext,
    interpretation: interpretation,
    pasHeadline: pasHeadline
  };

})(typeof window !== 'undefined' ? window : globalThis);
