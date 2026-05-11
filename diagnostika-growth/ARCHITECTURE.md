# ARCHITECTURE — структура и поток данных

## Высокоуровневая схема

```
┌──────────────┐    клик «Начать»    ┌──────────────┐
│  index.html  │ ─────────────────▶ │  quiz/       │
│  (лендинг)   │                     │  index.html  │
└──────────────┘                     └──────────────┘
                                            │ ответы 6 шагов
                                            ▼
                              ┌─────────────────────────┐
                              │ Calculator.computeAll() │
                              │ → route, antiSubtype,   │
                              │   lossRange, transparency, │
                              │   recommendation        │
                              └─────────────┬───────────┘
                                            │ Storage.saveReportData()
                                            ▼
                              ┌─────────────────────────┐
                              │ quiz/report.html        │
                              │  ├ Section 01 Loss      │
                              │  ├ Section 02 Index     │
                              │  ├ Section 03 Fix       │
                              │  └ Section 04 Final     │
                              │     ├ hot_icp           │ ──▶ форма → api/lead.php → amoCRM → thankyou.html
                              │     ├ hot_icp_no_finance│ ──▶ форма + допродажа партнёра → amoCRM
                              │     ├ warm_icp          │ ──▶ редирект app.fintablo.ru/register
                              │     └ anti_icp          │ ──▶ 3 ссылки на Я.Диск + бонус для торговли
                              └─────────────────────────┘
```

---

## Слои

### Презентационный (HTML + CSS)

| Файл | Что делает |
|---|---|
| [index.html](index.html) | Лендинг — hero, симптомы, CTA в квиз |
| [quiz/index.html](quiz/index.html) | 6 шагов квиза с auto-advance |
| [quiz/report.html](quiz/report.html) | Каркас разбора — 4 секции (Loss / Index / Fix / Final) |
| [quiz/thankyou.html](quiz/thankyou.html) | Спасибо-страница после сабмита формы (Hot ICP) |
| [quiz/css/quiz-dg.css](quiz/css/quiz-dg.css) | Стили квиза (cards, progress, nav) |
| [quiz/css/report-dg.css](quiz/css/report-dg.css) | Стили разбора (gauge, narrative, templates) |
| [quiz/css/style.css](quiz/css/style.css) | DS Kit Финтабло — токены, типографика, базовые компоненты |

### Логический (JS)

| Файл | Ответственность | Зависимости |
|---|---|---|
| [quiz/js/storage.js](quiz/js/storage.js) | localStorage 48ч TTL для resume + UTM first-click + sessionStorage для report data | — |
| [quiz/js/calculator.js](quiz/js/calculator.js) | Формулы (loss, transparency), маршрутизация (`classifyRoute`), рекомендации | — |
| [quiz/js/templates.js](quiz/js/templates.js) | Реестр 12 Excel-шаблонов + `getForPain(pain, type)` + `getBonus(antiSubtype)` | — |
| [quiz/js/quiz.js](quiz/js/quiz.js) | State machine 6 шагов, auto-advance, навигация ←/→ | Storage, Calculator |
| [quiz/js/lead.js](quiz/js/lead.js) | POST в `api/lead.php`, mask phone, validate, demo-fallback на GitHub Pages | — |
| [quiz/js/report.js](quiz/js/report.js) | Рендер 4 секций + 4 финальных блока + пиксельные события Я.Метрики | Storage, Calculator, Templates, Lead |

### Серверный

| Файл | Что делает |
|---|---|
| [quiz/api/lead.php](quiz/api/lead.php) | POST endpoint → CSV backup + amoCRM /api/v4/leads/complex (если `.env` заполнен) |

### Внешние сервисы

| Сервис | Назначение |
|---|---|
| Я.Метрика 61131877 | Все события воронки + сегментные goals для Я.Директа |
| analyst.fintablo.ru | Сквозная аналитика Финтабло |
| Я.Диск (публичная папка) | Хранение 12 Excel-шаблонов anti-ICP |
| amoCRM | CRM для Hot ICP лидов (pipeline 5278171) |

---

## Поток данных

### 1. Лендинг → Квиз

`index.html` → клик «Начать диагностику» → `quiz/index.html`. UTM-параметры подхватываются из URL и сохраняются:
- `localStorage['ft_utm']` — для финального payload
- `sessionStorage['dg_utm']` — для текущей сессии (Storage.captureUTM)

### 2. Прохождение квиза

[quiz/js/quiz.js](quiz/js/quiz.js):
- Состояние `state` хранит ответы по 6 ключам: `role`, `businessType`, `annualRevenue`, `businessAge`, `primaryPain`, `cfoStatus`
- На каждом клике: `state[i] = value` + `Storage.saveState(state)` (в localStorage с TTL 48ч)
- Auto-advance через 280мс после клика
- На последнем шаге: `Calculator.computeAll(state)` → `Storage.saveReportData(result)` → redirect на `report.html`

Resume: при повторном заходе показывается баннер «У вас есть незавершённая диагностика» — данные восстанавливаются из localStorage.

### 3. Расчёт профиля

[quiz/js/calculator.js](quiz/js/calculator.js) `computeAll(answers)`:

```js
{
  profile: { role, businessType, businessTypeLabel, annualRevenue,
             businessAge, primaryPain, primaryPainLabel, cfoStatus },
  lossRange: { min, max, sources: [...3 источников...] },
  transparency: { score, zone, zoneLabel, peerScore, topScore },
  route: 'hot_icp' | 'hot_icp_no_finance' | 'warm_icp' | 'anti_icp',
  antiSubtype: 'trade' | 'services' | 'small' | null,
  recommendation: { title, body, whyHard, howFintablo, proofPoint, tags, visual },
  computedAt: <timestamp>
}
```

Подробности формул и логики — в [ROUTING.md](ROUTING.md).

### 4. Рендер разбора

[quiz/js/report.js](quiz/js/report.js):

1. `renderHero` — заголовок + подзаголовок (одинаковый для всех маршрутов)
2. `renderLoss` — Section 01: диапазон возврата + 3 источника
3. `renderIndex` — Section 02: gauge SVG (полукруговой) + бенчмарки когорты/лидеров
4. `renderFix` — Section 03: narrative-flow с тематической SVG-визуализацией под боль
5. `renderFinal` — Section 04: ветвление по `route`:
   - `hot_icp` → `renderHotIcpBlock(false)` + `bindLeadForm('hot_icp')`
   - `hot_icp_no_finance` → `renderHotIcpBlock(true)` + `bindLeadForm('hot_icp_no_finance')`
   - `warm_icp` → `renderWarmIcpBlock` + `bindWarmIcp`
   - `anti_icp` → `renderAntiIcpBlock` + `bindAntiIcp`

При показе финального блока срабатывает segment-goal в Я.Метрике с params (`business_type`, `revenue`, `pain`, `cfo_status`, `anti_subtype`) — для exclusion и look-alike в Я.Директе.

### 5. Сабмит лид-формы (только Hot ICP / Hot ICP без ФФ)

[quiz/js/report.js → bindLeadForm](quiz/js/report.js):

1. Валидация (имя, телефон, email, чекбокс согласия 152-ФЗ)
2. Сборка `payload`:
   ```js
   {
     source: 'diagnostika-growth',
     route: 'hot_icp' | 'hot_icp_no_finance',
     routeTag, name, phone, email, city,
     profile: { ... },
     transparencyScore, lossRange,
     recommendation, utm,
     consent: { given, timestamp, policyUrl, offerUrl, operator },
     marketingConsent: bool
   }
   ```
3. POST в `api/lead.php` через `Lead.sendLead()`
4. На demo-хостах (`localhost`, `*.github.io`) POST пропускается, эмулируется успех
5. На успехе: redirect на `thankyou.html?route=<route>`

### 6. Anti-ICP — без формы

Кнопки шаблонов = прямые `<a href>` на Я.Диск. Клик → переход в UI Я.Диска с открытым предпросмотром файла → пользователь жмёт «Скачать». Параллельно срабатывает goal `dg_anti_icp_download` с параметром `template: <id>`.

### 7. Warm ICP — редирект

Одна кнопка → `app.fintablo.ru/register?utm_campaign=warm_partial_fit&dg_business_type=...&dg_revenue=...&dg_pain=...` (UTM из localStorage переносятся как `dg_*`).

---

## Хранение состояния

| Storage | Ключ | TTL | Что хранится |
|---|---|---|---|
| localStorage | `dg_state_v1` | 48ч | Прогресс квиза для resume |
| localStorage | `ft_utm` | бессрочно | UTM first-click |
| localStorage | `ft_cookie_ok` | бессрочно | Принял cookie banner |
| sessionStorage | `dg_utm` | сессия | UTM текущей сессии |
| sessionStorage | `dg_utm_captured` | сессия | Флаг «UTM уже захвачены» |
| sessionStorage | `dg_report_data` | сессия | Computed result для report.html |

**152-ФЗ:** в localStorage **не хранится** имя/телефон/email — только ответы квиза (без PII). Контакты собираются на форме и сразу отправляются в `api/lead.php`.

---

## Контракт «компонент → данные»

| Где собирают | Что собирают | Куда передают |
|---|---|---|
| `quiz/index.html` (UI) | 6 ответов | `state` в [quiz.js](quiz/js/quiz.js) |
| `quiz.js` (state) | 6 ответов | `Calculator.computeAll(state)` |
| `Calculator` | profile, route, lossRange, transparency, recommendation | `Storage.saveReportData()` |
| `Storage` (sessionStorage) | computed result | `report.js` через `Storage.loadReportData()` |
| `report.js` (форма) | name, phone, email, consent + computed result | `Lead.sendLead(payload)` |
| `Lead.sendLead` | payload | POST `api/lead.php` |
| `api/lead.php` | payload | CSV (`api/leads/fin_diagnostics_YYYY-MM.csv`) + amoCRM API |

---

## Принципы

1. **Vanilla — никаких фреймворков.** Простота, скорость, никаких build-step. Подключается как обычные `<script>`.
2. **State в JS-объекте, не в DOM.** Quiz.js хранит state в замыкании, DOM — производная.
3. **Computed result — один объект.** `computeAll` возвращает всё что нужно report.html. Никаких множественных вычислений в render-функциях.
4. **Маршрутизация — только в `classifyRoute`.** Ни один render не должен решать «куда пойдёт лид» — только читать `data.route`.
5. **Тексты — через skill `fintablo-copywriter`.** Любое изменение копирайта проходит через копирайтерский стандарт.
6. **152-ФЗ first.** PII не хранится в localStorage. Согласие — явный чекбокс с timestamp в payload.
7. **Demo-fallback в lead.js.** GitHub Pages превью работает без PHP-бэка — POST эмулируется в консоли.
