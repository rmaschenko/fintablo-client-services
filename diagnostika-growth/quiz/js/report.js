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

  if (window.ym) ym(61131877, 'reachGoal', 'dg_report_view');

  function renderHero() {
    const route = data.route;
    let title, sub;
    if (route === 'icp') {
      title = 'Разбор готов&nbsp;— что получилось по&nbsp;вашим ответам';
      sub = 'Три цифры о&nbsp;финансах вашего бизнеса: потенциал возврата прибыли, индекс прозрачности учёта и&nbsp;один конкретный следующий шаг. Внизу&nbsp;— как разобрать это детально с&nbsp;финансовым экспертом.';
    } else {
      title = 'Разбор готов&nbsp;— что получилось по&nbsp;вашим ответам';
      sub = 'Три цифры о&nbsp;финансах вашего бизнеса: потенциал возврата прибыли, индекс прозрачности учёта и&nbsp;один конкретный следующий шаг. Внизу&nbsp;— как попробовать Финтабло, чтобы увидеть всё это в&nbsp;своём учёте.';
    }
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
    $('index-zone').textContent = t.zoneLabel;
    $('bench-you').style.left = t.score + '%';
    $('bench-peer').style.left = t.peerScore + '%';
    $('bench-top').style.left = t.topScore + '%';
    $('bench-you-val').textContent = t.score;
    $('bench-peer-val').textContent = t.peerScore;
    $('bench-top-val').textContent = t.topScore;
  }

  function renderFix() {
    const r = data.recommendation;
    const fixCard = document.querySelector('.dg-fix-card');
    if (!fixCard) return;

    // Narrative-flow без коробок: рассказ → переход к Финтабло → действие
    fixCard.innerHTML =
      '<h3 class="dg-fix-action"></h3>' +
      '<p class="dg-fix-lead"></p>' +
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

  function renderFinal() {
    const route = data.route;
    const final = $('section-final');
    if (route === 'icp') {
      final.innerHTML = renderIcpBlock();
      bindLeadForm('icp');
    } else {
      final.innerHTML = renderSelfServeBlock();
      bindSelfServe();
    }
  }

  // Единый блок для ICP-сегмента — копи проверенной акции Финтабло
  // (бесплатная встреча с финансовым экспертом, 500+ бизнесов опыта).
  // cfoStatus передаётся в amoCRM payload, чтобы менеджер видел контекст
  // (компания с финдиром или без).
  function renderIcpBlock() {
    return (
      '<div class="dg-final-eyebrow">Бесплатно · насмотренность 500+ бизнесов</div>' +
      '<h2>Прозрачная картина в&nbsp;финансах бизнеса&nbsp;— уже сегодня</h2>' +
      '<p>Бесплатная встреча с&nbsp;финансовым экспертом Финтабло. Без презентаций и&nbsp;общих фраз&nbsp;— сразу к&nbsp;вашим цифрам и&nbsp;тому, что с&nbsp;ними делать.</p>' +
      '<div class="dg-final-checklist">' +
        '<div class="dg-final-check-item"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg><span>Проведём экспертный аудит ваших финансовых показателей</span></div>' +
        '<div class="dg-final-check-item"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg><span>Настроим отчёты, которые закроют 80% вопросов</span></div>' +
        '<div class="dg-final-check-item"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg><span>Научим оценивать состояние бизнеса за&nbsp;5&nbsp;минут</span></div>' +
      '</div>' +
      buildLeadForm({
        title: 'Оставьте контакты&nbsp;— эксперт свяжется в&nbsp;течение рабочего дня',
        cityField: false,
        submitText: 'Записаться на встречу',
        ymGoal: 'dg_lead_icp'
      })
    );
  }

  function renderSelfServeBlock() {
    return (
      '<div class="dg-final-eyebrow">Полный доступ — 7 дней в подарок</div>' +
      '<h2>Попробуйте Финтабло сами&nbsp;— без оплаты и&nbsp;обязательств</h2>' +
      '<p>Финтабло раскрывается в&nbsp;полную силу у&nbsp;проектного бизнеса от&nbsp;60&nbsp;млн&nbsp;₽ годовой выручки с&nbsp;выделенным финансистом. Когда дорастёте&nbsp;— уже будете знать сервис изнутри.</p>' +
      '<div class="dg-final-checklist">' +
        '<div class="dg-final-check-item">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>' +
          '<span>Загрузите выписку из&nbsp;банка&nbsp;— увидите ДДС за&nbsp;5&nbsp;минут</span>' +
        '</div>' +
        '<div class="dg-final-check-item">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>' +
          '<span>Откройте готовый шаблон ОПиУ под вашу отрасль</span>' +
        '</div>' +
        '<div class="dg-final-check-item">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>' +
          '<span>Настройте контуры под направления и&nbsp;проекты</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="dg-final-cta" id="btn-self-serve">Открыть Финтабло →</button>' +
      '<div class="dg-final-meta">Регистрация по&nbsp;email · 7&nbsp;дней полного доступа · Без передачи данных</div>'
    );
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
            'Даю согласие ООО&nbsp;«Нескучный финансовый софт» (ИНН&nbsp;2311303019) на&nbsp;обработку персональных данных в&nbsp;целях обратной связи в&nbsp;соответствии с&nbsp;<a href="https://fintablo.ru/position" target="_blank" rel="noopener">Политикой обработки персональных данных</a> и&nbsp;<a href="https://fintablo.ru/oferta" target="_blank" rel="noopener">Офертой</a>.' +
          '</span>' +
        '</label>' +
        '<button type="submit" class="dg-form-submit" id="lead-submit" data-goal="' + opts.ymGoal + '" disabled>' + opts.submitText + '</button>' +
      '</form>'
    );
  }

  function bindLeadForm(routeTag) {
    const form = $('lead-form');
    if (!form) return;

    // Submit разблокируется только при отмеченном чекбоксе согласия (152-ФЗ)
    const consentEl = $('lead-consent');
    const submitEl = $('lead-submit');
    if (consentEl && submitEl) {
      consentEl.addEventListener('change', () => {
        submitEl.disabled = !consentEl.checked;
      });
    }

    // Маска телефона при вводе
    const phoneEl = $('lead-phone');
    if (phoneEl && window.Lead && window.Lead.maskPhone) {
      phoneEl.addEventListener('input', (e) => {
        e.target.value = window.Lead.maskPhone(e.target.value);
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

      if (!name || name.length < 2) return showError('Укажите имя');
      if (!phone || phone.replace(/\D/g, '').length < 10) return showError('Укажите корректный телефон');
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Укажите корректный email');
      if (!consent) return showError('Поставьте отметку о согласии на обработку персональных данных');
      errEl.classList.remove('is-visible');

      const submitBtn = $('lead-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем...';

      const payload = {
        source: 'diagnostika-growth',
        route: data.route,
        routeTag: routeTag,
        name: name, phone: phone, email: email, city: city,
        profile: data.profile,
        transparencyScore: data.transparency.score,
        lossRange: { min: data.lossRange.min, max: data.lossRange.max },
        recommendation: data.recommendation.title,
        utm: S.getUTM ? S.getUTM() : null,
        // 152-ФЗ — фиксируем явное согласие с timestamp для аудита
        consent: {
          given: true,
          timestamp: new Date().toISOString(),
          policyUrl: 'https://fintablo.ru/position',
          offerUrl: 'https://fintablo.ru/oferta',
          operator: 'ООО «Нескучный финансовый софт», ИНН 2311303019'
        }
      };

      const goal = submitBtn.getAttribute('data-goal');
      if (window.ym && goal) ym(61131877, 'reachGoal', goal);

      L.sendLead(payload, function () {
        if (window.ym) ym(61131877, 'reachGoal', 'dg_lead_sent');
        location.href = 'thankyou.html?route=' + encodeURIComponent(data.route);
      }, function () {
        submitBtn.disabled = false;
        submitBtn.textContent = goal === 'dg_lead_partner' ? 'Подобрать партнёра' : 'Записаться на разбор';
        showError('Не удалось отправить — попробуйте ещё раз или напишите на support@help.fintablo.ru');
      });
    });
  }

  function bindSelfServe() {
    const btn = $('btn-self-serve');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.ym) ym(61131877, 'reachGoal', 'dg_self_serve_click');
      const url = buildTrialUrl();
      setTimeout(function () { location.href = url; }, 80);
    });
  }

  function buildTrialUrl() {
    let base = 'https://app.fintablo.ru/register?utm_source=diagnostika&utm_medium=quiz&utm_campaign=anti_icp&utm_content=trial';
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
    } catch (e) {}
    return base;
  }

  renderHero();
  renderLoss();
  renderIndex();
  renderFix();
  renderFinal();
})();
