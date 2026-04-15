# money-diagnosis · «Диагностика финансового учёта»

10-шаговый квиз-микросервис Финтабло с промежуточным AHA-экраном, гейтом контакта после AHA и персональным отчётом из 5 секций. Целевая аудитория — собственники и финансовые директора проектного бизнеса от 60 млн ₽/год.

**Прод (целевой URL):** `fintablo.ru/tools/diag/financial/`

## Структура

- `index.html` — квиз (10 шагов) + гейт контакта
- `report.html` — полный отчёт (5 секций), режим превью/полный
- `thankyou.html` — страница после отправки контакта
- `css/style.css` — стили, mobile-first
- `js/storage.js` — localStorage (TTL 48ч) + UTM sessionStorage
- `js/calculator.js` — 14 метрик, классификация профиля
- `js/quiz.js` — навигация по STEP_ORDER, валидация, инсайты
- `js/report.js` — рендер отчёта
- `js/lead.js` — отправка формы, редирект
- `api/lead.php` — CSV backup + AmoCRM
- `fonts/` — IBM Plex Sans/Mono + Literata (локально)

## Локальный запуск

```bash
cd money-diagnosis
python3 -m http.server 8765
# → http://localhost:8765
```

Для `api/lead.php` нужен PHP-сервер:
```bash
php -S localhost:8765
```

Подробный контекст — в [CONTEXT.md](./CONTEXT.md). ТЗ — в [TZ.md](./TZ.md).
