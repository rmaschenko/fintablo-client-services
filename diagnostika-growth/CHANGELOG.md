# CHANGELOG

История заметных изменений проекта `diagnostika-growth`. Формат: новые сверху.

---

## 2026-05-07 (вечер) — 4-маршрутная развилка + автогенерация URL шаблонов

### Добавлено
- **4 маршрута**: `hot_icp` / `hot_icp_no_finance` / `warm_icp` / `anti_icp` (вместо прежних 2 `icp` / `self_serve`)
- **`getAntiSubtype`** в [calculator.js](quiz/js/calculator.js) — `trade` / `services` / `small` для подбора шаблонов и пиксельной сегментации
- **Реестр 12 Excel-шаблонов** в новом файле [quiz/js/templates.js](quiz/js/templates.js) с `getForPain(pain, type)` и `getBonus(antiSubtype)`
- **Автогенерация URL шаблонов** через `?path=` в публичной папке Я.Диска (`PUBLIC_KEY = https://disk.yandex.ru/d/NPG3nHemZ743oQ`) — без ручной публикации каждого файла
- **Section 4 для Anti-ICP**: 3 карточки шаблонов под боль + бонус «Управление запасами» для торговли. **Без формы, без email-gate**.
- **Section 4 для Warm ICP**: CTA → `app.fintablo.ru/register?utm_campaign=warm_partial_fit&dg_business_type=...`
- **Section 4 для Hot ICP без ФФ**: тот же блок что Hot ICP + дополнительный пункт «Подберём партнёра-финансиста»
- **Сегментные goals Я.Метрики**: `dg_anti_icp_segment`, `dg_warm_icp_segment`, `dg_hot_icp_segment`, `dg_lead_hot_icp`, `dg_lead_hot_icp_no_finance`, `dg_warm_icp_click`, `dg_anti_icp_download` — все с params (`business_type`, `revenue`, `pain`, `cfo_status`, `anti_subtype`)
- **CSS для anti-ICP**: `.dg-templates`, `.dg-template-card`, `.dg-template-bonus-wrap`, `.dg-template-card-bonus` (grid 3→1 на мобиле, бонус amber)
- **Документация в проекте**: README.md, ARCHITECTURE.md, ROUTING.md, ANALYTICS.md, DEPLOYMENT.md, TESTING.md, TEMPLATES.md, ROADMAP.md, CHANGELOG.md

### Изменено
- **Step 2 квиза** — финтабло-копирайт: «Услуги под заказ» / «Производство» / «Торговля» / «Сервис на потоке» (вместо «Услуги без проектной модели» которое было «не по русски»)
- **`classifyRoute`** — приоритет правил сверху вниз, без блокировки по возрасту и роли
- **`computeAll`** возвращает `route` + `antiSubtype` (новое поле)
- **ROADMAP.md**: pixel retargeting перенесён из P2 в ✅ сделано
- **`bindLeadForm`** в [report.js](quiz/js/report.js) — расширен payload, передаёт `routeTag`, исправлен текст fallback-кнопки

### Удалено
- Старые функции `bindSelfServe` и `buildTrialUrl` (заменены на `bindAntiIcp`/`bindWarmIcp`/`buildWarmTrialUrl`)
- Старая 2-маршрутная развилка `icp` / `self_serve`

### Принципиальные решения сессии
- **Услуги без проектной модели = Anti-ICP всегда** (структурный блокер). Обоснование: продуктовый гэп Финтабло (нет POS, нет учёта смен/абонементов) + KPI на долю ICP
- **Email-gate отменён в MVP**: до появления CRM-маркетолога — только прямые ссылки на скачивание. Email-цепочки отложены в [ROADMAP.md](ROADMAP.md)
- **Telegram запрещён** как канал доставки шаблонов (см. memory `feedback_no_telegram.md`)
- **3 шаблона на боль, не 2** — лейблы «Старт / Инструмент / Масштаб», подача как комплект

---

## 2026-05-06 — Section 02 как gauge + Section 03 narrative

### Изменено
- **Section 02 (Индекс прозрачности)**: переделан в полукруговой gauge SVG с red→amber→green gradient, маркерами когорты и лидеров на дуге
- **Section 03 (Что исправить)**: narrative-flow без коробок + тематические SVG-визуализации (88×88) под каждую боль (`margin`, `cash`, `time`, `pillars`)

### Коммит
`49b268a feat: Section 02 как gauge + Section 03 с SVG-визуализациями`

---

## 2026-05-05 — CRO-переработка лендинга и квиза

### Добавлено
- 2 чекбокса согласия в форме (152-ФЗ + рекламный) с timestamp
- Step 6 квиза «Есть ли в компании выделенный финансист?» (3 варианта)
- mp4 видео реального дашборда Финтабло в hero лендинга

### Изменено
- **Hero лендинга**: убран eyebrow, sub в 1 строку, 1 CTA (вместо 2)
- **Квиз без welcome-экрана** — стартует сразу с первого вопроса
- **Step 1**: «Ваша роль в компании» (нейтральная формулировка)
- **Кавычки убраны** из всех текстов (выглядели как ИИ)
- **Section 1**: переделана из «упущенная прибыль» (red) в «сколько можно вернуть» (blue) — позитивный спин
- Footer как эталон money-diagnosis (без логотипа, только © Финтабло)

### Удалено
- Полоса интеграций со списком брендов (нельзя — каноны)
- Секция «Реальный продукт» (mp4 уже в hero, дубль)
- Welcome-экран квиза (дублировал лендинг)
- Симптомы 6→4 пункта

---

## 2026-05-04 — Стартовое создание

### Добавлено
- Скелет лендинга `index.html` по SPEC
- 6-шаговый квиз `quiz/index.html` с auto-advance
- Калькулятор `quiz/js/calculator.js` с формулами PAIN_COEF + TYPE_COEF, источниками РФ 2025-2026
- Рекомендации (4 объекта по болям) с полями `title`, `body`, `whyHard`, `howFintablo`, `proofPoint`
- Storage 48ч TTL + UTM захват
- `api/lead.php` — CSV backup + amoCRM API v4
- Я.Метрика 61131877 + Финтабло-counter
- DS Kit Финтабло (Inter локально, токены)
- HANDOFF-GROWTH.md для growth-специалиста
- og-image 1200×630

### Каноны учтены
- `feedback_fintablo_use_reference.md` — открыт эталон money-profit
- `feedback_fintablo_plseo.md` — gate после aha, CTA привязан к результату
- `reference_fintablo_real_data.md` — реальные реквизиты, лого Tilda CDN
- `reference_fintablo_counter.md` — счётчик сквозной аналитики

---

## Принципы ведения CHANGELOG

- Каждое изменение помечается датой (формат `YYYY-MM-DD`)
- Внутри даты — секции «Добавлено / Изменено / Удалено / Принципиальные решения»
- Принципиальные решения = выбор из вариантов с обоснованием (не повседневные правки)
- Связанные коммиты или PR — указывать sha/номер
- При большой сессии правок — собрать все в одну дату, не дробить
