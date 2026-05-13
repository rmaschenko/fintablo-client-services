/* ═════ REPORT · diagnostika-growth ═════
   Рендер 3 секций разбора + финальная 3-маршрутная развилка
   (ICP+CFO → встреча, ICP без CFO → партнёр, не-ICP → триал). */
(function () {
  'use strict';

  const C = window.Calculator;
  const S = window.Storage;
  const L = window.Lead;
  const $ = (id) => document.getElementById(id);

  const data = S.loadReportData();
  if (!data || !data.profile) {
    location.href = 'index.html';
    return;
  }

  // Обёртка вокруг Я.Метрики 61131877 — централизует counter ID + проверку window.ym
  function fireGoal(name, params) {
    if (!window.ym) return;
    if (params) ym(61131877, 'reachGoal', name, params);
    else ym(61131877, 'reachGoal', name);
  }

  fireGoal('dg_report_view');

  function renderHero() {
    const profileLabel = (data.profile && data.profile.businessTypeLabel) || 'бизнеса';
    const lossLine = (data.lossRange && data.lossRange.min)
      ? C.formatRange(data.lossRange.min, data.lossRange.max) + ' упущенной прибыли в&nbsp;год'
      : '';
    const score = (data.transparency && data.transparency.score != null)
      ? data.transparency.score + '/100 прозрачность учёта'
      : '';
    const painLabel = (data.profile && data.profile.primaryPainLabel) || '';
    // Hero персонализированный: тип бизнеса + 3 ключевые цифры
    const title = 'Разбор готов&nbsp;— по&nbsp;вашим ответам про&nbsp;' + profileLabel;
    const bullets = [lossLine, score, painLabel && 'главная боль: ' + painLabel.toLowerCase()]
      .filter(Boolean).join('&nbsp;· ');
    const sub = bullets
      ? bullets + '. Один следующий шаг&nbsp;— ниже в&nbsp;разборе.'
      : 'Три цифры о&nbsp;финансах вашего бизнеса: упущенная прибыль, прозрачность учёта и&nbsp;один следующий шаг.';
    $('hero-title').innerHTML = title;
    $('hero-sub').innerHTML = sub;
  }

  function renderLoss() {
    const loss = data.lossRange;
    const revenue = (data.profile.annualRevenue || 60) * 1_000_000;
    $('loss-range').textContent = C.formatRange(loss.min, loss.max);
    const minPct = ((loss.min / revenue) * 100).toFixed(1).replace('.', ',');
    const maxPct = ((loss.max / revenue) * 100).toFixed(1).replace('.', ',');
    $('loss-pct').textContent = minPct + '–' + maxPct + '% годовой выручки';

    const sourcesEl = $('loss-sources');
    sourcesEl.innerHTML = '';
    loss.sources.forEach(src => {
      const card = document.createElement('div');
      card.className = 'dg-loss-src';
      card.innerHTML =
        '<div class="dg-loss-src-head">' +
          '<div class="dg-loss-src-name"></div>' +
          '<div class="dg-loss-src-range"></div>' +
        '</div>' +
        '<div class="dg-loss-src-source"></div>';
      card.querySelector('.dg-loss-src-name').textContent = src.name;
      card.querySelector('.dg-loss-src-range').textContent = C.formatRange(src.rangeMin, src.rangeMax);
      card.querySelector('.dg-loss-src-source').textContent = src.source;
      sourcesEl.appendChild(card);
    });
  }

  function renderIndex() {
    const t = data.transparency;
    $('index-score').textContent = t.score;
    $('index-zone').textContent = t.zoneHeadline;
    $('bench-you-val').textContent = t.score;
    $('bench-peer-val').textContent = t.peerScore;
    $('bench-top-val').textContent = t.topScore;

    // Понятные термины вместо «когорта» и «лидеры по учёту»
    if (t.peerLabel) $('bench-peer-label').textContent = t.peerLabel;
    if (t.peerSubLabel) $('bench-peer-sub').textContent = t.peerSubLabel;
    if (t.topLabel) $('bench-top-label').textContent = t.topLabel;
    if (t.topSubLabel) $('bench-top-sub').textContent = t.topSubLabel;

    // Интерпретация зоны на языке ценности (что упускаете на этом уровне)
    const meaningEl = document.getElementById('index-meaning');
    if (meaningEl && t.zoneGap) meaningEl.textContent = t.zoneGap;

    // Зональный pill — цвет по зоне
    const pill = document.getElementById('index-zone-pill');
    if (pill) {
      pill.classList.remove('is-low','is-mid','is-good','is-top');
      pill.classList.add('is-' + t.zone);
    }
    // Активная зона в zone-row
    document.querySelectorAll('.dg-zone').forEach(el => {
      el.classList.toggle('is-active', el.dataset.zone === t.zone);
    });

    // Premium gauge: SVG viewBox 540×320, центр (270,270), r=220.
    // Длина полудуги = π·220 ≈ 691. Угол: 0% → 180°, 100% → 0° (по часовой).
    const ARC_LEN = 691;
    const RADIUS = 220;
    const CX = 270, CY = 270;
    const fillEl = document.getElementById('gauge-fill');
    if (fillEl) {
      const fill = (t.score / 100) * ARC_LEN;
      // Inline style выигрывает над CSS rule. Стартуем с 0.01 (не 0 — иначе
      // браузер игнорирует pattern и рисует solid stroke), затем через RAF
      // переключаемся на target — CSS transition анимирует разницу.
      fillEl.style.strokeDasharray = '0.01 ' + ARC_LEN;
      requestAnimationFrame(function () {
        setTimeout(function () {
          fillEl.style.strokeDasharray = fill + ' ' + ARC_LEN;
        }, 80);
      });
    }

    function placeMarker(elId, percent) {
      const el = document.getElementById(elId);
      if (!el) return;
      const angleRad = Math.PI * (1 - percent / 100);
      const cx = CX + RADIUS * Math.cos(angleRad);
      const cy = CY - RADIUS * Math.sin(angleRad);
      el.setAttribute('cx', cx);
      el.setAttribute('cy', cy);
    }
    placeMarker('gauge-mark-peer', t.peerScore);
    placeMarker('gauge-mark-top', t.topScore);
  }

  // Тематические SVG-визуализации для каждой рекомендации
  function getVisualSvg(kind) {
    if (kind === 'margin') {
      // Bar-chart: разноцветные горизонтальные колонки = маржа по направлениям
      return (
        '<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="6" y="14" width="58" height="9" rx="2" fill="#16A34A"/>' +
          '<rect x="6" y="29" width="42" height="9" rx="2" fill="#D97706"/>' +
          '<rect x="6" y="44" width="68" height="9" rx="2" fill="#16A34A"/>' +
          '<rect x="6" y="59" width="22" height="9" rx="2" fill="#DC2626"/>' +
        '</svg>'
      );
    }
    if (kind === 'cash') {
      // Календарь с маркером кассового разрыва на 8-12 неделях
      return (
        '<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="8" y="14" width="64" height="56" rx="6" stroke="#1D4ED8" stroke-width="2.5" fill="#EFF6FF"/>' +
          '<line x1="8" y1="28" x2="72" y2="28" stroke="#1D4ED8" stroke-width="2.5"/>' +
          '<line x1="22" y1="10" x2="22" y2="20" stroke="#1D4ED8" stroke-width="2.5" stroke-linecap="round"/>' +
          '<line x1="58" y1="10" x2="58" y2="20" stroke="#1D4ED8" stroke-width="2.5" stroke-linecap="round"/>' +
          '<circle cx="22" cy="42" r="3" fill="#1D4ED8"/>' +
          '<circle cx="40" cy="42" r="3" fill="#1D4ED8"/>' +
          '<circle cx="58" cy="42" r="3" fill="#DC2626" stroke="#fff" stroke-width="2"/>' +
          '<circle cx="22" cy="56" r="3" fill="#1D4ED8"/>' +
          '<circle cx="40" cy="56" r="3" fill="#1D4ED8"/>' +
          '<circle cx="58" cy="56" r="3" fill="#1D4ED8"/>' +
        '</svg>'
      );
    }
    if (kind === 'time') {
      // Часы с большой стрелкой и галочкой = ускорение (5 дней → 2 часа)
      return (
        '<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<circle cx="40" cy="40" r="28" stroke="#1D4ED8" stroke-width="2.5" fill="#EFF6FF"/>' +
          '<line x1="40" y1="40" x2="40" y2="22" stroke="#1D4ED8" stroke-width="3" stroke-linecap="round"/>' +
          '<line x1="40" y1="40" x2="54" y2="40" stroke="#1D4ED8" stroke-width="3" stroke-linecap="round"/>' +
          '<circle cx="40" cy="40" r="2.5" fill="#1D4ED8"/>' +
          '<path d="M58 60l4 4 8-9" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '</svg>'
      );
    }
    if (kind === 'pillars') {
      // 3 колонки: ДДС / ОПиУ / Баланс — три опоры решений
      return (
        '<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<rect x="10" y="44" width="14" height="24" rx="2" fill="#1D4ED8"/>' +
          '<rect x="33" y="32" width="14" height="36" rx="2" fill="#1D4ED8"/>' +
          '<rect x="56" y="20" width="14" height="48" rx="2" fill="#1D4ED8"/>' +
          '<text x="17" y="78" font-family="Inter,sans-serif" font-size="6" font-weight="700" fill="#1D4ED8" text-anchor="middle">ДДС</text>' +
          '<text x="40" y="78" font-family="Inter,sans-serif" font-size="6" font-weight="700" fill="#1D4ED8" text-anchor="middle">ОПиУ</text>' +
          '<text x="63" y="78" font-family="Inter,sans-serif" font-size="6" font-weight="700" fill="#1D4ED8" text-anchor="middle">Баланс</text>' +
        '</svg>'
      );
    }
    return '';
  }

  function renderFix() {
    const r = data.recommendation;
    const fixCard = document.querySelector('.dg-fix-card');
    if (!fixCard) return;

    const visualHtml = r.visual ? '<div class="dg-fix-visual">' + getVisualSvg(r.visual) + '</div>' : '';

    // Декомпозиция боли — где это проявляется в бизнесе (3-4 пункта)
    let decompositionHtml = '';
    if (Array.isArray(r.decomposition) && r.decomposition.length) {
      const items = r.decomposition.map(function (s) {
        return '<li class="dg-fix-decomp-item">' + s + '</li>';
      }).join('');
      decompositionHtml =
        '<div class="dg-fix-decomposition">' +
          '<div class="dg-fix-decomp-label">Где эта боль проявляется в&nbsp;вашем бизнесе</div>' +
          '<ul class="dg-fix-decomp-list">' + items + '</ul>' +
        '</div>';
    }

    // Roadmap — что меняется через 3 / 12 месяцев
    let roadmapHtml = '';
    if (r.roadmap && (r.roadmap.in_3m || r.roadmap.in_12m)) {
      roadmapHtml =
        '<div class="dg-fix-roadmap">' +
          '<div class="dg-fix-roadmap-label">Что изменится</div>' +
          '<div class="dg-fix-roadmap-grid">' +
            (r.roadmap.in_3m
              ? '<div class="dg-fix-roadmap-step"><div class="dg-fix-roadmap-when">через&nbsp;3 месяца</div><div class="dg-fix-roadmap-text">' + r.roadmap.in_3m + '</div></div>'
              : '') +
            (r.roadmap.in_12m
              ? '<div class="dg-fix-roadmap-step"><div class="dg-fix-roadmap-when">через&nbsp;12 месяцев</div><div class="dg-fix-roadmap-text">' + r.roadmap.in_12m + '</div></div>'
              : '') +
          '</div>' +
        '</div>';
    }

    // Narrative-flow: визуал + рассказ → декомпозиция → сравнение → roadmap → итог
    // Часть после декомпозиции — внутри .dg-fix-locked-block для PLG-gate (частичный blur)
    fixCard.innerHTML =
      '<div class="dg-fix-head">' +
        visualHtml +
        '<div class="dg-fix-head-text">' +
          '<h3 class="dg-fix-action"></h3>' +
          '<p class="dg-fix-lead"></p>' +
        '</div>' +
      '</div>' +
      decompositionHtml +
      '<div class="dg-fix-locked-block">' +
        '<div class="dg-fix-compare">' +
          '<div class="dg-fix-line dg-fix-line-manual">' +
            '<span class="dg-fix-line-label">В&nbsp;Excel и&nbsp;таблицах</span>' +
            '<span class="dg-fix-line-text"></span>' +
          '</div>' +
          '<div class="dg-fix-line dg-fix-line-fintablo">' +
            '<span class="dg-fix-line-label">В&nbsp;Финтабло</span>' +
            '<span class="dg-fix-line-text"></span>' +
          '</div>' +
        '</div>' +
        roadmapHtml +
        '<div class="dg-fix-summary">' +
          '<span class="dg-fix-summary-icon">' +
            '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l4-4 4 4 6-6"/><path d="M11 6h6v6"/></svg>' +
          '</span>' +
          '<span class="dg-fix-summary-text"></span>' +
        '</div>' +
      '</div>' +
      '';

    fixCard.querySelector('.dg-fix-action').textContent = r.title;
    fixCard.querySelector('.dg-fix-lead').textContent = r.body;
    if (r.whyHard) fixCard.querySelector('.dg-fix-line-manual .dg-fix-line-text').textContent = r.whyHard;
    if (r.howFintablo) fixCard.querySelector('.dg-fix-line-fintablo .dg-fix-line-text').textContent = r.howFintablo;
    if (r.proofPoint) fixCard.querySelector('.dg-fix-summary-text').textContent = r.proofPoint;
  }

  // ── Сегментные параметры для Я.Метрики (look-alike, exclusion, ретаргет) ──
  function segmentParams() {
    return {
      business_type: data.profile.businessType || '',
      revenue: data.profile.annualRevenue || 0,
      pain: data.profile.primaryPain || '',
      cfo_status: data.profile.cfoStatus || '',
      anti_subtype: data.antiSubtype || ''
    };
  }

  function fireSegmentGoal(goalName) {
    fireGoal(goalName, segmentParams());
  }

  // SVG-чекмарк для пунктов чек-листа
  const CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>';
  function checkItem(text) {
    return '<div class="dg-final-check-item">' + CHECK_SVG + '<span>' + text + '</span></div>';
  }

  function renderFinal() {
    const route = data.route;
    const final = $('section-final');
    if (route === 'hot_icp' || route === 'hot_icp_no_finance') {
      final.innerHTML = renderHotIcpBlock(route === 'hot_icp_no_finance');
      fireSegmentGoal('dg_hot_icp_segment');
      bindLeadForm();
    } else if (route === 'warm_icp') {
      final.innerHTML = renderWarmIcpBlock();
      fireSegmentGoal('dg_warm_icp_segment');
      bindWarmIcp();
    } else {
      // anti_icp — все 3 подтипа (trade / services / small)
      final.innerHTML = renderAntiIcpBlock();
      fireSegmentGoal('dg_anti_icp_segment');
      bindAntiIcp();
    }
  }

  // Hot ICP: проектный/производство 60+ млн. Бесплатная встреча с финансовым
  // экспертом — копи проверенной акции Финтабло, насмотренность 500+ бизнесов.
  // noFinance=true → дополнительно «Подберём партнёра-финансиста» на встрече.
  function renderHotIcpBlock(noFinance) {
    const items = [
      'Разберём ваш расчёт упущенной прибыли&nbsp;— где она реально утекает',
      'Настроим отчёты под вашу отрасль&nbsp;— 80% управленческих вопросов закрыты',
      'Покажем, как оценивать состояние бизнеса за&nbsp;5&nbsp;минут утром'
    ];
    if (noFinance) {
      items.push('Подберём финансиста из&nbsp;500+ партнёров&nbsp;— он&nbsp;ведёт ваш учёт под Финтабло');
    }

    return (
      '<div class="dg-final-eyebrow">Бесплатно · 500+ внедрений за&nbsp;плечами</div>' +
      '<h2>Бесплатная встреча с&nbsp;финансовым экспертом Финтабло</h2>' +
      '<p>30 минут разговора с&nbsp;экспертом, у&nbsp;которого 500+ внедрений. Открываем вашу таблицу, разбираем три цифры из&nbsp;отчёта и&nbsp;формулируем 2–3 шага под вашу боль.</p>' +
      '<div class="dg-final-checklist">' + items.map(checkItem).join('') + '</div>' +
      '<div class="dg-final-trust-bar">' +
        '<div class="dg-final-trust-item"><span class="dg-final-trust-num mono">2&nbsp;300+</span><span>компаний работают в&nbsp;Финтабло</span></div>' +
        '<div class="dg-final-trust-item"><span class="dg-final-trust-num mono">500+</span><span>внедрений финансовых экспертов</span></div>' +
        '<div class="dg-final-trust-item"><span class="dg-final-trust-num mono">30&nbsp;мин</span><span>встреча по&nbsp;вашему календарю</span></div>' +
      '</div>' +
      buildLeadForm({
        title: 'Заполните контакт &mdash; раскроем полный план под боль и&nbsp;пригласим на&nbsp;встречу',
        cityField: false,
        submitText: 'Записаться на встречу с экспертом',
        ymGoal: noFinance ? 'dg_lead_hot_icp_no_finance' : 'dg_lead_hot_icp'
      })
    );
  }

  // Warm ICP: проектный/производство 30-60 млн. Не зовём на встречу
  // (рано), отправляем в продуктовую воронку Финтабло — пусть пробуют сами.
  function renderWarmIcpBlock() {
    const items = [
      'Загрузите выписку из&nbsp;банка&nbsp;— увидите ДДС за&nbsp;5&nbsp;минут',
      'Откройте готовый шаблон ОПиУ под вашу отрасль',
      'Настройте контуры под направления и&nbsp;проекты'
    ];
    return (
      '<div class="dg-final-eyebrow">7 дней полного доступа · без оплаты, без карты</div>' +
      '<h2>Финтабло раскрывается на&nbsp;60+&nbsp;млн&nbsp;— попробуйте сейчас на&nbsp;вырост</h2>' +
      '<p>На&nbsp;вашей выручке 30–60&nbsp;млн&nbsp;₽ Финтабло уже работает. В&nbsp;полную силу раскрывается с&nbsp;60+&nbsp;млн&nbsp;— но&nbsp;настроить базу можно сейчас, чтобы быть готовым к&nbsp;росту.</p>' +
      '<div class="dg-final-checklist">' + items.map(checkItem).join('') + '</div>' +
      '<button type="button" class="dg-final-cta" id="btn-warm-cta">Открыть демо-доступ на 7 дней →</button>' +
      '<div class="dg-final-meta">Регистрация по&nbsp;email&nbsp;· 7&nbsp;дней полного доступа · без оплаты</div>'
    );
  }

  // Anti-ICP: торговля со складом / сервис на потоке / выручка <30 млн.
  // Без формы и без email-gate — отдаём 3 шаблона прямо ссылками.
  // Тон «осознанной специализации»: не оправдываемся, говорим прямо что
  // Финтабло специализирован, но даём ценность в виде шаблонов.
  function renderAntiIcpBlock() {
    const T = window.Templates;
    const pain = data.profile.primaryPain;
    const businessType = data.profile.businessType;
    const subtype = data.antiSubtype;
    const list = T.getForPain(pain, businessType);
    const bonus = T.getBonus(subtype);
    const painLabel = (C.PAIN_LABEL[pain] || '').toLowerCase();

    let cards = '';
    list.forEach(function (t, i) {
      cards +=
        '<a class="dg-template-card" href="' + t.url + '" target="_blank" rel="noopener" data-tpl-id="' + t.id + '">' +
          '<div class="dg-template-step">' + T.STEP_LABELS[i] + '</div>' +
          '<div class="dg-template-name">' + t.name + '</div>' +
          '<div class="dg-template-desc">' + t.desc + '</div>' +
          '<div class="dg-template-action">Скачать xlsx&nbsp;→</div>' +
        '</a>';
    });

    let bonusBlock = '';
    if (bonus) {
      bonusBlock =
        '<div class="dg-template-bonus-wrap">' +
          '<div class="dg-template-bonus-label">Бонус под ваш тип бизнеса</div>' +
          '<a class="dg-template-card dg-template-card-bonus" href="' + bonus.url + '" target="_blank" rel="noopener" data-tpl-id="' + bonus.id + '">' +
            '<div class="dg-template-name">' + bonus.name + '</div>' +
            '<div class="dg-template-desc">' + bonus.desc + '</div>' +
            '<div class="dg-template-action">Скачать xlsx&nbsp;→</div>' +
          '</a>' +
        '</div>';
    }

    return (
      '<div class="dg-final-eyebrow">3 шаблона под вашу боль</div>' +
      '<h2>Под вашу боль&nbsp;— 3 готовых Excel-шаблона</h2>' +
      '<p>На&nbsp;вашу главную боль (' + painLabel + ') у&nbsp;нас есть готовые рабочие инструменты&nbsp;— тот&nbsp;же стек, по&nbsp;которому работают компании в&nbsp;Финтабло. Забирайте, пользуйтесь.</p>' +
      '<div class="dg-templates">' + cards + '</div>' +
      bonusBlock +
      '<div class="dg-final-meta">Если шаблоны помогут&nbsp;— расскажите. Когда выйдете на&nbsp;60+ млн&nbsp;₽ выручки, попробуем дать больше.</div>'
    );
  }

  function bindAntiIcp() {
    document.querySelectorAll('.dg-template-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const tplId = card.getAttribute('data-tpl-id');
        fireGoal('dg_anti_icp_download', { template: tplId });
      });
    });
  }

  function bindWarmIcp() {
    const btn = $('btn-warm-cta');
    if (!btn) return;
    btn.addEventListener('click', function () {
      fireGoal('dg_warm_icp_click', segmentParams());
      const url = buildWarmTrialUrl();
      setTimeout(function () { location.href = url; }, 80);
    });
  }

  function buildWarmTrialUrl() {
    let base = 'https://app.fintablo.ru/register?utm_source=diagnostika&utm_medium=quiz&utm_campaign=warm_partial_fit&utm_content=trial';
    try {
      const utmRaw = localStorage.getItem('ft_utm');
      if (utmRaw) {
        const utm = JSON.parse(utmRaw);
        Object.keys(utm).forEach(function (k) {
          if (k.charAt(0) === '_') return;
          base += '&dg_' + encodeURIComponent(k) + '=' + encodeURIComponent(utm[k]);
        });
      }
      base += '&dg_business_type=' + encodeURIComponent(data.profile.businessType || '');
      base += '&dg_revenue=' + encodeURIComponent(data.profile.annualRevenue || '');
      base += '&dg_pain=' + encodeURIComponent(data.profile.primaryPain || '');
    } catch (e) {}
    return base;
  }

  function buildLeadForm(opts) {
    const cityRow = opts.cityField
      ? '<div class="dg-form-row" style="grid-template-columns:1fr"><input class="dg-form-input" id="lead-city" type="text" placeholder="Город" autocomplete="address-level2"></div>'
      : '';
    return (
      '<form class="dg-form" id="lead-form" novalidate>' +
        '<div class="dg-form-title">' + opts.title + '</div>' +
        '<div class="dg-form-row">' +
          '<label class="dg-form-field">' +
            '<span class="dg-form-label">Имя</span>' +
            '<input class="dg-form-input" id="lead-name" type="text" placeholder="Как к&nbsp;вам обращаться" autocomplete="given-name" required>' +
          '</label>' +
          '<label class="dg-form-field">' +
            '<span class="dg-form-label">Телефон</span>' +
            '<input class="dg-form-input" id="lead-phone" type="tel" placeholder="+7 (___) ___-__-__" autocomplete="tel" required>' +
          '</label>' +
        '</div>' +
        '<div class="dg-form-row" style="grid-template-columns:1fr">' +
          '<label class="dg-form-field">' +
            '<span class="dg-form-label">Email</span>' +
            '<input class="dg-form-input" id="lead-email" type="email" placeholder="email@company.ru" autocomplete="email" required>' +
          '</label>' +
        '</div>' +
        cityRow +
        '<div class="dg-form-error-text" id="lead-error"></div>' +
        // Тексты согласий — ДОСЛОВНО с fintablo.ru (юридически выверенные формулировки)
        '<label class="dg-form-consent">' +
          '<input type="checkbox" id="lead-consent" class="dg-form-checkbox" required>' +
          '<span class="dg-form-consent-text">' +
            'С&nbsp;<a href="https://fintablo.ru/position" target="_blank" rel="noopener">политикой обработки персональных данных</a> ознакомлен и&nbsp;согласен.' +
          '</span>' +
        '</label>' +
        '<label class="dg-form-consent dg-form-consent-marketing">' +
          '<input type="checkbox" id="lead-marketing" class="dg-form-checkbox">' +
          '<span class="dg-form-consent-text">' +
            'Согласен на&nbsp;получение информационных и&nbsp;рекламных материалов в&nbsp;соответствии с&nbsp;<a href="https://fintablo.ru/agreement_ads" target="_blank" rel="noopener">условиями</a>.' +
          '</span>' +
        '</label>' +
        '<button type="submit" class="dg-form-submit" id="lead-submit" data-goal="' + opts.ymGoal + '" disabled>' + opts.submitText + '</button>' +
        '<div class="dg-form-submit-note">' +
          'Нажимая на&nbsp;кнопку «' + opts.submitText + '», вы&nbsp;соглашаетесь с&nbsp;<a href="https://fintablo.ru/oferta" target="_blank" rel="noopener">офертой</a> и&nbsp;<a href="https://fintablo.ru/position" target="_blank" rel="noopener">положением об&nbsp;обработке персональных данных</a>.' +
        '</div>' +
      '</form>'
    );
  }

  function bindLeadForm() {
    const form = $('lead-form');
    if (!form) return;

    const consentEl = $('lead-consent');
    const submitEl = $('lead-submit');
    if (consentEl && submitEl) {
      consentEl.addEventListener('change', () => {
        submitEl.disabled = !consentEl.checked;
      });
    }

    const phoneEl = $('lead-phone');
    if (phoneEl && L && L.maskPhone) {
      phoneEl.addEventListener('input', (e) => {
        e.target.value = L.maskPhone(e.target.value);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('lead-name').value.trim();
      const phone = $('lead-phone').value.trim();
      const email = $('lead-email').value.trim();
      const city = $('lead-city') ? $('lead-city').value.trim() : '';
      const consent = consentEl && consentEl.checked;
      const errEl = $('lead-error');

      function showError(msg) {
        errEl.textContent = msg;
        errEl.classList.add('is-visible');
      }

      const phoneCheck = L.validatePhone(phone);
      const emailCheck = L.validateEmail(email);
      if (!name || name.length < 2) return showError('Укажите имя');
      if (!phoneCheck.ok) return showError(phoneCheck.msg);
      if (!emailCheck.ok) return showError(emailCheck.msg);
      if (!consent) return showError('Поставьте отметку о согласии на обработку персональных данных');
      errEl.classList.remove('is-visible');

      const submitBtn = $('lead-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем...';

      const payload = {
        source: 'diagnostika-growth',
        route: data.route,
        name: name, phone: phone, email: email, city: city,
        profile: data.profile,
        transparencyScore: data.transparency.score,
        lossRange: { min: data.lossRange.min, max: data.lossRange.max },
        recommendation: data.recommendation.title,
        utm: S.getUTM ? S.getUTM() : null,
        // 152-ФЗ: явное согласие с timestamp для аудита
        consent: {
          given: true,
          timestamp: new Date().toISOString(),
          policyUrl: 'https://fintablo.ru/position',
          offerUrl: 'https://fintablo.ru/oferta',
          operator: 'ООО «Нескучный финансовый софт», ИНН 2311303019'
        },
        marketingConsent: !!($('lead-marketing') && $('lead-marketing').checked)
      };

      const goal = submitBtn.getAttribute('data-goal');
      if (goal) fireGoal(goal);

      L.sendLead(payload, function () {
        fireGoal('dg_lead_sent', segmentParams());
        location.href = 'thankyou.html?route=' + encodeURIComponent(data.route);
      }, function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Записаться на встречу';
        showError('Не удалось отправить — попробуйте ещё раз или напишите на support@help.fintablo.ru');
      });
    });
  }

  // PLG-gate v2 (частичный blur, без лишнего клика):
  //   • hot_icp / hot_icp_no_finance / warm_icp → ставим body.is-locked.
  //     CSS делает blur только на .dg-fix-locked-block (compare/roadmap/summary).
  //     title + body + decomposition Section 3 — открыты (даём контекст и aha).
  //     Section 4 (форма) показывается всегда — без лишней кнопки-промежутка.
  //   • anti_icp → is-unlocked, всё открыто (бесплатный лид-магнит шаблонов).
  // После сабмита формы → renderFinal() / bindLeadForm() переключают
  // body на is-unlocked при успешном лиде (см. ниже).
  function setupPaywall() {
    const isAnti = data.route === 'anti_icp';
    if (isAnti) {
      document.body.classList.add('is-unlocked');
      return;
    }
    document.body.classList.add('is-locked');
  }

  renderHero();
  renderLoss();
  renderIndex();
  renderFix();
  renderFinal();
  setupPaywall();
})();
