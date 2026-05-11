# ANALYTICS — события Я.Метрики и настройка Я.Директа

Я.Метрика 61131877 + сквозная аналитика Финтабло (`analyst.fintablo.ru`).

---

## Все goals (полный список)

### Фуннел квиза

| Goal | Когда срабатывает | Где в коде |
|---|---|---|
| `dg_quiz_loaded` | Загрузка `quiz/index.html` | [quiz.js:131](quiz/js/quiz.js#L131) |
| `dg_quiz_start` | Перед показом первого шага | [quiz.js:151](quiz/js/quiz.js#L151) |
| `dg_step_1` ... `dg_step_6` | Показ каждого шага | [quiz.js:58](quiz/js/quiz.js#L58) |
| `dg_quiz_complete` | После 6-го ответа, перед redirect на `report.html` | [quiz.js:113](quiz/js/quiz.js#L113) |
| `dg_report_view` | Открытие `report.html` (показан разбор) | [report.js:18](quiz/js/report.js#L18) |

### Сегментные goals (с params для Я.Директа)

Все срабатывают **на показ** соответствующего финального блока + передают params:

```js
{
  business_type: 'project' | 'production' | 'services' | 'trade',
  revenue: <число, млн ₽>,
  pain: 'margin_blind' | 'cash_surprise' | 'manual_close' | 'blind_decisions',
  cfo_status: 'yes_cfo' | 'accountant_combined' | 'self_only',
  anti_subtype: 'trade' | 'services' | 'small' | ''
}
```

| Goal | Сегмент | Назначение в Я.Директе |
|---|---|---|
| `dg_anti_icp_segment` | Anti-ICP — все 3 подтипа | **Exclusion**: исключить из активной кампании на 90 дней |
| `dg_warm_icp_segment` | Warm ICP (30-60 млн) | **Soft retargeting**: «Попробуй Финтабло» |
| `dg_hot_icp_segment` | Hot ICP (60+ млн, обе ветки) | **Look-alike + усиленный ретаргет**: похожая аудитория |

### Конверсионные goals

| Goal | Когда | Назначение |
|---|---|---|
| `dg_lead_hot_icp` | Сабмит формы для маршрута `hot_icp` | Look-alike по горячим лидам |
| `dg_lead_hot_icp_no_finance` | Сабмит формы для маршрута `hot_icp_no_finance` | Look-alike + сегмент с допродажей партнёра |
| `dg_lead_sent` | Успешный POST в `api/lead.php` | Финальная конверсия (общая) |
| `dg_warm_icp_click` | Клик на CTA «Попробовать Финтабло» в Warm | Финальная конверсия Warm |
| `dg_anti_icp_download` | Клик на любую карточку шаблона в Anti-ICP | Аналитика — какие шаблоны качают чаще |

При срабатывании `dg_anti_icp_download` дополнительно передаётся параметр `template: <id>` (id шаблона из `Templates.REGISTRY`).

---

## Что настроить в Я.Метрике (UI)

1. **Создать цели** для каждого `dg_*` goal — указать имя ровно как в коде (case-sensitive)
2. **Тип цели**: «JavaScript-событие»
3. **Идентификатор цели**: имя goal (например, `dg_anti_icp_segment`)

Все params автоматически попадают в Метрику — можно резать сегменты по `business_type`, `revenue`, `pain` через **Параметры визитов / События**.

---

## Что настроить в Я.Директе (UI)

### Шаг 1. Импортировать цели из Метрики

В кабинете Директа: **Библиотека → Сегменты → Создать сегмент → Источник: Я.Метрика → Цель: dg_***

### Шаг 2. Создать сегменты аудиторий

| Имя сегмента | Источник | Назначение |
|---|---|---|
| `dg_anti_icp_30days` | Goal `dg_anti_icp_segment`, посещение в течение 30 дней | Exclusion |
| `dg_warm_icp_30days` | Goal `dg_warm_icp_segment`, 30 дней | Soft retargeting |
| `dg_hot_icp_segment_30days` | Goal `dg_hot_icp_segment`, 30 дней | Look-alike base (показавшие) |
| `dg_hot_lead_180days` | Goal `dg_lead_hot_icp` ИЛИ `dg_lead_hot_icp_no_finance`, 180 дней | Look-alike base (горячие лиды) |
| `dg_quiz_complete_90days` | Goal `dg_quiz_complete`, 90 дней | Базовая аудитория квалифицированных |

### Шаг 3. Настроить рекламные кампании

| Кампания | Действие |
|---|---|
| Основная кампания (категория «управленческий учёт») | **Корректировка ставок −100%** на сегмент `dg_anti_icp_30days` (exclusion) |
| Ретаргетинг кампания | Аудитория = `dg_warm_icp_30days`. Креативы «Попробуй Финтабло, 7 дней бесплатно» |
| Look-alike кампания | Похожая на `dg_hot_lead_180days`. Тип «Look-alike по аудитории» |

### Шаг 4. Сегментация по болям (для креативов)

Через параметры визита можно резать `dg_warm_icp_segment` по `pain`:
- `pain = margin_blind` → креатив про маржу
- `pain = cash_surprise` → креатив про кассу
- `pain = manual_close` → креатив про закрытие месяца
- `pain = blind_decisions` → креатив про решения

---

## Что мониторить в Я.Метрике (отчёты)

### Воронка (Отчёты → Конверсии → Цели)

| Step | Goal | Бенчмарк CR |
|---|---|---|
| 1. Заход на лендинг | визит | — |
| 2. Открыл квиз | `dg_quiz_loaded` | 20-30% |
| 3. Прошёл до конца | `dg_quiz_complete` | 60-75% от quiz_loaded |
| 4. Увидел разбор | `dg_report_view` | 95%+ от quiz_complete |
| 5a. Hot ICP сегмент | `dg_hot_icp_segment` | ~25% от report_view (целевая доля) |
| 5b. Hot ICP лид | `dg_lead_hot_icp` или `dg_lead_hot_icp_no_finance` | 25-40% от hot_icp_segment |

### Сегментный срез

**Отчёт «Параметры визитов»** → выбрать `pain` или `business_type` → видим распределение пройденных квизов по болям и типам бизнеса.

### Срез по шаблонам (anti-ICP)

`dg_anti_icp_download` с параметром `template` → отчёт по самым востребованным шаблонам. Это сигнал что добавить в библиотеку или продвигать активнее.

---

## Сквозная аналитика Финтабло

`analyst.fintablo.ru/jsapi/api.min.js` — счётчик Финтабло, передаёт данные в общую систему атрибуции (вместе с лендингами finatablo.ru и app.fintablo.ru).

API-ключ: `apiKey-PeblK5cQmecxkFlCLYC4KrNneo0BiluLLd7lx3lie6bQABFw`

Подключён через [skill `fintablo-counter`](.context/SKILL-v1_1.md) — обязателен на всех HTML-страницах. Если страница не подключила — выпадает из сквозной аналитики.

Проверить наличие на странице:

```bash
grep -l "analyst.fintablo.ru/jsapi" diagnostika-growth/**/*.html
```

Должны быть: `index.html`, `quiz/index.html`, `quiz/report.html`, `quiz/thankyou.html`.

---

## UTM-захват

[storage.js → captureUTM](quiz/js/storage.js#L10) при загрузке любой страницы:
1. Парсит `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` из querystring
2. Сохраняет в `sessionStorage['dg_utm']` (с referrer + pageUrl + timestamp)
3. Параллельно [index.html](index.html) сохраняет в `localStorage['ft_utm']` для **first-click атрибуции** (бессрочно)

При сабмите формы UTM из обоих источников попадают в payload → `api/lead.php` → amoCRM.

При клике на CTA Warm ICP UTM переносятся в `app.fintablo.ru/register?...&dg_<utm_key>=<value>` для cross-domain атрибуции.

---

## Чек-лист настройки после деплоя

- [ ] Все `dg_*` goals созданы в Я.Метрике 61131877
- [ ] Сегменты в Я.Директе созданы и протестированы (показывают >0 пользователей через 24-48ч после запуска трафика)
- [ ] Корректировка ставок −100% на `dg_anti_icp_30days` стоит в основной кампании
- [ ] Look-alike кампания на `dg_hot_lead_180days` запущена
- [ ] Сквозная аналитика Финтабло видит трафик с `service: diagnostika-growth`
- [ ] Воронка в Метрике строится корректно (CR между шагами реалистичны)
