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
    const route = data.route;
    let title, sub;
    title = 'Разбор готов&nbsp;— что получилось по&nbsp;вашим ответам';
    sub = 'Три цифры о&nbsp;финансах вашего бизнеса: потенциал возврата прибыли, индекс прозрачности учёта и&nbsp;один конкретный следующий шаг.';
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

    // Narrative-flow без коробок: визуал + рассказ → сравнение → итог
    fixCard.innerHTML =
      '<div class="dg-fix-head">' +
        visualHtml +
        '<div class="dg-fix-head-text">' +
          '<h3 class="dg-fix-action"></h3>' +
          '<p class="dg-fix-lead"></p>' +
        '</div>' +
      '</div>' +
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
      '<div class="dg-fix-summary">' +
        '<span class="dg-fix-summary-icon">' +
          '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l4-4 4 4 6-6"/><path d="M11 6h6v6"/></svg>' +
        '</span>' +
        '<span class="dg-fix-summary-text"></span>' +
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
      'Проведём экспертный аудит ваших финансовых показателей',
      'Настроим отчёты, которые закроют 80% вопросов',
      'Научим оценивать состояние бизнеса за&nbsp;5&nbsp;минут'
    ];
    if (noFinance) {
      items.push('Подберём партнёра-финансиста из&nbsp;нашей сети&nbsp;— компания будет вести учёт под Финтабло');
    }

    return (
      '<div class="dg-final-eyebrow">Бесплатно · насмотренность 500+ бизнесов</div>' +
      '<h2>Прозрачная картина в&nbsp;финансах бизнеса&nbsp;— уже сегодня</h2>' +
      '<p>Бесплатная встреча с&nbsp;финансовым экспертом Финтабло. Без презентаций и&nbsp;общих фраз&nbsp;— сразу к&nbsp;вашим цифрам и&nbsp;тому, что с&nbsp;ними делать.</p>' +
      '<div class="dg-final-checklist">' + items.map(checkItem).join('') + '</div>' +
      buildLeadForm({
        title: 'Оставьте контакты&nbsp;— эксперт свяжется в&nbsp;течение рабочего дня',
        cityField: false,
        submitText: 'Записаться на встречу',
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
      '<div class="dg-final-eyebrow">Полный доступ — 7 дней в подарок</div>' +
      '<h2>Финтабло&nbsp;— на&nbsp;вырост</h2>' +
      '<p>На&nbsp;выручке 30&ndash;60&nbsp;млн&nbsp;₽ Финтабло уже может пригодиться, но&nbsp;раскрывается в&nbsp;полную силу с&nbsp;60+&nbsp;млн. Попробуйте сейчас бесплатно&nbsp;— увидите интеграции с&nbsp;банками и&nbsp;1С, отчёты под вашу отрасль, прогноз&nbsp;ДДС.</p>' +
      '<div class="dg-final-checklist">' + items.map(checkItem).join('') + '</div>' +
      '<button type="button" class="dg-final-cta" id="btn-warm-cta">Попробовать Финтабло →</button>' +
      '<div class="dg-final-meta">Регистрация по&nbsp;email&nbsp;· 7&nbsp;дней полного доступа</div>'
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
      '<h2>Финтабло сейчас вам не&nbsp;подходит&nbsp;— но&nbsp;шаблоны работают</h2>' +
      '<p>Финтабло сознательно специализирован под проектный бизнес и&nbsp;производство от&nbsp;60&nbsp;млн&nbsp;₽ годовой выручки. Под вашу отрасль и&nbsp;масштаб продукт пока не&nbsp;даёт нужного эффекта. Но&nbsp;на&nbsp;вашу боль (' + painLabel + ') у&nbsp;нас есть готовые рабочие инструменты&nbsp;— забирайте.</p>' +
      '<div class="dg-templates">' + cards + '</div>' +
      bonusBlock +
      '<div class="dg-final-meta">Финтабло раскрывается с&nbsp;выручки от&nbsp;60&nbsp;млн&nbsp;₽ — будем рады встретиться, когда выйдете на&nbsp;этот масштаб.</div>'
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
            '<input class="dg-form-input" id="lead-name" type="text" placeholder="Сергей" autocomplete="given-name" required>' +
          '</label>' +
          '<label class="dg-form-field">' +
            '<span class="dg-form-label">Телефон</span>' +
            '<input class="dg-form-input" id="lead-phone" type="tel" placeholder="+7 (___) ___-__-__" autocomplete="tel" required>' +
          '</label>' +
        '</div>' +
        '<div class="dg-form-row" style="grid-template-columns:1fr">' +
          '<label class="dg-form-field">' +
            '<span class="dg-form-label">Email</span>' +
            '<input class="dg-form-input" id="lead-email" type="email" placeholder="ivanov@company.ru" autocomplete="email" required>' +
          '</label>' +
        '</div>' +
        cityRow +
        '<div class="dg-form-error-text" id="lead-error"></div>' +
        '<label class="dg-form-consent">' +
          '<input type="checkbox" id="lead-consent" class="dg-form-checkbox" required>' +
          '<span class="dg-form-consent-text">' +
            'Согласен с&nbsp;<a href="https://fintablo.ru/position" target="_blank" rel="noopener">политикой обработки персональных данных</a> и&nbsp;<a href="https://fintablo.ru/oferta" target="_blank" rel="noopener">офертой</a> ООО&nbsp;«Нескучный финансовый софт».' +
          '</span>' +
        '</label>' +
        '<label class="dg-form-consent dg-form-consent-marketing">' +
          '<input type="checkbox" id="lead-marketing" class="dg-form-checkbox">' +
          '<span class="dg-form-consent-text">' +
            'Хочу получать материалы Финтабло на&nbsp;почту.' +
          '</span>' +
        '</label>' +
        '<button type="submit" class="dg-form-submit" id="lead-submit" data-goal="' + opts.ymGoal + '" disabled>' + opts.submitText + '</button>' +
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

  // PLG-gate: hot_icp / hot_icp_no_finance / warm_icp — закрываем Section 3+4
  // до контакта. anti_icp видит всё открыто (лид-магнит = шаблоны бесплатно).
  function setupPaywall() {
    const isAnti = data.route === 'anti_icp';
    const paywall = $('paywall');
    if (isAnti) {
      if (paywall) paywall.hidden = true;
      document.body.classList.add('is-unlocked');
      return;
    }
    document.body.classList.add('is-locked');
    if (!paywall) return;
    paywall.hidden = false;
    // Тексты paywall — по маршруту
    if (data.route === 'warm_icp') {
      $('paywall-title').innerHTML = 'Полный план&nbsp;+ доступ к&nbsp;Финтабло на&nbsp;7&nbsp;дней';
      $('paywall-sub').innerHTML = 'Откройте конкретный шаг под вашу боль и&nbsp;попробуйте Финтабло бесплатно.';
    } else {
      $('paywall-title').innerHTML = 'Полный план&nbsp;+ встреча с&nbsp;финансовым экспертом';
      $('paywall-sub').innerHTML = 'Откройте конкретный шаг под вашу боль и&nbsp;запишитесь на&nbsp;встречу — без презентаций и&nbsp;общих фраз.';
    }
    const cta = $('paywall-cta');
    if (cta) {
      cta.addEventListener('click', function () {
        // Разблокируем Section 3 (анимация blur→clear) и показываем Section 4
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-unlocked');
        fireGoal('dg_paywall_unlock', segmentParams());
        // Плавный скролл к форме (Section 4) — основная конверсионная точка
        setTimeout(function () {
          const final = $('section-final');
          if (final && final.scrollIntoView) {
            final.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const focusable = final.querySelector('input, button');
            if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 600);
          }
        }, 350);
      });
    }
  }

  renderHero();
  renderLoss();
  renderIndex();
  renderFix();
  renderFinal();
  setupPaywall();
})();
