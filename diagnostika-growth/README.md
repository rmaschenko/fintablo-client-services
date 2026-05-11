# diagnostika-growth

PLG-воронка финансовой диагностики для холодного трафика Яндекс.Директа в Финтабло. **6 вопросов** → **персональный разбор** (упущенная прибыль / индекс прозрачности / что исправить) → **4-маршрутная развилка** (Hot ICP → встреча · Hot ICP без ФФ → встреча + партнёр · Warm ICP → trial · Anti-ICP → шаблоны).

**Главный KPI:** рост доли ICP в финальных лидах **с 35% до 50%**.

**Прод (демо):** [https://rmaschenko.github.io/fintablo-client-services/diagnostika-growth/](https://rmaschenko.github.io/fintablo-client-services/diagnostika-growth/)
**Финальный домен:** `diagnostika.fintablo.ru` (после деплоя на FTP-инфраструктуру)

---

## Документация

### Контекст и стратегия
- [SPEC-diagnostika-growth.md](SPEC-diagnostika-growth.md) — исходное ТЗ
- [HANDOFF-GROWTH.md](HANDOFF-GROWTH.md) — для growth-специалиста: бизнес-цели, KPI, гипотезы
- [ROADMAP.md](ROADMAP.md) — отложенные доработки (email-цепочки, A/B, аналитика)

### Технические документы
- [ARCHITECTURE.md](ARCHITECTURE.md) — структура кода, поток данных, состояние
- [ROUTING.md](ROUTING.md) — логика 4-маршрутной развилки + формулы калькулятора
- [ANALYTICS.md](ANALYTICS.md) — события Я.Метрики + настройка Я.Директа
- [DEPLOYMENT.md](DEPLOYMENT.md) — деплой на GitHub Pages / FTP / DNS
- [TESTING.md](TESTING.md) — acceptance criteria + ручное тестирование
- [TEMPLATES.md](TEMPLATES.md) — реестр Excel-шаблонов anti-ICP
- [CHANGELOG.md](CHANGELOG.md) — журнал изменений

### Каноны Финтабло (читать ДО правок)
- [.context/SKILL-v1_1.md](.context/SKILL-v1_1.md) — копирайтерский стандарт
- [.context/FINTABLO_UTP_BASE_2026.md](.context/FINTABLO_UTP_BASE_2026.md) — позиционирование
- [.context/competitor_analysis_fintablo_2026.md](.context/competitor_analysis_fintablo_2026.md) — конкуренты

---

## Локальный запуск

```bash
cd /path/to/fintablo-client-services
python3 -m http.server 8765
# Открыть в браузере:
#   http://localhost:8765/diagnostika-growth/         — лендинг
#   http://localhost:8765/diagnostika-growth/quiz/    — квиз
```

На GitHub Pages и `localhost` `lead.js` детектирует demo-режим и не отправляет POST в `api/lead.php` (эмулирует успех в консоли).

---

## Структура проекта

```
diagnostika-growth/
├── index.html              # Лендинг
├── assets/                 # OG-картинка, видео дашборда
├── fonts/                  # Inter (4 веса локально)
├── quiz/
│   ├── index.html          # 6 шагов квиза
│   ├── report.html         # Разбор (3 секции + Section 4 финал)
│   ├── thankyou.html       # После сабмита формы (Hot ICP)
│   ├── api/
│   │   └── lead.php        # POST endpoint → CSV + amoCRM
│   ├── css/                # quiz-dg.css, report-dg.css, style.css (DS Kit)
│   ├── img/                # Иконки квиза
│   ├── fonts/              # Inter (синхронно с корнем)
│   └── js/
│       ├── storage.js      # localStorage TTL 48ч + UTM-захват
│       ├── calculator.js   # Формулы + 4-маршрутный classifyRoute
│       ├── templates.js    # Реестр 12 Excel-шаблонов + getForPain
│       ├── quiz.js         # Логика 6 шагов + auto-advance
│       ├── lead.js         # POST в api/lead.php + demo-fallback
│       └── report.js       # Рендер 4 секций + 4 финальных блока
└── docs (этот блок)        # README + ARCHITECTURE + ROUTING + ...
```

Подробнее — в [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Быстрая навигация по задачам

| Что хочу сделать | Куда идти |
|---|---|
| Понять как работают маршруты | [ROUTING.md](ROUTING.md) |
| Понять метрики Я.Метрики | [ANALYTICS.md](ANALYTICS.md) |
| Изменить тексты квиза | [quiz/index.html](quiz/index.html) (через skill `fintablo-copywriter`) |
| Изменить формулы калькулятора | [quiz/js/calculator.js](quiz/js/calculator.js) + [ROUTING.md § Калькулятор](ROUTING.md) |
| Поменять список шаблонов anti-ICP | [quiz/js/templates.js](quiz/js/templates.js) + [TEMPLATES.md](TEMPLATES.md) |
| Задеплоить на прод | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Понять что протестировать | [TESTING.md](TESTING.md) |
| Найти что отложили | [ROADMAP.md](ROADMAP.md) |

---

## Стек

- Vanilla HTML/CSS/JS (без фреймворков)
- Inter (4 веса локально, без Google Fonts) + Plex Mono (для цифр) + Literata (для acce)
- Inline SVG-иконки и визуализации
- PHP 7+ для `api/lead.php` (CSV + amoCRM API v4)
- Я.Метрика 61131877 + Финтабло-counter (analyst.fintablo.ru)
- localStorage (TTL 48ч) + sessionStorage (для report.html)
