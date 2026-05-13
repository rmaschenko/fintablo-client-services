# DEPLOYMENT — деплой и DNS

Воронка деплоится в **двух конфигурациях**:
- **Демо** на GitHub Pages — для прогона UX без PHP-бэка
- **Прод** на FTP-инфраструктуре Финтабло на домене `diagnostika.fintablo.ru` — с PHP и интеграцией amoCRM

---

## 1. Демо-деплой (GitHub Pages)

### URL
[https://rmaschenko.github.io/fintablo-client-services/diagnostika-growth/](https://rmaschenko.github.io/fintablo-client-services/diagnostika-growth/)

### Как работает
- `git push origin main` → GitHub Pages автоматически собирает Pages из ветки `main` (корень репо `rmaschenko/fintablo-client-services`)
- PHP-бэка нет → [lead.js](quiz/js/lead.js) детектирует `*.github.io` через `isDemoHost()` и **эмулирует успешный POST в консоли** (без реальной отправки в amoCRM)
- Q.Метрика 61131877 работает (это JavaScript)
- UTM-параметры захватываются нормально

### Что НЕ работает на демо
- Реальная отправка лида в amoCRM
- CSV-бэкап (не пишется без PHP)
- Сегментные goals в Я.Директе работают, но **трафика нет** (демо не для рекламы)

### Когда использовать демо
- Прогнать UX перед прод-деплоем
- Показать заказчику/команде
- Тестирование 4 маршрутов вручную

---

## 2. Прод-деплой (FTP Финтабло)

### Шаг 1. Подготовить артефакт

```bash
cd diagnostika-growth/
rsync -av --exclude=".context" --exclude="*.md" --exclude=".DS_Store" \
  ./ /tmp/dg-deploy/
ls -la /tmp/dg-deploy/   # проверить что нет .md и .context/
```

В прод НЕ деплоятся: `.context/`, все `*.md` (документация), скрытые файлы.

### Шаг 2. Загрузить на FTP

⚠️ **ВНИМАНИЕ:** действует [feedback_fintablo_ftp.md](.../memory/feedback_fintablo_ftp.md) — никогда не деплоить FTP без явного согласования с Романом. Команда ниже — **не запускать автоматически**, дождаться явного «делай».

```bash
# Когда согласовано:
lftp ftp://<host> -u <user>,<password> -e "
  set ftp:ssl-allow no;
  mirror -R --delete --verbose /tmp/dg-deploy/ /diagnostika.fintablo.ru/;
  quit
"
```

### Шаг 3. Настроить `.env` для amoCRM

В корне FTP-папки выше `quiz/api/lead.php` (т.е. `/diagnostika.fintablo.ru/.env`):

```env
AMOCRM_BASE_URL=https://fintablo.amocrm.ru
AMOCRM_LONG_TOKEN=<long-lived token>
AMOCRM_PIPELINE_ID=5278171
AMOCRM_STATUS_ID=47065159
AMOCRM_RESPONSIBLE_USER_ID=<user_id>
```

⚠️ `.env` **не коммитить в git**. Должен быть в `.gitignore` репо `fintablo-client-services`.

### Шаг 4. Создать папку CSV-бэкапов

```bash
# На FTP-сервере:
mkdir -p /diagnostika.fintablo.ru/quiz/api/leads/
chmod 755 /diagnostika.fintablo.ru/quiz/api/leads/
chown www-data:www-data /diagnostika.fintablo.ru/quiz/api/leads/  # если nginx/apache
```

`api/lead.php` пишет туда CSV-файлы вида `fin_diagnostics_2026-05.csv` с UTF-8 BOM и `;` разделителем.

---

## 3. DNS

### Текущее состояние (2026-05-07)
DNS на `diagnostika.fintablo.ru` **не настроен** — отложено до согласования.

### Что нужно сделать
1. В DNS-зоне `fintablo.ru` создать A-запись или CNAME:
   - **A** `diagnostika` → IP сервера FTP-инфраструктуры
   - или **CNAME** `diagnostika` → `<сервер>.fintablo.ru`
2. TTL: 3600 (1 час) на старте, потом можно увеличить
3. Проверить: `dig diagnostika.fintablo.ru`
4. SSL/TLS: Let's Encrypt через `certbot` или Cloudflare

### HTTPS
Финтабло использует Let's Encrypt с автообновлением. После настройки DNS сертификат выпускается автоматически (если на сервере настроен certbot или admin panel).

---

## 4. Проверка после деплоя

### Smoke-test (5 минут)

```bash
# 1. Главная отдаётся
curl -sI https://diagnostika.fintablo.ru/ | head -1
# Ожидаем: HTTP/2 200

# 2. Квиз доступен
curl -sI https://diagnostika.fintablo.ru/quiz/ | head -1
# Ожидаем: HTTP/2 200

# 3. PHP работает
curl -X POST https://diagnostika.fintablo.ru/quiz/api/lead.php -H "Content-Type: application/json" -d '{}' | head -1
# Ожидаем JSON ошибку: {"error":"name and phone required"}
# Это значит PHP работает, валидация срабатывает.

# 4. Я.Метрика подгружается
curl -s https://diagnostika.fintablo.ru/quiz/ | grep -c "mc.yandex.ru/metrika"
# Ожидаем: 1+

# 5. Финтабло-counter подгружается
curl -s https://diagnostika.fintablo.ru/quiz/ | grep -c "analyst.fintablo.ru"
# Ожидаем: 1+
```

### Полный тест воронки

См. [TESTING.md](TESTING.md) — там подробный сценарий ручной прогонки 4 маршрутов.

### Тест отправки реального лида

1. Пройти квиз с ответами `owner / project / 120 / mature / margin_blind / yes_cfo` → попадаем в `hot_icp`
2. Заполнить форму валидным телефоном/email
3. Отметить чекбокс согласия
4. Нажать «Записаться на встречу»
5. Проверить:
   - Браузер → `thankyou.html?route=hot_icp` (200 OK)
   - amoCRM → новая сделка в pipeline 5278171, статус 47065159
   - На сервере → `quiz/api/leads/fin_diagnostics_2026-05.csv` пополнен новой строкой

---

## 5. Rollback

Если что-то сломалось после деплоя:

```bash
# Откатить на предыдущий коммит main
git log --oneline -5  # найти sha рабочего состояния
git checkout <last_good_sha>
# Пересобрать /tmp/dg-deploy/ и залить заново
```

GitHub Pages: откат через `git revert HEAD && git push` — Pages пересоберётся автоматически за 1-2 минуты.

---

## 6. Обновления

### Минорные правки (тексты, стили)
1. Поменять файлы локально
2. Прогнать [TESTING.md](TESTING.md) → Smoke-test раздел
3. `git push origin main` → GitHub Pages обновится → проверить демо
4. После согласования — деплой на FTP

### Маршрутизация / новые маршруты
1. Поменять [calculator.js](quiz/js/calculator.js) → `classifyRoute` + `getAntiSubtype`
2. Добавить рендер в [report.js](quiz/js/report.js)
3. Добавить пиксельные events в [ANALYTICS.md](ANALYTICS.md)
4. Обновить [ROUTING.md](ROUTING.md) — таблицу маршрутов
5. Прогнать полный сценарий из [TESTING.md](TESTING.md)
6. После согласования — деплой

### Шаблоны
Если поменялись имена / папка переехала — см. [TEMPLATES.md → Что нужно делать при изменениях](TEMPLATES.md). URL генерируются автоматически из `PUBLIC_KEY` + имени файла.

---

## 7. Зависимости и совместимость

| Компонент | Минимальная версия | Замечание |
|---|---|---|
| PHP | 7.4+ | Используется `declare(strict_types=1)`, `??` |
| Браузер | Chrome 90+, Safari 14+, Firefox 88+ | ES6 (const, arrow), template literals, fetch, AbortController |
| Я.Метрика | актуальная | Передача params в reachGoal — поддерживается давно |
| amoCRM | API v4 | `api/v4/leads/complex` |

Никаких внешних библиотек на JS — только нативное API.
