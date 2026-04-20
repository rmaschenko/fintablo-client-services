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
      data_lag: 'dashboard',
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
    construction: ['Объект «Невский»',  'Объект «Северный»', 'Объект «Марьино»'],
    it:           ['Проект А · корпоративный клиент', 'Проект Б · розничная сеть', 'Проект В · финансовый сервис'],
    agency:       ['Клиент «Альфа»',     'Клиент «Омега»',     'Клиент «Сигма»'],
    production:   ['Линия A',            'Линия B',            'Линия C'],
    services:     ['Консалтинг',         'Внедрение',          'Сопровождение'],
    other:        ['Направление A',      'Направление B',      'Направление C']
  };

  // Анонимные кейсы по профилю — типовые «до/после». Формулировки универсальны
  // по бизнес-модели (подходят и проектным, и поточным компаниям).
  const ANON_CASES = {
    blind: {
      title: 'Компания на 80 млн ₽/год',
      before: ['Учёт — в голове собственника и одной таблице', 'Кассовые разрывы 2–3 раза в год без предупреждения', 'Рентабельность направлений видна только после закрытия периода'],
      after:  ['ДДС и ОПиУ обновляются еженедельно', 'Кассовый разрыв прогнозируется за 4–6 недель', 'Убыточное направление обнаружено на 2-й неделе и скорректировано']
    },
    scale_without_control: {
      title: 'Средний бизнес, 200 млн ₽/год',
      before: ['Управленческий отчёт — 3 дня работы финансиста', 'Рентабельность направлений считается постфактум', 'Решения опаздывают на цикл закрытия периода'],
      after:  ['Закрытие месяца — 1 час, картина бизнеса в моменте', '2 направления в минус выявлены и выведены в плюс за 60 дней', 'Решения принимаются по актуальным данным, а не по прошлому месяцу']
    },
    accounting_illusion: {
      title: 'Компания услуг и продуктов, 150 млн ₽/год',
      before: ['1С закрывает налоговый контур', 'Управленческий ОПиУ собирается в 5 Excel-файлах', 'Финансист тратит 35 часов/мес на сведение данных'],
      after:  ['Единый справочник направлений и статей', 'Автоматический управленческий ОПиУ поверх 1С', 'Сведение данных автоматическое, 3–5 часов/мес на контроль']
    },
    early_stage: {
      title: 'Растущая компания, 40 млн ₽/год',
      before: ['Вся отчётность — в голове собственника', 'Личные и рабочие деньги на одном счёте', 'Рост команды на 50% сломал учёт в Excel'],
      after:  ['Единый формат направления: план, факт, рентабельность', 'Разделение потоков по счетам', 'Готовая база для масштабирования без реструктуризации']
    },
    almost_there: {
      title: 'Сервисный бизнес, 120 млн ₽/год',
      before: ['Есть ДДС, но нет прогноза вперёд', 'План-факт собирается вручную поквартально', '30% регулярных отчётов не используются'],
      after:  ['Прогноз ДДС на 6 недель автоматический', 'План-факт обновляется в моменте', 'Убраны 3 ненужных отчёта — команда освободила 20 часов/мес']
    },
    plateau: {
      title: 'Зрелый бизнес, 180 млн ₽/год',
      before: ['Текущий инструмент не отвечает на новые вопросы управления', 'Каждый нестандартный отчёт — 2–3 дня работы', 'Финансист ограничен рутинным сбором данных'],
      after:  ['Инструмент закрывает 90% нестандартных запросов', 'Отчёт под любой вопрос готовится до 30 минут', 'Финансист переходит к анализу и сценариям, а не сбору данных']
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
    const greeting = data.name ? data.name + ', ваш' : 'Ваш';
    $('rs1-title').textContent = greeting + ' финансовый профиль';

    // TL;DR — резюме диагностики
    const tldrTitle = $('tldr-title');
    if (tldrTitle) tldrTitle.textContent = (data.name ? data.name + ', ' : '') + 'коротко о вашей ситуации';
    const tldrBody = $('tldr-body');
    if (tldrBody) tldrBody.textContent = (data.roleFrame || data.profileDescription || '') + ' ' + (data.cohortInsight || '');
    const tldrP = $('tldr-profile'); if (tldrP) tldrP.textContent = data.profileName || '—';
    const tldrI = $('tldr-index');   if (tldrI) tldrI.textContent = data.transparencyIndex + ' / 100 · ' + (data.zoneLabel || '');
    const tldrL = $('tldr-loss');    if (tldrL) tldrL.textContent = '~ ' + C.formatMoneyCompact(data.estimatedAnnualLoss) + '/год';

    // Section 1 · Профиль
    const iconEl = $('rs1-profile-icon');
    if (iconEl) iconEl.innerHTML = (C.PROFILE_ICONS && C.PROFILE_ICONS[data.profileCode]) || '';
    $('rs1-profile-name').textContent = data.profileName || '—';
    $('rs1-profile-desc').textContent = data.profileDescription || '—';

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

    const systemLabels = { none: 'без системного учёта', excel: 'с Excel', '1c': 'с 1С', other: 'с самописной системой', service: 'со спец. сервисом' };
    const sysLabel = systemLabels[data.accountingSystem] || 'с текущей системой';
    $('rs1-cohort-hint').textContent =
      'Ваш индекс: ' + data.transparencyIndex + '. Типовой для компаний вашего масштаба ' + sysLabel +
      ' — около ' + data.peerIndex + '. У 25% наиболее зрелых похожих компаний — от ' + data.topIndex + '.';

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

    // Секция · План выхода 30/60/90
    const planGrid = $('rs-plan');
    if (planGrid && data.pathOut) {
      const badges = ['30 дней', '60 дней', '90 дней'];
      const titles = ['Базовая гигиена', 'Систематизация', 'Полная картина'];
      planGrid.innerHTML = '';
      data.pathOut.forEach((step, i) => {
        const card = document.createElement('div'); card.className = 'plan-card';
        card.innerHTML =
          '<div class="plan-card-head">' +
            '<span class="plan-badge">' + badges[i] + '</span>' +
            '<span class="plan-title">' + titles[i] + '</span>' +
          '</div>';
        const ul = document.createElement('ul'); ul.className = 'plan-list';
        const li = document.createElement('li'); li.textContent = step;
        ul.appendChild(li);
        card.appendChild(ul);
        planGrid.appendChild(card);
      });
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

    // Card 2 · Сравнение индекса: вы / похожие / топ-25%
    const cohBars = $('mc-cohort-bars');
    if (cohBars) {
      const items = [
        { label: 'Вы',                   val: data.transparencyIndex, color: 'blue', highlight: true },
        { label: 'Похожие компании',     val: data.peerIndex,         color: 'neutral' },
        { label: 'Топ-25% похожих',      val: data.topIndex,          color: 'neutral' }
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
      const gap = data.peerIndex - data.transparencyIndex;
      cohFoot.textContent = gap > 0
        ? 'Разрыв до похожих — ' + gap + ' пунктов. После системного учёта, как правило, выходите к ~' + data.fintabloTargetIndex + '.'
        : 'Вы выше средней похожей компании. Задача — точечно достроить оставшиеся контуры.';
    }

    // Card 3 · ОПиУ — реальный оборот, реальные потери, реальный индекс
    const plRev = $('mc-pl-rev'); if (plRev) plRev.textContent = C.formatMoneyCompact(data.monthlyRevenue);
    const plLoss = $('mc-pl-loss'); if (plLoss) plLoss.textContent = '~ ' + C.formatMoneyCompact(data.estimatedAnnualLoss);
    const plIdx = $('mc-pl-idx'); if (plIdx) plIdx.textContent = data.transparencyIndex + ' / 100';

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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
