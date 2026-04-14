/* ═════ МОДЕЛЬ РАСЧЁТА РАЗРЫВА (первый слой) ═════
   Наивная прибыль = Выручка − Расходы (как собственник считает "в голове")
   Разрыв = Наивная прибыль − Остаток на счёте
   Положительный разрыв → "прибыль" есть на бумаге, но её нет в кассе. */
(function(global){
  'use strict';

  var MoneyProfit = global.MoneyProfit = global.MoneyProfit || {};

  var nfMoney = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function formatRub(n){
    if (!isFinite(n) || n === 0) return '0';
    return nfMoney.format(Math.round(n));
  }

  function formatShort(n){
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n/1e9).toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' млрд';
    if (abs >= 1e6) return (n/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' млн';
    if (abs >= 1e3) return (n/1e3).toLocaleString('ru-RU',{maximumFractionDigits:0}) + ' тыс';
    return formatRub(n);
  }

  function parseRub(str){
    if (typeof str !== 'string') str = String(str || '');
    var cleaned = str.replace(/[^\d,.\-]/g, '').replace(',', '.');
    var n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  }

  function calcGap(inputs){
    var cash = Math.max(0, Number(inputs.cash) || 0);
    var revenue = Math.max(0, Number(inputs.revenue) || 0);
    var expenses = Math.max(0, Number(inputs.expenses) || 0);

    var naiveProfit = revenue - expenses;
    var gap = naiveProfit - cash;
    var margin = revenue > 0 ? (naiveProfit / revenue) : 0;
    var ratio = cash > 0 ? (naiveProfit / cash) : (naiveProfit > 0 ? Infinity : 0);

    var level, message;

    if (revenue === 0 || expenses === 0) {
      level = 'empty';
      message = 'Заполните все три поля, чтобы увидеть разрыв.';
    } else if (naiveProfit <= 0) {
      level = 'ok';
      message = '<b>Вы работаете в убыток или в ноль</b> по наивному расчёту. Разрыв здесь — не главная проблема: сначала нужно разобраться со структурой расходов. Это как раз то, что показывает ОПиУ в Финтабло.';
    } else if (gap <= 0) {
      level = 'ok';
      message = '<b>Денег на счёте больше, чем наивной прибыли.</b> Хороший признак — бизнес генерирует кэш здесь и сейчас. Но скрытые проблемы могут быть в отдельных проектах — Финтабло покажет картину по каждому.';
    } else if (ratio < 1.5) {
      level = 'warn';
      message = '<b>Небольшой разрыв.</b> Часть прибыли застряла — возможно, в дебиторке или авансах поставщикам. Причину стоит найти, пока она не выросла.';
    } else if (ratio < 3) {
      level = 'warn';
      message = '<b>Существенный разрыв.</b> Прибыль «на бумаге» есть, но деньги её не догоняют. Скорее всего, причина в одном-двух проектах или клиентах — именно они съедают оборотку.';
    } else {
      level = 'danger';
      message = '<b>Критический разрыв.</b> Наивная прибыль в ' + ratio.toFixed(1).replace('.', ',') + '× больше реальных денег. Это классический симптом «деньги есть — прибыли нет»: бизнес кажется прибыльным, но оборотные средства заморожены.';
    }

    return {
      cash: cash, revenue: revenue, expenses: expenses,
      naiveProfit: naiveProfit, gap: gap, margin: margin, ratio: ratio,
      level: level, message: message
    };
  }

  MoneyProfit.calc = {
    calcGap: calcGap,
    formatRub: formatRub,
    formatShort: formatShort,
    parseRub: parseRub
  };

})(typeof window !== 'undefined' ? window : globalThis);
