/* ═════ CALCULATOR · 14 метрик диагностики ═════ */
(function (global) {
  'use strict';

  // Дискретные зоны оборота (индекс слайдера 0–7 → млн ₽/мес)
  const REVENUE_ZONES = [500000, 1000000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000];

  // Коэффициенты риска потерь годовой выручки по системе учёта
  const RISK_COEFF = { none: 0.20, excel: 0.13, '1c': 0.10, other: 0.08, service: 0.04 };

  // Доля проектов в зоне риска
  const RISK_PROJECT_SHARE = { none: 0.50, excel: 0.30, '1c': 0.25, other: 0.20, service: 0.10 };

  // Базовый балл прозрачности по системе
  const SYSTEM_SCORE = { none: 0, excel: 25, '1c': 35, other: 45, service: 70 };

  // Главная зона риска по отрасли
  const RISK_ZONE_BY_INDUSTRY = {
    construction: 'Субподряд без детализации по объектам',
    it: 'Кассовый разрыв между этапными платежами',
    agency: 'Маржа «стекает» в командировки и лицензии ПО',
    production: 'Распределение ФОТ и материалов по проектам',
    other: 'Отсутствие P&L в моменте по каждому проекту'
  };

  // Индекс слайдера → рублей в месяц
  function revenueFromSliderIndex(idx) {
    const i = Math.max(0, Math.min(7, Number(idx) || 0));
    return REVENUE_ZONES[i];
  }

  // Индекс → человеко-читаемая подпись
  function revenueLabel(idx) {
    const v = revenueFromSliderIndex(idx);
    if (v >= 1_000_000) return (v / 1_000_000).toString().replace('.', ',') + ' млн ₽/мес';
    return (v / 1000) + ' тыс ₽/мес';
  }

  // Макс коэффициент из выбранных систем (консервативно = наихудший)
  function maxCoeff(systems, table) {
    if (!systems || !systems.length) return 0;
    return Math.max.apply(null, systems.map(s => table[s] || 0));
  }

  function computeAll(inputs) {
    const role = inputs.role || 'owner';
    const industry = inputs.industry || 'other';
    const monthlyRevenue = inputs.monthlyRevenue || 0;
    const annualRevenue = monthlyRevenue * 12;
    const activeProjects = inputs.activeProjects || 0;
    const accountingSystem = inputs.accountingSystem && inputs.accountingSystem.length
      ? inputs.accountingSystem
      : ['none']; // если ещё не отвечал (на шаге 65) — считаем консервативно
    const mainProblems = inputs.mainProblems || [];
    const hasFinancist = inputs.hasFinancist || (role === 'owner' ? 'no' : 'yes_staff');

    const riskCoeff = maxCoeff(accountingSystem, RISK_COEFF);
    const estimatedAnnualLoss = Math.round(annualRevenue * riskCoeff);
    const estimatedMonthlyLoss = Math.round(estimatedAnnualLoss / 12);

    const riskShare = maxCoeff(accountingSystem, RISK_PROJECT_SHARE);
    const riskProjectsCount = Math.round(activeProjects * riskShare);

    // Индекс прозрачности 0–100
    const baseScore = Math.max.apply(null, accountingSystem.map(s => SYSTEM_SCORE[s] || 0));
    const scaleBonus = monthlyRevenue >= 10_000_000 ? -10 : 5;
    const problemPenalty = mainProblems.length * 5;
    const transparencyIndex = Math.max(5, Math.min(95, baseScore + scaleBonus - problemPenalty));

    const profileType = classifyProfile({
      revenue: monthlyRevenue,
      sys: accountingSystem,
      proj: activeProjects,
      problems: mainProblems
    });

    const primaryRiskZone = RISK_ZONE_BY_INDUSTRY[industry] || RISK_ZONE_BY_INDUSTRY.other;

    const icpScore = calculateICPScore({
      revenue: monthlyRevenue,
      industry,
      hasFinancist,
      projects: activeProjects,
      role
    });

    const icpTag = icpScore >= 61 ? 'lead_A' : icpScore >= 31 ? 'lead_B' : 'lead_C';

    return {
      role,
      industry,
      monthlyRevenue,
      annualRevenue,
      activeProjects,
      accountingSystem,
      mainProblems,
      hasFinancist,
      riskCoeff,
      estimatedAnnualLoss,
      estimatedMonthlyLoss,
      riskProjectsCount,
      transparencyIndex,
      profileType,
      primaryRiskZone,
      icpScore,
      icpTag
    };
  }

  function classifyProfile(p) {
    const rev = p.revenue, sys = p.sys, proj = p.proj, problems = p.problems;

    if (sys.indexOf('none') !== -1 || (sys.indexOf('excel') !== -1 && proj >= 8)) {
      return 'blind'; // «Управление вслепую»
    }
    if (rev >= 10_000_000 && proj >= 10 && sys.indexOf('service') === -1) {
      return 'scale_without_control'; // «Масштаб без управления» — приоритет A
    }
    if (sys.indexOf('1c') !== -1 && problems.indexOf('margin') !== -1) {
      return 'accounting_illusion'; // «Бухгалтерская иллюзия»
    }
    if (sys.indexOf('excel') !== -1 && proj <= 5 && rev < 5_000_000) {
      return 'early_stage'; // «Ранняя стадия»
    }
    if (sys.indexOf('service') !== -1 && problems.length <= 1) {
      return 'almost_there'; // «В шаге от системы»
    }
    return 'plateau'; // «Наступившее плато»
  }

  function calculateICPScore(p) {
    let score = 0;

    // Оборот — основной сигнал ICP
    if (p.revenue >= 50_000_000) score += 40;
    else if (p.revenue >= 10_000_000) score += 30;
    else if (p.revenue >= 5_000_000) score += 20;
    else if (p.revenue >= 2_000_000) score += 10;

    // Отрасль — приоритетные
    if (['construction', 'it', 'agency', 'production'].indexOf(p.industry) !== -1) score += 15;

    // Наличие финансиста
    if (p.hasFinancist === 'yes_staff') score += 25;
    else if (p.hasFinancist === 'yes_outsource') score += 15;

    // Количество проектов
    if (p.projects >= 10) score += 15;
    else if (p.projects >= 5) score += 10;
    else if (p.projects >= 3) score += 5;

    // Роль: собственник = прямой ЛПР, финансист = инфлюенсер
    if (p.role === 'owner') score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // Названия профилей для отчёта
  const PROFILE_NAMES = {
    blind: 'Управление вслепую',
    scale_without_control: 'Масштаб без управления',
    accounting_illusion: 'Бухгалтерская иллюзия',
    early_stage: 'Ранняя стадия',
    almost_there: 'В шаге от системы',
    plateau: 'Наступившее плато'
  };

  // Форматирование чисел по ГОСТ 8.417-2002 (неразрывный пробел)
  function formatMoney(n) {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(Math.round(n));
    return abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ' ₽';
  }

  function formatMoneyCompact(n) {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) {
      const m = abs / 1_000_000;
      return (m >= 10 ? Math.round(m) : m.toFixed(1).replace('.', ',').replace(',0', '')) + ' млн ₽';
    }
    if (abs >= 1000) return Math.round(abs / 1000) + ' тыс ₽';
    return abs + ' ₽';
  }

  // Склонение
  function plural(n, forms) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  }

  global.Calculator = {
    REVENUE_ZONES,
    RISK_COEFF,
    RISK_PROJECT_SHARE,
    RISK_ZONE_BY_INDUSTRY,
    PROFILE_NAMES,
    revenueFromSliderIndex,
    revenueLabel,
    computeAll,
    classifyProfile,
    calculateICPScore,
    formatMoney,
    formatMoneyCompact,
    plural
  };

})(window);
