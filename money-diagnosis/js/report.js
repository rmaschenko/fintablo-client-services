/* ═════ REPORT · рендер одностраничного отчёта ═════ */
(function () {
  'use strict';
  const C = window.Calculator;
  const S = window.Storage;

  const $ = (id) => document.getElementById(id);

  // Зоны потерь по отрасли
  function leaksByIndustry(industry, monthlyRevenue) {
    const loss = Math.round(monthlyRevenue * 12 * 0.08);

    const byInd = {
      construction: [
        { title: 'Субподряд без детализации по объектам', body: 'В строительстве это ключевая зона потерь. Типичная ситуация: акт закрыт, по факту потрачено на 15–20% больше. При вашем масштабе это, как правило, порядка ' + C.formatMoneyCompact(loss * 2) + '/год, которые проходят мимо управленческого учёта.' },
        { title: 'Кассовый разрыв на стыках этапов', body: 'Поступления идут по актам, а обязательства перед подрядчиками и рабочими — непрерывно. Без еженедельного прогноза разрыв проявляется без предупреждения.' },
        { title: 'Непрозрачная рентабельность объекта', body: 'Пока объект ведётся, его рентабельность неизвестна. Убытки фиксируются после закрытия — в момент, когда корректировки уже невозможны.' }
      ],
      it: [
        { title: 'Кассовый разрыв между этапными платежами', body: 'Аванс получен, следующий платёж через 3–4 недели, а команда работает непрерывно. Без прогноза ДДС разрыв проявляется в последний момент.' },
        { title: 'Рентабельность проекта видна только в конце', body: 'Пока спринт в работе, рентабельность неизвестна. Ответ на вопрос «какой проект самый прибыльный» требует часов ручных расчётов.' },
        { title: 'ФОТ не разложен по проектам', body: 'Команда работает на нескольких проектах параллельно — без аллокации ФОТ рентабельность считается усреднённо, а не по каждому проекту.' }
      ],
      agency: [
        { title: 'Рентабельность распределяется на накладные', body: 'Внешние услуги, субподряд, подписки на инструменты — всё это не всегда декомпозируется по клиентам. Суммарно рентабельность положительная, при разбивке по клиентам встречаются убыточные.' },
        { title: 'Расхождение плана и факта', body: 'Проект продан по одной цене, по факту потрачено больше. Без план-факта отклонения видны только в конце квартала, когда корректировка невозможна.' },
        { title: 'Дебиторка накапливается незаметно', body: 'Клиенты задерживают оплату, и без системного контроля долги аккумулируются. Кассовый разрыв проявляется там, где его не планировали.' }
      ],
      production: [
        { title: 'ФОТ и материалы не по продуктам', body: 'Основная управленческая задача — распределение затрат по продуктам. Без этого рентабельность видна суммарно, а не по каждому продукту.' },
        { title: 'Кассовый разрыв на закупках', body: 'Сырьё и материалы оплачиваются заранее, поступления от клиента — позже. Без прогноза ДДС это регулярные разрывы.' },
        { title: 'ОПиУ по продукту недоступен в моменте', body: 'Пока заказ в производстве, его рентабельность неизвестна. Убытки фиксируются после отгрузки.' }
      ],
      services: [
        { title: 'Рентабельность по направлениям не разложена', body: 'Услуги суммарно прибыльные, но вклад каждого направления в прибыль не разложен по данным. Управление идёт по агрегированным цифрам.' },
        { title: 'ФОТ — основная статья, без аллокации', body: 'В услугах 60–80% затрат — это люди. Без распределения времени по направлениям рентабельность считается усреднённо.' },
        { title: 'Дебиторка и авансы накладываются', body: 'Часть клиентов платит авансом, часть постфактум — без единой картины денежный поток выглядит несогласованно.' }
      ],
      other: [
        { title: 'Рентабельность в моменте недоступна', body: 'Пока направление активно, его рентабельность неизвестна. Управление идёт на основании опыта, а не данных.' },
        { title: 'Кассовые разрывы без предупреждения', body: 'Без прогноза ДДС кассовый разрыв проявляется за 3–5 дней, а не за 3–4 недели — окно для манёвра отсутствует.' },
        { title: 'План-факт собирается вручную', body: 'Каждое сведение плана и факта занимает часы. Анализ отклонений выполняется реже, чем требует оперативное управление.' }
      ]
    };

    return byInd[industry] || byInd.other;
  }

  // Фичи Финтабло под профиль + главную боль
  function featuresByProfile(profileCode, primaryPain) {
    const all = {
      pnl:       { name: 'ОПиУ по направлению / продукту',   desc: 'Рентабельность каждой линии видна в моменте, а не после закрытия периода' },
      calendar:  { name: 'Платёжный календарь',               desc: 'Кассовый разрыв прогнозируется за 3–5 недель, а не обнаруживается за 3–5 дней до' },
      planfact:  { name: 'Автоматический план-факт',          desc: 'Отклонения фиксируются в моменте возникновения, а не в конце квартала' },
      cashflow:  { name: 'Прогноз ДДС',                       desc: 'Остатки по всем счетам и направлениям представлены единым прогнозом' },
      receivables:{ name: 'Контроль дебиторской задолженности', desc: 'Реестр дебиторов с датами погашения и приоритетом по сумме' },
      dashboard: { name: 'Единый управленческий дашборд',     desc: 'Все ключевые финансовые показатели бизнеса в одной форме с разбивкой' },
      budgeting: { name: 'Бюджет и сценарии',                 desc: 'Сценарии: как отразится сдвиг оплаты клиентом или изменение спроса' }
    };

    // Базовый набор — 5 штук под любой профиль
    const base = ['pnl', 'calendar', 'planfact', 'cashflow', 'receivables'];

    // Приоритет по боли
    const painBoost = {
      margin_blind: 'pnl',
      late_loss: 'pnl',
      cash_surprise: 'calendar',
      no_big_picture: 'dashboard'
    };

    const priority = painBoost[primaryPain];
    let codes = base.slice();
    if (priority && codes.indexOf(priority) === -1) {
      codes.unshift(priority);
      codes = codes.slice(0, 5);
    } else if (priority) {
      codes = [priority].concat(codes.filter(c => c !== priority)).slice(0, 5);
    }

    return codes.map(c => all[c]);
  }

  // Примеры имён направлений для мок-карточки — по отрасли
  const MOCK_NAMES_BY_INDUSTRY = {
    construction: ['Жилая застройка',        'Коммерческие объекты', 'Инфраструктурные'],
    it:           ['Проект A',               'Проект B',             'Проект C'],
    agency:       ['Ретейнеры',              'Проекты',              'Медиабай'],
    production:   ['Основное производство',  'Спецзаказы',           'Ремонт и сервис'],
    services:     ['Направление 1',          'Направление 2',        'Направление 3'],
    other:        ['Сегмент A',              'Сегмент B',            'Сегмент C']
  };

  // Анонимные кейсы по профилю. Редакционный принцип:
  // «До» — конкретная потеря/риск собственника, с цифрами. Не про отсутствие инструмента, а про последствия.
  // «После» — бизнес-результат (решение, деньги, время), а не фича продукта.
  // Смысл: показать, что системный учёт — инфраструктура роста, а не учётная гигиена.
  const ANON_CASES = {
    blind: {
      title: 'Производство, 80 млн ₽/год · семейный бизнес 8 лет',
      before: [
        'Собственник ощущал: где-то уходит 15–20% выручки — это ~14 млн ₽/год, но какое направление тянет вниз — неясно',
        'Три квартала подряд откладывалось решение «поднять маржу»: непонятно, что именно чинить',
        'Кассовые разрывы 2–3 раза в год как сюрприз. Последний — 1,2 млн ₽ на срочном займе под 30%'
      ],
      after: [
        'На 2-й неделе после внедрения: 1 направление из 5 давало минус 900 тыс ₽/квартал — закрыто без потерь',
        'Прогноз кассы на 6 недель вперёд — разрыв виден до того, как случился. Срочных займов больше нет',
        'За 3 месяца: +8% к марже при том же обороте. Без сокращений, без новых продаж — просто увидели цифры'
      ]
    },
    scale_without_control: {
      title: 'Сервисный бизнес, 200 млн ₽/год · вырос с 60 за 3 года',
      before: [
        'Управленческий отчёт — 3 дня работы финансиста, готов на 5-й день месяца. К выводам поздно, решения откладываются',
        'Рентабельность направлений — постфактум. Убыточное направление фиксируется после квартала, когда потери уже 2–3 млн ₽',
        'Финансист 80% времени сводит данные, 20% — анализирует. Нанимать второго не имеет смысла — задача не масштабируется людьми'
      ],
      after: [
        'Закрытие месяца — 1 час. Картина бизнеса актуальна на вчера, а не на прошлый месяц',
        '2 убыточных направления найдены в моменте, выведены в плюс за 60 дней — возврат 3,8 млн ₽ на оборот',
        'Финансист на сценариях и прогнозах. Рутина автоматизирована — экономия одного штатного сотрудника'
      ]
    },
    accounting_illusion: {
      title: 'Продажи + услуги, 150 млн ₽/год · 1С + 5 Excel',
      before: [
        '1С закрывает налоги. Но «сколько мы зарабатываем по-настоящему» — неизвестно без недели Excel-работы',
        'Управленческий ОПиУ живёт в 5 файлах, каждое открытие месяца — день сверки между ними',
        'Финансист 35 часов/мес сверяет цифры между системами. Это 4 человеко-дня бизнеса, потраченные на «вторую бухгалтерию»'
      ],
      after: [
        'Единый источник правды: управленческий ОПиУ собирается автоматически поверх 1С — без параллельных файлов',
        '35 часов/мес высвобождены. Это ещё одна рабочая неделя финансиста — уже на работу со смыслом',
        '«Сколько мы зарабатываем» известно в любой момент. Решения по ценам и направлениям — за 10 минут, не за неделю'
      ]
    },
    early_stage: {
      title: 'IT-команда, 40 млн ₽/год · выросла из 4 человек в 18 за год',
      before: [
        'Рост команды ×4 за год сломал Excel: файл не открывается без ручных правок, половина формул потеряна',
        'Личные и рабочие деньги на одном счёте. «Зарплата себе» — догадка, а не расчёт. Налоговые риски копятся',
        'Решения «нанимать / не нанимать» принимаются по ощущениям. Два раза промахнулись — 1,5 млн ₽ на лишних оффере'
      ],
      after: [
        'Единый формат проекта: план, факт, рентабельность. База переживёт ещё ×3 роста без переделки',
        'Потоки разделены, «зарплата собственника» — реальная цифра, налоговая дисциплина на уровне',
        'Найм опирается на прогноз кассы, а не на ощущения. За 6 месяцев — ноль лишних оффере'
      ]
    },
    almost_there: {
      title: 'Агентство, 120 млн ₽/год · растёт 40% в год',
      before: [
        'ДДС есть, прогноза вперёд нет. Кассовые разрывы ловятся за 3–5 дней, а не за 3–5 недель — окна для манёвра не остаётся',
        'План-факт собирается поквартально вручную. Отклонения видны к концу квартала, когда менять поздно',
        '30% регулярных отчётов не смотрит никто. Их делают по инерции — команда тратит ~20 часов/мес на ненужное'
      ],
      after: [
        'Прогноз ДДС на 6 недель автоматический. Окно для манёвра — месяц, а не неделя. Ни одного срочного займа за квартал',
        'План-факт обновляется в моменте. Отклонения фиксируются в первую неделю — корректируется тот же квартал',
        '3 отчёта убраны, 20 часов/мес освободилось. Финансист вернулся к сценариям и анализу'
      ]
    },
    plateau: {
      title: 'Производство, 180 млн ₽/год · 12 лет на рынке',
      before: [
        'Текущий инструмент не отвечает на новые вопросы: «маржа по новому продукту» — неделя подготовки',
        'Каждый нестандартный разрез — 2–3 дня работы. Решения, которые можно было бы принять за час, откладываются на неделю',
        'Финансист — высококвалифицированный, но занят сбором данных. Стратегические задачи не доходят до его рук'
      ],
      after: [
        '90% нестандартных запросов закрываются в инструменте напрямую. Собственник получает ответ в разговоре, а не после «подготовлю»',
        'Нестандартный разрез — до 30 минут, не 2–3 дня. Ритм принятия решений ускорился в 5–10 раз',
        'Финансист переключился на сценарии и стратегию. Это та работа, за которую его нанимали'
      ]
    }
  };

  const CHECKLIST = [
    'Мы закрываем управленческий месяц за 1–3 рабочих дня',
    'Рентабельность каждого направления / проекта известна в моменте, а не постфактум',
    'Прогноз ДДС на 4–6 недель актуален и обновляется без ручного сбора',
    'Расхождений между бухгалтерским и управленческим учётом — нет',
    'Дебиторская задолженность контролируется по срокам и приоритету',
    'На утренний обзор бизнеса уходит не более 15 минут',
    'Любой нестандартный управленческий вопрос закрывается за ≤1 час'
  ];

  function checklistHintByCount(n) {
    if (n <= 2) return 'При 0–2 ответах «да» это соответствует вашему профилю и цифрам выше. Разрыв между текущим состоянием и «системной прозрачностью» — существенный, но проходимый.';
    if (n <= 4) return 'При 3–4 ответах «да» у вас собрано ядро системы. Полный разбор покажет, каких 1–2 контуров не хватает для перехода в «системную прозрачность».';
    return 'При 5+ ответах «да» ваша управленческая зрелость выше типовой для похожих компаний. Диагностика даст точечные рекомендации по закрытию оставшихся пробелов.';
  }

  function render(data) {
    // TL;DR — резюме диагностики (первый и единственный h1 на странице)
    const tldrTitle = $('tldr-title');
    if (tldrTitle) tldrTitle.textContent = (data.name ? data.name + ', ' : '') + 'коротко о вашей ситуации';
    const tldrBody = $('tldr-body');
    // TL;DR body = только cohortInsight (ценность: «вы не одни, это типовой паттерн»).
    // roleFrame переехал в Section 1 sub (видно на экране 2), profileDescription — в Section 1.
    if (tldrBody) {
      tldrBody.textContent = data.cohortInsight || data.profileDescription || '';
    }
    const tldrP = $('tldr-profile'); if (tldrP) tldrP.textContent = data.profileName || '—';
    const tldrI = $('tldr-index');   if (tldrI) tldrI.textContent = data.transparencyIndex + ' / 100 · ' + (data.zoneLabel || '');
    const tldrL = $('tldr-loss');    if (tldrL) tldrL.textContent = '~ ' + C.formatMoneyCompact(data.estimatedAnnualLoss) + '/год';

    // Section 1 · Ролевой хук (профиль/описание уже в TL;DR, не дублируем)
    const rf = $('rs1-role-frame');
    if (rf) {
      if (data.roleFrame) { rf.textContent = data.roleFrame; rf.hidden = false; }
      else rf.hidden = true;
    }

    // Section 1 · Индекс прозрачности — бенчмарк-бар
    $('rs1-index').textContent = data.transparencyIndex;
    const zoneEl = $('rs1-zone');
    if (zoneEl) {
      zoneEl.textContent = data.zoneLabel || '—';
      zoneEl.className = 'ric-zone ric-zone-' + (data.zoneCode || 'red');
    }
    $('rs1-zone-hint').textContent = data.zoneHint || '';

    const you = $('rs1-bm-you');
    const peer = $('rs1-bm-peer');
    const top = $('rs1-bm-top');
    if (you) you.style.left = data.transparencyIndex + '%';
    if (peer) peer.style.left = data.peerIndex + '%';
    if (top) top.style.left = data.topIndex + '%';

    const systemLabels = { none: 'без системного учёта', excel: 'на Excel', '1c': 'на 1С', other: 'на самописной системе', service: 'на специализированном сервисе' };
    const sysLabel = systemLabels[data.accountingSystem] || 'на текущей системе';
    $('rs1-cohort-hint').textContent =
      'Ваш индекс — ' + data.transparencyIndex + '. У конкурентов вашего масштаба ' + sysLabel +
      ' он обычно около ' + data.peerIndex + '. У лидеров рынка — компаний с системным финансовым учётом — от ' + data.topIndex + '. ' +
      'Разрыв с лидерами — не про удачу или талант команды, а про инфраструктуру учёта, которую они поставили первой.';

    // Section 1 · Размер слепой зоны (3-компонентный breakdown)
    $('rs1-loss').textContent = '~ ' + C.formatMoneyCompact(data.estimatedAnnualLoss) + '/год';
    const bdEl = $('rs1-breakdown');
    if (bdEl && data.lossBreakdown) {
      bdEl.innerHTML = '';
      const items = [
        { item: data.lossBreakdown.teamTime,    code: 'team' },
        { item: data.lossBreakdown.hiddenDrops, code: 'hidden' },
        { item: data.lossBreakdown.delay,       code: 'delay' }
      ];
      items.forEach(x => {
        const row = document.createElement('div');
        row.className = 'bd-row bd-' + x.code;
        const head = document.createElement('div'); head.className = 'bd-head';
        const nm = document.createElement('span'); nm.className = 'bd-name'; nm.textContent = x.item.label;
        const vl = document.createElement('span'); vl.className = 'bd-val mono'; vl.textContent = '~ ' + C.formatMoneyCompact(x.item.annual) + '/год';
        head.appendChild(nm); head.appendChild(vl);
        const hint = document.createElement('div'); hint.className = 'bd-hint'; hint.textContent = x.item.hint;
        row.appendChild(head); row.appendChild(hint);
        bdEl.appendChild(row);
      });
    }

    // Section 2 · Зеркальные вопросы
    $('rs2-pain-label').textContent = '«' + (data.painLabel || '—') + '»';
    const qList = $('rs2-questions');
    qList.innerHTML = '';
    (data.mirrorQuestions || []).forEach(q => {
      const li = document.createElement('li');
      li.textContent = q;
      qList.appendChild(li);
    });
    $('rs2-benchmark').textContent = (data.industryBenchmark || '') + ' ' + (data.revenueModifier || '');

    // Section 3 · Зоны потерь
    const leaks = leaksByIndustry(data.industry, data.monthlyRevenue);
    const leaksGrid = $('rs3-leaks');
    leaksGrid.innerHTML = '';
    leaks.forEach(l => {
      const card = document.createElement('div');
      card.className = 'rs-leak-card';
      const t = document.createElement('div'); t.className = 'rsl-title'; t.textContent = l.title;
      const b = document.createElement('div'); b.className = 'rsl-body'; b.textContent = l.body;
      card.appendChild(t); card.appendChild(b);
      leaksGrid.appendChild(card);
    });

    // Секция · Цена бездействия
    if (data.inaction) {
      $('rsi-sub').textContent = data.inaction.title || '—';
      $('rsi-body').textContent = data.inaction.body || '—';
    }
    const rsiCoh = $('rsi-cohort');
    if (rsiCoh) rsiCoh.textContent = data.cohortInsight || '';

    // Секция · План действий на 3 месяца (roadmap с нумерацией и connecting line)
    const planGrid = $('rs-plan');
    if (planGrid && data.pathOut) {
      const titles = ['Базовая гигиена', 'Систематизация', 'Полная картина'];
      const periods = ['1-й месяц', '2-й месяц', '3-й месяц'];
      planGrid.innerHTML = '';
      data.pathOut.forEach((step, i) => {
        const card = document.createElement('div'); card.className = 'plan-card';
        card.innerHTML =
          '<div class="plan-card-head">' +
            '<span class="plan-badge" aria-label="' + periods[i] + '">' + (i + 1) + '</span>' +
            '<div><div class="plan-period mono">' + periods[i] + '</div>' +
            '<div class="plan-title">' + titles[i] + '</div></div>' +
          '</div>';
        const ul = document.createElement('ul'); ul.className = 'plan-list';
        const li = document.createElement('li'); li.textContent = step;
        ul.appendChild(li);
        card.appendChild(ul);
        planGrid.appendChild(card);
      });
    }

    // Секция · Ваш первый шаг (по readiness-ответу из шага 7)
    const fsSection = $('rs-firststep-section');
    if (fsSection) {
      if (data.readinessInsight) {
        fsSection.hidden = false;
        const fsT = $('rs-firststep-title'); if (fsT) fsT.textContent = data.readinessInsight.title;
        const fsD = $('rs-firststep-desc');  if (fsD) fsD.textContent = data.readinessInsight.body;
      } else {
        fsSection.hidden = true;
      }
    }

    // Секция · Self-check
    const checkList = $('rs-checklist-list');
    if (checkList) {
      checkList.innerHTML = '';
      CHECKLIST.forEach(item => {
        const li = document.createElement('li'); li.textContent = item;
        checkList.appendChild(li);
      });
    }
    const checkHint = $('rs-checklist-hint');
    if (checkHint) {
      // Приблизительное «попадание» по текущему индексу
      const likelyYes =
        data.transparencyIndex >= 80 ? 6 :
        data.transparencyIndex >= 60 ? 4 :
        data.transparencyIndex >= 30 ? 2 : 1;
      checkHint.textContent = checklistHintByCount(likelyYes);
    }

    // Секция · Анонимный кейс
    const anon = ANON_CASES[data.profileCode] || ANON_CASES.blind;
    const racTitle = $('rac-title'); if (racTitle) racTitle.textContent = anon.title;
    const beforeUl = $('rac-before-list');
    const afterUl = $('rac-after-list');
    if (beforeUl) { beforeUl.innerHTML = ''; anon.before.forEach(t => { const li = document.createElement('li'); li.textContent = t; beforeUl.appendChild(li); }); }
    if (afterUl)  { afterUl.innerHTML = '';  anon.after.forEach(t => { const li = document.createElement('li'); li.textContent = t; afterUl.appendChild(li); }); }

    // Section 5 · Траектория
    const rtNow = $('rt-now-val'); if (rtNow) rtNow.textContent = data.transparencyIndex + ' / 100';
    const rtNowZone = $('rt-now-zone'); if (rtNowZone) {
      rtNowZone.textContent = data.zoneLabel || '—';
      rtNowZone.className = 'rt-now-zone ric-zone-' + (data.zoneCode || 'red');
    }
    const rtTarget = $('rt-target-val'); if (rtTarget) rtTarget.textContent = data.fintabloTargetIndex + ' / 100';

    // Section 5 · Реальные визуализации на основе ответов пользователя

    // Card 1 · Структура слепой зоны — 3 горизонтальных бара с реальными ₽
    const bdBars = $('mc-bd-bars');
    if (bdBars && data.lossBreakdown) {
      const items = [
        { key: 'team',   label: 'Время команды на сверку',       val: data.lossBreakdown.teamTime.annual,    color: 'blue' },
        { key: 'hidden', label: 'Невидимые просадки',            val: data.lossBreakdown.hiddenDrops.annual, color: 'blue' },
        { key: 'delay',  label: 'Задержка решений',              val: data.lossBreakdown.delay.annual,       color: 'blue' }
      ];
      const max = Math.max.apply(null, items.map(x => x.val));
      bdBars.innerHTML = '';
      items.forEach(x => {
        const pct = Math.max(12, Math.round((x.val / max) * 100));
        const row = document.createElement('div');
        row.className = 'mc-bar mc-bar-' + x.color;
        row.innerHTML =
          '<span class="mc-bar-name">' + x.label + '</span>' +
          '<span class="mc-bar-track"><span class="mc-bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="mc-bar-val mono">' + C.formatMoneyCompact(x.val) + '</span>';
        bdBars.appendChild(row);
      });
    }
    const bdFoot = $('mc-bd-foot');
    if (bdFoot) bdFoot.textContent = 'Сумма: ~' + C.formatMoneyCompact(data.estimatedAnnualLoss) + '/год. Это оценка по вашим данным — не гарантия.';

    // Card 2 · Сравнение индекса: вы / конкуренты / лидеры рынка
    const cohBars = $('mc-cohort-bars');
    if (cohBars) {
      const items = [
        { label: 'Вы',                     val: data.transparencyIndex, color: 'blue', highlight: true },
        { label: 'Конкуренты · ваш масштаб', val: data.peerIndex,         color: 'neutral' },
        { label: 'Лидеры рынка',           val: data.topIndex,          color: 'neutral' }
      ];
      cohBars.innerHTML = '';
      items.forEach(x => {
        const pct = Math.max(6, x.val);
        const row = document.createElement('div');
        row.className = 'mc-bar mc-bar-idx mc-bar-' + x.color + (x.highlight ? ' mc-bar-you' : '');
        row.innerHTML =
          '<span class="mc-bar-name">' + x.label + '</span>' +
          '<span class="mc-bar-track"><span class="mc-bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="mc-bar-val mono">' + x.val + ' / 100</span>';
        cohBars.appendChild(row);
      });
    }
    const cohFoot = $('mc-cohort-foot');
    if (cohFoot) {
      const gapPeer = data.peerIndex - data.transparencyIndex;
      const gapTop  = data.topIndex  - data.transparencyIndex;
      cohFoot.textContent = gapPeer > 0
        ? 'До конкурентов — ' + gapPeer + ' пунктов, до лидеров — ' + gapTop + '. После системного учёта компании вашего профиля, как правило, выходят к ~' + data.fintabloTargetIndex + ' — это рубеж, с которого рост становится предсказуемым.'
        : 'Вы уже выше среднего конкурента. До лидеров — ' + gapTop + ' пунктов: точечная достройка оставшихся контуров даст эти пункты и переведёт бизнес в зону предсказуемого управления.';
    }

    // Card 3 · ОПиУ — реальный оборот, реальные потери, реальный индекс
    // Card 3 (ОПиУ ОПиУ за период) удалена — заменена на секцию .rs-screens
    // со скрин-рамками реального интерфейса Финтабло (figure/img slots).

    // Section 5 · Функции + CTA
    const feats = featuresByProfile(data.profileCode, data.primaryPain);
    const featsGrid = $('rs5-features');
    featsGrid.innerHTML = '';
    feats.forEach(f => {
      const el = document.createElement('div');
      el.className = 'rs-feat';
      const body = document.createElement('div'); body.className = 'rs-feat-body';
      const name = document.createElement('div'); name.className = 'rs-feat-name'; name.textContent = f.name;
      const desc = document.createElement('div'); desc.className = 'rs-feat-desc'; desc.textContent = f.desc;
      body.appendChild(name); body.appendChild(desc);
      el.appendChild(body);
      featsGrid.appendChild(el);
    });

    // Финтабло-проекция возврата — конкретная мотивация, привязанная к цифре потерь
    const proj = data.fintabloProjection || C.fintabloProjection(data.estimatedAnnualLoss);
    const rtProjVal = $('rt-proj-val');
    if (rtProjVal && proj && proj.low) {
      rtProjVal.textContent = '~ ' + C.formatMoneyCompact(proj.low) + ' — ' + C.formatMoneyCompact(proj.high);
    }
    const rtProjHint = $('rt-proj-hint');
    if (rtProjHint && proj && proj.midpoint) {
      rtProjHint.textContent = 'Типовой возврат за 3 месяца — 40–60% слепой зоны. Для вашего масштаба это медиана ~' +
        C.formatMoneyCompact(proj.midpoint) + '/год, окупает подписку Финтабло в десятки раз.';
    }

    // Mid-report anchor CTA — показываем сразу после «Размер слепой зоны»,
    // пока эмоциональный пик. Текст динамический: loss + projection.
    const midCtaLoss = $('rs1-mid-cta-loss');
    if (midCtaLoss) midCtaLoss.textContent = '~ ' + C.formatMoneyCompact(data.estimatedAnnualLoss) + '/год';
    const midCtaReturn = $('rs1-mid-cta-return');
    if (midCtaReturn && proj && proj.low) {
      midCtaReturn.textContent = '~ ' + C.formatMoneyCompact(proj.low) + ' — ' + C.formatMoneyCompact(proj.high) + '/год';
    }

    // Deep-link в Финтабло с персональными параметрами — 3 trial-CTA (mid, bottom, fab).
    // Верхняя welcome-плашка удалена (преждевременный CTA до ценности).
    const deepLink = C.buildFintabloDeepLink(data, 'https://fintablo.ru/registration');
    ['cta-trial-mid', 'cta-trial-bottom', 'cta-trial-fab'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute('href', deepLink);
        el.addEventListener('click', () => {
          ym('reachGoal', 'moneydiag_trial_click');
          ym('reachGoal', 'moneydiag_trial_click_' + id.replace('cta-trial-', ''));
        });
      }
    });
  }

  function init() {
    ym('reachGoal', 'moneydiag_report_view');
    const data = S.loadReportData();
    if (!data || data.transparencyIndex == null) {
      $('main').hidden = true;
      $('no-data').hidden = false;
      return;
    }
    render(data);
    if (data.leadSent) ym('reachGoal', 'moneydiag_pixel_hot');

    // Lead modal (soft opt-in: любая кнопка [data-open-lead-modal] или #rs5-cta → модальное окно)
    const modal = document.getElementById('lead-modal');
    if (modal) {
      const show = (trigger) => {
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        ym('reachGoal', 'moneydiag_lead_modal_open');
        if (trigger) ym('reachGoal', 'moneydiag_lead_modal_open_' + trigger);
        setTimeout(() => {
          const firstInput = modal.querySelector('input:not([type="hidden"]):not(.hp-field)');
          if (firstInput) firstInput.focus();
        }, 50);
      };
      const hide = () => {
        modal.hidden = true;
        document.body.style.overflow = '';
      };
      // Все триггеры: rs5-cta (dual-cta primary) + любой data-open-lead-modal (inline-cta, fab)
      const triggers = Array.prototype.slice.call(document.querySelectorAll('#rs5-cta, [data-open-lead-modal]'));
      triggers.forEach(btn => {
        btn.addEventListener('click', () => {
          const src = btn.closest('.inline-cta-top') ? 'top'
            : btn.closest('.inline-cta-mid') ? 'mid'
            : btn.closest('.rs-fab') ? 'fab'
            : btn.id === 'rs5-cta' ? 'bottom'
            : 'other';
          show(src);
        });
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.hasAttribute('data-modal-close')) hide();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) hide();
      });
    }

    // Sticky FAB: прячем когда во вьюпорте любой inline CTA (mid/bottom) —
    // две синие кнопки одновременно размывают conversion-goal.
    const fab = document.getElementById('rs-fab');
    const tldr = document.querySelector('.rs-tldr');
    const inlineCtas = document.querySelectorAll('.rs-mid-cta, .rs-cta-dual');
    if (fab && tldr && 'IntersectionObserver' in window) {
      let tldrOut = false;
      let inlineVisible = false;
      const sync = () => {
        const show = tldrOut && !inlineVisible;
        fab.hidden = !show;
        fab.setAttribute('aria-hidden', String(!show));
      };
      new IntersectionObserver(entries => {
        entries.forEach(e => { tldrOut = !e.isIntersecting && e.boundingClientRect.top < 0; });
        sync();
      }, { threshold: 0, rootMargin: '-40px 0px 0px 0px' }).observe(tldr);
      if (inlineCtas.length) {
        const visibleSet = new Set();
        const obs2 = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (e.isIntersecting) visibleSet.add(e.target); else visibleSet.delete(e.target);
          });
          inlineVisible = visibleSet.size > 0;
          sync();
        }, { threshold: 0.3 });
        inlineCtas.forEach(el => obs2.observe(el));
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
