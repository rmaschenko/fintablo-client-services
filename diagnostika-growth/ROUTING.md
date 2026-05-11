# ROUTING — логика маршрутизации и формул

Главный документ по бизнес-логике воронки. Что и почему вычисляется в [calculator.js](quiz/js/calculator.js).

---

## 6 вопросов квиза

| Step | Поле в state | Возможные значения |
|---|---|---|
| 1 | `role` | `owner`, `financier`, `accountant`, `other` |
| 2 | `businessType` | `project`, `production`, `services`, `trade` |
| 3 | `annualRevenue` | `20`, `45`, `120`, `350`, `800` (млн ₽/год — медиана диапазона) |
| 4 | `businessAge` | `young` (до 3), `mid` (3-5), `mature` (5-10), `veteran` (10+) |
| 5 | `primaryPain` | `margin_blind`, `cash_surprise`, `manual_close`, `blind_decisions` |
| 6 | `cfoStatus` | `yes_cfo`, `accountant_combined`, `self_only` |

---

## Маршрутизация — `classifyRoute(answers)`

### 4 маршрута

| Route | Что делает | Когда |
|---|---|---|
| `anti_icp` | 3 ссылки на скачивание шаблонов + бонус для торговли | См. правила 1-2 |
| `warm_icp` | Редирект на `app.fintablo.ru/register?utm_campaign=warm_partial_fit` | См. правило 3 |
| `hot_icp` | Лид-форма «бесплатная встреча с финансовым экспертом» | См. правило 4 |
| `hot_icp_no_finance` | То же + допродажа партнёра-финансиста на встрече | См. правило 5 |

### Приоритет правил (сверху вниз)

```
1. businessType ∈ {trade, services}        → anti_icp  (структурный блокер)
2. annualRevenue < 30                       → anti_icp  (рано для нас)
3. annualRevenue < 60                       → warm_icp  (продуктовая воронка)
4. cfoStatus ≠ self_only                    → hot_icp
5. cfoStatus = self_only                    → hot_icp_no_finance
```

### Подтип Anti-ICP — `getAntiSubtype(answers)`

Нужен для подбора шаблонов и пиксельных событий:

| antiSubtype | Условие |
|---|---|
| `trade` | `businessType = trade` |
| `services` | `businessType = services` |
| `small` | `annualRevenue < 30` |
| `null` | не Anti-ICP |

### Полная таблица маршрутов

| Тип бизнеса | Выручка | Финфункция | Маршрут | antiSubtype |
|---|---|---|---|---|
| Торговля | любая | любая | `anti_icp` | `trade` |
| Сервис на потоке | любая | любая | `anti_icp` | `services` |
| Услуги под заказ или Производство | <30 | любая | `anti_icp` | `small` |
| Услуги под заказ или Производство | 30-60 | любая | `warm_icp` | `null` |
| Услуги под заказ или Производство | 60+ | yes_cfo / accountant_combined | `hot_icp` | `null` |
| Услуги под заказ или Производство | 60+ | self_only | `hot_icp_no_finance` | `null` |

### Что НЕ блокирует ICP

- **Возраст бизнеса** (`businessAge`) — не блокер. Передаётся в amoCRM как контекст
- **Роль** (`role`) — не блокер. Бухгалтер тоже может пройти как ICP, передаётся в amoCRM
- **Отсутствие финфункции** (`cfoStatus = self_only`) — не блокер, ведёт в маршрут `hot_icp_no_finance` с допродажей партнёра

---

## Калькулятор упущенной прибыли — `calcLossRange`

Считает диапазон возврата прибыли в год по 3 источникам.

### Формула

```
loss_min = revenue × (0.005 × typeK + 0.020 × typeK × painK + 0.010 × painK)
loss_max = revenue × (0.015 × typeK + 0.050 × typeK × painK + 0.030 × painK)
```

Где:
- `revenue` = `annualRevenue × 1_000_000` рублей
- `typeK` — коэффициент типа бизнеса
- `painK` — коэффициент остроты боли

### Коэффициенты

```js
PAIN_COEF = {
  blind_decisions: 1.2,  // прямое попадание в общие -10% Adesk
  margin_blind:    1.0,  // база
  cash_surprise:   0.8,
  manual_close:    0.6
}

TYPE_COEF = {
  project:    1.2,  // большой разброс маржи между проектами
  production: 1.1,  // НЗП с большим разбросом + 38% столкнулись с просрочкой
  services:   1.0,  // база
  trade:      0.8   // anti-ICP, другая модель оборачиваемости
}
```

### 3 источника декомпозиции (показываются на UI)

1. **Время команды на ручные сверки** (0.5–1.5% × typeK)
   - Источник: расчёт по зарплате CFO МСБ (HH.ru 2025) × часы/мес на ручное закрытие

2. **Невидимые просадки маржи** (2.0–5.0% × typeK × painK)
   - Источник: Adesk (прибыль МСБ −10% за 2025), Moscow Times (31% МСБ с серьёзной просрочкой дебиторки)

3. **Задержка решений по убыточным направлениям** (1.0–3.0% × painK)
   - Источник: оценка по сроку закрытия месяца × длительность реакции

Округление до 100 000 ₽.

### Источники цифр (РФ 2025-2026)

- Прибыль МСБ −10% при росте выручки +26% — Adesk
- Просрочка дебиторки 8.2 трлн ₽ = 3.8% ВВП — РБК, ДП, Probankrotstvo
- 31% МСБ с серьёзной просрочкой — Moscow Times, январь 2026
- Зарплата CFO малого бизнеса 180-250 тыс ₽/мес — HH.ru 2025

---

## Индекс прозрачности — `calcTransparencyIndex`

Шкала 0-100 на основе 4 факторов.

### Формула

```
score = 30 (база)
      + cfoBonus[cfoStatus]
      + typeBonus[businessType]
      + painPenalty[primaryPain]
      + ageBonus[businessAge]
      
clamp(0, 100)
```

### Коэффициенты

```js
cfoBonus    = { yes_cfo: 25, yes_specialist: 20, accountant_combined: 8, self_only: 3 }
typeBonus   = { project: 5, production: 0, services: 5, trade: -5 }
painPenalty = { blind_decisions: -15, margin_blind: -10, cash_surprise: -5, manual_close: -5 }
ageBonus    = { young: 0, mid: 5, mature: 10, veteran: 15 }
```

### Зоны

| Score | Зона | Лейбл |
|---|---|---|
| 0-34 | `low` | Реактивное управление |
| 35-54 | `mid` | Фрагментарная видимость |
| 55-74 | `good` | Системный учёт |
| 75-100 | `top` | Прозрачный учёт |

### Бенчмарки

- `peerScore` — типичный профиль с тем же type/age, но с финансистом и без острой боли (clamped 20-85)
- `topScore` — лидеры: `peerScore + 20` (clamped до 95)

Отображаются как маркеры на gauge SVG.

---

## Рекомендации — `RECOMMENDATIONS`

Один блок из 4 — выбирается по `primaryPain`. Каждый имеет:

| Поле | Назначение |
|---|---|
| `title` | Что собственник реально получает (бизнес-эффект, не процесс) |
| `body` | Описание решения |
| `whyHard` | Почему сложно сделать самому в Excel |
| `howFintablo` | Как Финтабло решает |
| `proofPoint` | Бизнес-эффект одной строкой |
| `tags` | Теги для UI |
| `visual` | Ключ для SVG-визуализации (`margin`, `cash`, `time`, `pillars`) |

Принцип PLG: ценность = результат для бизнеса, не настроенный артефакт. `title` всегда формулируется через выгоду.

---

## Подбор шаблонов anti-ICP — `Templates.getForPain`

См. [TEMPLATES.md](TEMPLATES.md) для полного описания. Кратко:

| Боль | Старт | Инструмент | Масштаб |
|---|---|---|---|
| `margin_blind` | discount_impact | calc_projects (для услуг → calc_services) | opiu |
| `cash_surprise` | opiu | dds | payment_calendar |
| `manual_close` | opiu | dds | balance |
| `blind_decisions` | sales_report | budget (для торговли → fm_trade) | fm |

**Бонус** для `antiSubtype = trade`: + Управление запасами (ABC/XYZ).

---

## Эталонный путь данных

```
Step 1-6 (UI)  ──▶  state{role,businessType,annualRevenue,...}
                                │
                                ▼
                    Calculator.computeAll(state)
                                │
                                ▼
                    {
                      profile,                   ← из state
                      lossRange: calcLossRange,  ← formulas
                      transparency: calcTransparencyIndex,
                      route: classifyRoute,      ← 4 маршрута
                      antiSubtype: getAntiSubtype,
                      recommendation: RECOMMENDATIONS[primaryPain]
                    }
                                │
                                ▼
                    Storage.saveReportData() → sessionStorage
                                │
                                ▼
                    report.html → report.js
                                │
                                ▼
                    renderFinal() → ветвление по route
```
