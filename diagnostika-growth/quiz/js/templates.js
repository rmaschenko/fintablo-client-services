/* ═════ TEMPLATES · реестр Excel-шаблонов для anti-ICP ═════
   Подбор шаблонов под (боль × тип бизнеса) для anti-ICP-сегмента.

   Источник файлов: публичная папка корпоративного Я.Диска Финтабло.
   URL строятся как `<PUBLIC_KEY>?path=<имя файла>` — Я.Диск открывает
   UI с предпросмотром файла, пользователь скачивает кнопкой «Скачать».

   Если папка переедет — поменять PUBLIC_KEY в одном месте.
   Если поменяется имя файла — поменять name в REGISTRY.
   Подробности — в diagnostika-growth/TEMPLATES.md */
(function (global) {
  'use strict';

  // Публичная папка с шаблонами Финтабло на Я.Диске
  const PUBLIC_KEY = 'https://disk.yandex.ru/d/NPG3nHemZ743oQ';
  // Все файлы в папке имеют общий суффикс — отделён, чтобы name был чистым
  const FILE_SUFFIX = '. Чтобы пользоваться шаблоном, создайте копию.xlsx';

  function buildUrl(fileName) {
    const fullPath = '/' + fileName + FILE_SUFFIX;
    return PUBLIC_KEY + '?path=' + encodeURIComponent(fullPath);
  }

  // ── Реестр шаблонов ──────────────────────────────────────
  // id — для аналитики и getForPain
  // name — заголовок карточки (для UI)
  // desc — описание содержимого (для UI)
  // file — точное имя файла на Я.Диске (без суффикса « . Чтобы пользоваться...»)
  // url — собирается buildUrl, ведёт в UI Я.Диска с открытым файлом
  function tpl(id, name, desc, file) {
    return { id: id, name: name, desc: desc, url: buildUrl(file) };
  }

  const REGISTRY = {
    discount_impact: tpl(
      'discount_impact',
      'Влияние скидки на прибыль',
      'Покажет, сколько прибыли съедает каждая скидка',
      '[ФИНТАБЛО] Влияние скидки на прибыль'
    ),
    calc_projects: tpl(
      'calc_projects',
      'Калькулятор рентабельности проектов',
      'Расчёт прибыли по договору с учётом систем налогообложения',
      '[ФИНТАБЛО] Калькулятор рентабельности проектов'
    ),
    calc_services: tpl(
      'calc_services',
      'Калькулятор себестоимости услуги',
      'Расчёт себестоимости услуги с регламентом ведения',
      '[ФИНТАБЛО] Калькулятор себестоимости услуги'
    ),
    opiu: tpl(
      'opiu',
      'ОПиУ',
      'Отчёт о прибылях и убытках на 12 месяцев — главный управленческий отчёт',
      '[ФИНТАБЛО] ОПиУ'
    ),
    dds: tpl(
      'dds',
      'ДДС — Классический',
      'Отчёт о движении денежных средств: операционная, инвестиционная, финансовая',
      '[ФИНТАБЛО] ДДС — Классический'
    ),
    payment_calendar: tpl(
      'payment_calendar',
      'Платёжный календарь',
      'Прогноз кассовых разрывов на недели вперёд',
      '[ФИНТАБЛО] Платежный календарь'
    ),
    balance: tpl(
      'balance',
      'Баланс',
      'Управленческий баланс: активы, пассивы, капитал',
      '[ФИНТАБЛО] Баланс'
    ),
    sales_report: tpl(
      'sales_report',
      'Шаблон отчёта отдела продаж',
      'Воронка от переговоров до оплат, средние чеки, конверсии',
      '[ФИНТАБЛО] Шаблон отчета отдела продаж'
    ),
    budget: tpl(
      'budget',
      'Бюджет',
      '17 листов: БДДС, ОПиУ, бюджеты продаж, производства, закупок, ФОТ',
      '[ФИНТАБЛО] Бюджет'
    ),
    fm: tpl(
      'fm',
      'Финансовая модель',
      'Шаблон с примерами: интернет-магазин, производство, стоматология, сезонность',
      '[ФИНТАБЛО] Финансовая модель'
    ),
    fm_trade: tpl(
      'fm_trade',
      'Финансовая модель для торговых компаний',
      'Примеры: торгово-производственная, B2B, интернет-магазин, маркетплейс',
      '[ФИНТАБЛО] Финансовая модель для торговых компаний'
    ),
    inventory: tpl(
      'inventory',
      'Управление запасами',
      'ABC/XYZ-анализ, ассортиментная матрица, точка заказа',
      '[ФИНТАБЛО] Управление запасами'
    )
  };

  // ── Подбор 3 шаблонов под (боль × тип бизнеса) ───────────
  // margin_blind  → шок-эффект (скидка) + считалка (проекты/услуги) + общая картина (ОПиУ)
  // cash_surprise → ОПиУ + ДДС + Платёжный календарь
  // manual_close  → ОПиУ + ДДС + Баланс (триада отчётов)
  // blind_decisions → Отчёт продаж + Бюджет/ФМ для торговых + ФМ
  function getForPain(painCode, businessType) {
    let ids;
    if (painCode === 'margin_blind') {
      const calc = businessType === 'services' ? 'calc_services' : 'calc_projects';
      ids = ['discount_impact', calc, 'opiu'];
    } else if (painCode === 'cash_surprise') {
      ids = ['opiu', 'dds', 'payment_calendar'];
    } else if (painCode === 'manual_close') {
      ids = ['opiu', 'dds', 'balance'];
    } else if (painCode === 'blind_decisions') {
      const fm = businessType === 'trade' ? 'fm_trade' : 'fm';
      ids = ['sales_report', 'budget', fm];
    } else {
      ids = ['opiu', 'dds', 'balance'];
    }
    return ids.map(id => REGISTRY[id]);
  }

  // ── Бонус для торговли со складом ────────────────────────
  function getBonus(antiSubtype) {
    if (antiSubtype === 'trade') return REGISTRY.inventory;
    return null;
  }

  const STEP_LABELS = ['Старт', 'Инструмент', 'Масштаб'];

  global.Templates = {
    PUBLIC_KEY,
    REGISTRY,
    getForPain,
    getBonus,
    STEP_LABELS
  };

})(window);
