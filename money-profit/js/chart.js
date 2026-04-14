/* ═════ CHART · рендер визуализации 3-х блоков ═════ */
(function(global){
  'use strict';
  var MP = global.MoneyProfit = global.MoneyProfit || {};
  var c = MP.calc;

  function pct(val, max){ return Math.max(3, Math.round((val / Math.max(max, 1)) * 100)); }

  function render(container, model, industry){
    if (!model.filled) return;
    var fmt = c.formatRub;
    var max = Math.max(model.balance, Math.abs(model.realProfit), Math.abs(model.gap), 1);

    var profitSignCls = model.profitSign;   // pos | neg
    var gapCls = model.gapLevel;            // ok | warn | danger
    var gapPrefix = model.gap > 0 ? '+' : model.gap < 0 ? '−' : '';
    var profitPrefix = model.realProfit >= 0 ? '' : '−';

    var industryText = c.industryContext(industry || 'other', model);

    var html =
      '<div class="viz-head">Ваша финансовая картина за месяц</div>' +

      '<div class="viz-block cash">' +
        '<div class="viz-block-label">💵 Деньги на счёте</div>' +
        '<div class="viz-block-value">' + fmt(model.balance) + '<span class="rub"> ₽</span></div>' +
        '<div class="viz-block-bar"><div class="viz-block-fill" style="width:' + pct(model.balance, max) + '%"></div></div>' +
      '</div>' +

      '<div class="viz-block profit ' + profitSignCls + '">' +
        '<div class="viz-block-label">📊 Реальная прибыль (начислит.)</div>' +
        '<div class="viz-block-value">' + profitPrefix + fmt(Math.abs(model.realProfit)) + '<span class="rub"> ₽</span></div>' +
        '<div class="viz-block-bar"><div class="viz-block-fill" style="width:' + pct(Math.abs(model.realProfit), max) + '%"></div></div>' +
      '</div>' +

      '<div class="viz-block gap ' + gapCls + '">' +
        '<div class="viz-block-label">⚡ Разрыв «деньги vs прибыль»</div>' +
        '<div class="viz-block-value">' + gapPrefix + fmt(Math.abs(model.gap)) + '<span class="rub"> ₽</span></div>' +
        '<div class="viz-block-bar"><div class="viz-block-fill" style="width:' + pct(Math.abs(model.gap), max) + '%"></div></div>' +
      '</div>' +

      '<div class="viz-interp">' + c.interpretation(model) + '</div>' +

      (industryText ? '<div class="viz-plg"><b>Ваш тип бизнеса:</b> ' + industryText + '</div>' : '') +

      '<div class="viz-plg"><b>Финтабло</b> показывает это разделение автоматически — по каждому проекту и каждой транзакции. Сейчас вы видите общую картину по компании. В системе — в каком именно проекте «заморожены» деньги и когда это изменится.</div>';

    container.innerHTML = html;
  }

  MP.chart = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
