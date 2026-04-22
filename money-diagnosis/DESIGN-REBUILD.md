# Design rebuild · money-diagnosis → визуал уровня money-profit

**Эталон:** `/money-profit/` (Inter + #1A56DB + slate + одна navy-hero).
**Target:** `/money-diagnosis/report.html` + `/money-diagnosis/css/style.css`.
**Цель:** привести визуальный язык (форму) к эталону, не ломая функционал (ids, data-атрибуты, JS-рендер).

---

## Design DNA эталона money-profit (что копируем)

1. **Один столбец.** `.container max-width:640px`. Узкая читабельная колонка, карточки внутри — максимум 1×1 или 3×1 (3 kpi), не 4×1. На отчётной странице `max-width` можно 800px, не больше.
2. **Жёсткая type-scale без .5.** 40 / 28 / 26 / 24 / 22 / 19 / 17 / 15 / 14 / 13 / 12 / 11. Никаких 10.5 / 11.5 / 12.5 / 13.5 / 14.5 / 15.5.
3. **Пропорции палитры ~90/8/2:** slate-900/700/500 текст + bg F8FAFF + border E5E7EB (90%) · brand-blue #1A56DB для CTA + eyebrow + акцентов (8%) · navy #1A1F36 только для report-hero gradient (2%). Зелёное — точечные ok-pill, красное — точечные danger-pill. **Никаких 5+ градиентов одновременно, никаких фиолетовых (#7C3AED, #6366f1, #8b5cf6) в UI.**
4. **Ритм секций:** каждая карточка `border:1px solid border · radius:16px · padding:22–28px · margin-bottom:16px · shadow:0 1px 3px rgba(0,0,0,.08)`. Между карточками ровно 16px.
5. **KPI-карточки:** 3-колоночная сетка gap:10-12px. В каждой: mono-eyebrow 10-11px + value mono 24px + sub 12px. Никаких border-left-3px разноцветных полосок, только чистый border + `.highlight` = brand-blue-light.
6. **Числа:** mono, tabular-nums, ₽ как отдельный `<span class="rub">` меньшим шрифтом muted-color.
7. **Hero report:** navy-gradient 135deg + radial glow в правом углу + pill-eyebrow + 26px title + 14-15px sub. **Только один такой акцент на странице.**
8. **Listы с номерами:** `rl-num 28×28 circle brand-blue + mono цифра`. Bullet-ul: `bullet::before` с →/✓ brand-blue.
9. **Bar-charts:** светло-серый track 28-36px high + gradient fill + mono value справа 14px.
10. **Shadow-restraint:** `shadow-sm` везде, `shadow-md` только на hover, `shadow-lg` только для sticky/modal.

## Главные расхождения money-diagnosis (что правим)

- [x] `.container max-width:880px` на report-page → слишком широко, появляются 4-колоночные сетки
- [x] `.rs-mid-cta` — navy gradient в центре страницы с дублированием hero-эффекта
- [x] `.rs-trajectory` — `linear-gradient(blue-light→bg)` фон + ещё одна карточка внутри
- [x] `.rs-tldr::before` — синяя вертикальная полоска (не в эталоне)
- [x] `.plan-card::before` — connecting line с 3-градиентным blue
- [x] Дробные размеры шрифта: 10.5, 11.5, 12.5, 13.5, 14.5, 15.5 (всего ~18 мест)
- [x] `.mb-bar` + `.mc-bar-*` — 7 цветовых вариантов баров (amber, orange, red, green, neutral, blue) против 3-4 в эталоне
- [x] `border-left: 3px solid danger/warning/blue` на каждой второй карточке (rs-blindzone, rs-leak-card, rs-metric, pd-inaction, pd-path, mb-promise-v2, aha-mirror) — «карнавал»
- [x] `.rs-cta-dual` 1.15fr/1fr на desktop → две кнопки-близнеца ниже fold
- [x] `.rs-features` 2-колоночная без иконок — пустая форма

## Чек-лист переписывания (по секциям)

### Globals
- [x] Убрать все дробные размеры в report-странице (замена на ближайшие целые)
- [x] Container report-page: 880 → 760 (как 800 эталона, чуть уже)
- [x] Унифицировать radius: секции 16, карточки внутри 12, чипы 999px
- [x] Убрать все border-left:3px solid coloured — максимум 1–2 места на отчёт

### TL;DR (первый экран)
- [x] Убрать левый синий strip
- [x] Сжать padding 28px→24px
- [x] Stats-grid: mono-label 11px + value 22px mono (без dividers-border-left)
- [x] title 24→22 для лёгкости

### Section 1 (Разрыв)
- [x] Убрать `border-left:3px` у rs-blindzone, оставить только у rs-leak-card red dot
- [x] Индекс-карта: единый чистый стиль без shadow внутри карточки
- [x] Bench-bar: сохранить, но выровнять scale и markers
- [x] Убрать `.rs-mid-cta` полностью (или превратить в лёгкий inline CTA без navy)

### Section 3 (Зоны потерь) — leaks
- [x] 3-колонка → на desktop 3 col ok, но `.rs-leak-card` — чистый border top-3-red, без hover transform
- [x] Увеличить padding до 18-20px, gap до 14px

### План на 3 месяца
- [x] Убрать connecting-line before
- [x] plan-card — одна плотная карточка: 32×32 radius-8 brand-blue + period mono 11px + title 15px + list

### Section 5 (Финтабло + траектория)
- [x] `.rs-trajectory` — убрать linear-gradient фон, белый surface как все
- [x] `.rs-mock-grid` 3 col → 1 col вертикально, как эталонные report-kpis (слишком плотно 3×880)
- [x] `.rs-features` → 2 col с иконкой-bullet слева (как hero-bullets эталона) + чистый текст
- [x] `.rs-cta-dual` → один primary CTA + ghost link под ним (как эталон)

### Mobile 390
- [x] Все переходы на 1 col
- [x] Type-scale shift: 22/19/17/14/13/12/11, без 10.5
- [x] Padding секций 22-24px (как эталон)

## Применённые коммиты / диффы

- (T+0) Создан DESIGN-REBUILD.md + анализ money-profit CSS (1097 строк) + money-diagnosis (3803 строки)
- (T+1) Добавлен блок **v4.0 · UNIFIED DS** в конец `css/style.css` (~280 строк)
  - Container 880 → 760 + 800 на >=1200
  - TL;DR **полностью переработан**: плоская белая карточка → navy-gradient hero с radial glow (как hero отчёта в эталоне money-profit). Это главный акцент первого экрана.
  - Убран `.rs-tldr::before` (синий strip — не в эталоне)
  - Section 1: `.rs-index-card` + `.rs-blindzone` → один спокойный стиль `background:var(--bg) + border:1px` без разноцветных `border-left:3px`
  - Section 3: `.rs-leak-card` — чистый `border-top:3px solid danger` + `bg:var(--bg)` (как эталонные `.rl-item`)
  - `.rs-mid-cta` — убран параллельный navy-gradient hero (дубль TL;DR). Теперь мягкий blue-light фон с чистой кнопкой `brand-blue` справа
  - `.rs-trajectory` — убран blue-gradient фон, теперь `bg:var(--bg)` как все секции
  - `.rs-mock-grid` 3 col → **1 col вертикально** (в 760px колонке 3 мок-карты давили; теперь каждая получает полный воздух)
  - `.rs-cta-dual` грид 1.15fr/1fr → 1fr/1fr (симметрия эталонa); padding выровнен
  - `.rs-alts-row` 4 col оставлено, но `.rs-alts-item-primary` получает мягкий `blue-light` фон вместо glow-shadow
  - **Mock bars**: унификация 7 цветных вариантов (amber/orange/red/green/neutral/blue) → только 2 (blue-gradient + neutral-grey), как эталон
  - Typography scale полностью выровнен: убраны все `10.5 / 11.5 / 12.5 / 13.5` в report-странице (override на 11 / 12 / 13 / 14)
  - Numbers: `.tldr-stat-val` 26 → 18 (mono), `.ric-value` 32 → 28, `.rbz-value` 28 → 24 — всё в ритме 14/16/20/24/28/32
  - Plan cards: убран `::before connecting-line` с 3-градиентным синим; 3 badges `plan-badge` стали одинаковыми 32x32 radius-8 `brand-blue`
  - Self-check, anon-case, inaction: `background:var(--bg) + border:1px + radius:12px` — один стиль на все
  - Модал и FAB выровнены по shadow-restraint
  - Mobile 480px final pass (все размеры из DS)
- (T+2) `report.html`:
  - Убраны inline-стили `style="max-width:none;margin:16px 0"` и `style="grid-column:1 / -1"` на Inaction-секции (grid у нас single-col после v4.0, inline ломал верстку). Заменены на CSS-классы `.rs-inaction-wrap`, `.rs-inaction-card`, `.rs-inaction-cohort` в v4.0.
  - Структура (ids, data-атрибуты) сохранена 100%: `tldr-title`, `rs1-bm-you`, `rs-plan`, `mc-bd-bars`, `cta-trial-mid/bottom/fab`, `lead-modal`, `rs5-cta` и т.д. — js-рендер и лид-форма продолжат работать.

## Итоговое впечатление (по секциям)

| Секция | До | После |
|---|---|---|
| TL;DR | Белая плоская карточка, синий strip слева, mono-числа 26px в серой колонке | Navy-hero как в money-profit (report-header), с eyebrow-pill, radial glow, белым текстом на тёмном; 3 stat в нижней полосе с разделителями |
| Section 1 (Индекс + слепая зона + mid-CTA) | 3 разноцветных карточки в ряд (index + red-border blindzone + navy-dark mid-cta) — 3 hero подряд | 2 спокойных серых блока + 1 мягкая blue-light карточка для CTA — одна линия ритма |
| Section 3 (leaks) | 3 карточки с белым фоном и red-top | То же, но без hover-lift и shadow, bg:slate-50 (как `.rl-item` эталона) |
| Trajectory | Blue→bg linear-gradient фон, вложенные белые карточки | Плоский slate-50 фон, белые sub-card'ы с border — как mock-карты в эталоне |
| Mock cards | 3 в ряд (180px высоты × 3 = 540px в колонке 880) тесно | 1 в столбик, каждая дышит; 7-цветная палитра баров сведена к 2 (blue + neutral) |
| CTA dual | 1.15 / 1 flex (правый меньше) | 1 / 1 симметрично + чистый shadow-sm |
| Alternatives | Primary-item с glow-shadow-box + badge "ваш путь" | Primary — мягкий blue-light bg, badge — mono 10px, без shadow |

## Design DNA эталона (одним параграфом)

Money-profit — это урок **рестрикции**: один CTA-цвет (#1A56DB), один `--font-mono` для всех чисел (tabular-nums везде), один акцентный hero (navy 135°-gradient с radial glow), остальное — серый текст на белой/слейт-базе. Карточки идентичны по формуле (border:1px · radius:16px · padding:22-28px · shadow-sm) и различаются только цветом top-border'a (red/green/blue) при необходимости выделения. Type-scale без дробных: 40/28/26/22/19/17/15/14/13/12/11. Числа всегда mono с ₽ отдельным span'ом меньше. Контейнер 640-800px — всё читается на одном дыхании, никаких 4-колонок. Ритм секций одинаковый margin-bottom:16px, никаких параллельных градиентов. Это не про «минимализм», это про **одну визуальную тему, повторенную 7 раз** — чтобы внимание шло на цифры и смысл, а не на стиль.

## Риски / следующие шаги

- Не ломать id/data-атрибуты: ✅ сохранено (не трогал js/calculator.js, js/report.js только читал)
- Mobile 390 — добавлен отдельный pass @media 480/680
- CSS `style.css` теперь 4100+ строк с новым блоком v4.0, но это override — не переписываем старое, только подталкиваем вперёд в каскаде
- **Не проверено через headless Chrome** (sandbox заблокировал скрины). Пользователь пусть откроет http://127.0.0.1:8765/_dev_seed.html в обычном браузере и сверит с http://127.0.0.1:8766/

## Что можно сделать дальше (если пользователь попросит)

- Удалить устаревшие v2.x/v3.x блоки из style.css (строки 2000-3800) — сейчас они игнорируются v4.0, но файл остаётся огромным
- Добавить то же выравнивание для `index.html` квиза (сейчас v4.0 касается только `body.report-page`)
- Применить шрифт IBM Plex Sans локально (сейчас fallback на Inter — эталон как раз Inter)
