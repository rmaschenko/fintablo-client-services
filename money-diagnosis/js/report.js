/* ═════ REPORT · рендер 5 секций + режим превью/полный ═════ */
(function () {
  'use strict';
  const C = window.Calculator;
  const S = window.Storage;

  const $ = (id) => document.getElementById(id);

  // Описания профилей
  const PROFILE_DESC = {
    blind: 'Вы ведёте бизнес без системного финансового контроля. Это не редкость для проектных компаний вашего масштаба — но это управление реактивное: узнаёте о проблемах, когда они уже произошли.',
    scale_without_control: 'При вашем обороте и количестве проектов финансовая непрозрачность — уже системный риск, а не просто неудобство. Один убыточный проект при большом портфеле незаметен до конца. По нашим данным, компании вашего масштаба без специализированной системы теряют 15–20% маржи, которую можно было бы сохранить.',
    accounting_illusion: 'У вас есть 1С — это хороший старт. Но 1С считает бухгалтерию, а не управленческую маржу по проектам. Пока проект идёт, вы не видите его рентабельность в моменте — только после закрытия. Стандартная ловушка: кажется, что всё под контролем, но данные опаздывают на 4–6 недель.',
    early_stage: 'Excel справляется при небольшом количестве проектов. Но уже сейчас появляется вопрос: «какой проект самый выгодный?» — и ответ занимает часы, не минуты. С ростом количества проектов это станет узким местом.',
    almost_there: 'У вас уже есть инструмент — это хорошо. Вопрос в том, закрывает ли он все нужные сценарии: план-факт по каждому проекту, прогноз кассового разрыва, контроль дебиторки. Диагностика покажет, каких элементов не хватает.',
    plateau: 'Вы понимаете, что что-то не так с финансовым управлением, но пока не ясно с чего начать. Это нормальный этап перехода от «считаем как-то» к «считаем системно».'
  };

  // Зоны потерь по отрасли + системе
  function leaksByIndustry(industry, mainProblems, revenue) {
    const loss = Math.round(revenue * 12 * 0.08); // примерная цифра для контекста

    const byInd = {
      construction: [
        { title: 'Субподряд без детализации по объектам', body: 'В строительстве это главная «дыра». Типичная ситуация: закрываете акт, а по факту потрачено на 15–20% больше. При вашем обороте это до ' + C.formatMoneyCompact(loss * 2) + '/год.' },
        { title: 'Кассовый разрыв этапности', body: 'Деньги приходят по актам, а материалы и рабочим нужно платить непрерывно. Без прогноза по неделям разрыв возникает неожиданно.' },
        { title: 'Непрозрачная маржа', body: 'Пока проект идёт, его реальная рентабельность неизвестна. Убытки выясняются после закрытия — когда исправить уже нельзя.' }
      ],
      it: [
        { title: 'Кассовый разрыв между этапными платежами', body: 'Аванс получен, следующий платёж через 3–4 недели, а команда работает прямо сейчас. Без прогноза ДДС разрыв незаметен до последнего.' },
        { title: 'Маржа по проекту видна только в конце', body: 'Пока спринт идёт, рентабельность неизвестна. Узнать «какой проект самый выгодный» — вопрос часов расчётов вручную.' },
        { title: 'ФОТ не разложен по проектам', body: 'Команда работает на нескольких проектах параллельно — без учёта часов или аллокации ФОТ маржа считается усреднённо, не по факту.' }
      ],
      agency: [
        { title: 'Маржа «стекает» в накладные', body: 'Командировки, субподряд, лицензии на ПО — всё это не всегда раскладывается по проектам. В результате «в среднем» маржа есть, а по факту — убыточные проекты.' },
        { title: 'Расхождение плана и факта', body: 'Проект продан по одной цене — по факту потрачено больше. Без план-факта по каждому проекту отклонения видны только в конце квартала.' },
        { title: 'Дебиторка накапливается незаметно', body: 'Клиенты задерживают оплату, и без системного контроля долги копятся. А кассовый разрыв возникает там, где его не ждали.' }
      ],
      production: [
        { title: 'ФОТ и материалы не по проектам', body: 'В производстве и монтаже главная управленческая боль — распределение затрат по объектам. Без этого рентабельность видна только «в целом», не по каждому.' },
        { title: 'Кассовый разрыв на закупках', body: 'Сырьё и материалы покупаются заранее, оплата от клиента приходит позже. Без прогноза ДДС это регулярные кассовые разрывы.' },
        { title: 'P&L недоступен в моменте', body: 'Пока заказ в производстве — его маржа неизвестна. Убытки выясняются после отгрузки.' }
      ],
      other: [
        { title: 'Нет маржи в моменте', body: 'Пока проект открыт — его рентабельность неизвестна. Управление идёт по интуиции, не по данным.' },
        { title: 'Кассовые разрывы неожиданны', body: 'Без прогноза ДДС кассовый разрыв виден за 3–5 дней, а не за 3–4 недели.' },
        { title: 'План-факт — ручная сборка', body: 'Каждое сведение плана и факта занимает часы. В результате анализ отклонений делается реже, чем нужно.' }
      ]
    };

    return byInd[industry] || byInd.other;
  }

  // Вопросы без ответа
  function questionsByProfile(profile, proj) {
    const base = [
      'Какой из ваших ' + (proj || 'N') + ' проектов прямо сейчас наименее рентабелен?',
      'Когда именно через 3–4 недели у вас не хватит денег на текущие выплаты?',
      'Сколько из вашей дебиторки реально под риском прямо сейчас?'
    ];
    const extra = {
      blind: ['Сколько вы заработали на каждом проекте за последний квартал — не в целом, а по каждому отдельно?'],
      scale_without_control: ['Если завтра закроется один из крупных проектов — как это повлияет на кассу через 6 недель?'],
      accounting_illusion: ['В чём разница между вашей бухгалтерской прибылью и управленческой прибылью за последний месяц?'],
      early_stage: ['Какой процент вашего времени уходит на сведение цифр вручную?'],
      almost_there: ['Какие сценарии ваш текущий инструмент не закрывает — и сколько это стоит в рублях?'],
      plateau: ['Что бы вы хотели видеть на дашборде каждое утро, но сейчас не видите?']
    };
    return base.concat(extra[profile] || []);
  }

  function render(data) {
    // Section 1
    $('rs1-title').textContent = (data.name ? data.name + ', ваш' : 'Ваш') + ' финансовый профиль';
    $('rs1-index').textContent = data.transparencyIndex + ' / 100';
    $('rs1-index-bar').style.width = data.transparencyIndex + '%';
    $('rs1-index-bar').style.background =
      data.transparencyIndex < 30 ? 'var(--danger)' :
      data.transparencyIndex < 60 ? 'var(--warning)' : 'var(--accent-green)';

    $('rs1-risk-proj').textContent = data.riskProjectsCount + ' из ' + data.activeProjects;
    $('rs1-risk-proj-hint').textContent = 'Проекты без детализации маржи в моменте';
    $('rs1-loss').textContent = '~ ' + C.formatMoneyCompact(data.estimatedAnnualLoss) + '/год';

    $('rs1-profile-name').textContent = C.PROFILE_NAMES[data.profileType] || '—';
    $('rs1-profile-desc').textContent = PROFILE_DESC[data.profileType] || '—';

    // Section 2
    const leaks = leaksByIndustry(data.industry, data.mainProblems, data.monthlyRevenue);
    const leaksGrid = $('rs2-leaks');
    leaksGrid.innerHTML = '';
    leaks.forEach(l => {
      const card = document.createElement('div');
      card.className = 'rs-leak-card';
      card.innerHTML = '<div class="rsl-title"></div><div class="rsl-body"></div>';
      card.querySelector('.rsl-title').textContent = l.title;
      card.querySelector('.rsl-body').textContent = l.body;
      leaksGrid.appendChild(card);
    });

    // Section 3
    const qs = questionsByProfile(data.profileType, data.activeProjects);
    const qList = $('rs3-questions');
    qList.innerHTML = '';
    qs.forEach(q => {
      const li = document.createElement('li');
      li.textContent = q;
      qList.appendChild(li);
    });

    // Section 5 CTA — персонализированный под главную боль
    if (data.mainProblems && data.mainProblems.length) {
      const painLabels = {
        margin: 'невидимую маржу по проектам',
        loss_late: 'поздние убытки',
        cashgap: 'неожиданные кассовые разрывы',
        eating: 'проекты, «съедающие» прибыль',
        planfact: 'расхождения плана и факта',
        free_cash: 'непонимание свободного остатка'
      };
      const first = painLabels[data.mainProblems[0]] || 'ваши зоны риска';
      $('rs5-cta-text').textContent = 'Хотите разобрать ваш отчёт с экспертом? Покажем, как Финтабло закрывает ' + first + ' — на примере вашего бизнеса.';
    }
  }

  function applyMode(data) {
    const isPreview = !data.leadSent;
    document.body.classList.toggle('report-mode-preview', isPreview);
    $('preview-lock').hidden = !isPreview;
  }

  function init() {
    ym('reachGoal', 'moneydiag_report_view');
    const data = S.loadReportData();
    if (!data || !data.transparencyIndex) {
      $('report-root').hidden = true;
      $('no-data').hidden = false;
      return;
    }
    render(data);
    applyMode(data);

    // Если не leadSent — горячий пиксель ещё не активирован (случай, если пользователь попал сюда как-то иначе)
    if (data.leadSent) ym('reachGoal', 'moneydiag_pixel_hot');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
