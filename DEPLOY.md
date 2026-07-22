# Инструкция по круглосуточному запуску LeadPlay (24/7 без ПК)

Чтобы бот и автоматический поиск заказов работали 24 часа в сутки 7 дней в неделю без вашего компьютера, приложение нужно разместить на облачном сервере.

---

## Вариант 1. Бесплатный запуск на Render.com (Самый простой, 3 минуты)

[Render.com](https://render.com) предоставляет бесплатный веб-хостинг с авто-поддержкой **HTTPS** (что требовалось для Telegram Mini App).

### Шаги:
1. Создайте репозиторий на [GitHub](https://github.com) и загрузите в него содержимое папки `leadplay-telegram-miniapp`.
2. Зарегистрируйтесь на **[Render.com](https://render.com)**.
3. Нажмите **New +** ➔ **Web Service**.
4. Подключите ваш GitHub-репозиторий.
5. Настройки укажите следующие:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. В разделе **Environment Variables** добавьте:
   - `TELEGRAM_BOT_TOKEN` = `7855491958:AAG8Bt1XtrhnXjvOR-eFaqAqxMoBEaB1q6A`
   - `MINI_APP_URL` = `https://<ВАШЕ_НАЗВАНИЕ>.onrender.com`
7. Нажмите **Create Web Service**.

После развёртывания скопируйте выданный HTTPS-адрес (например, `https://leadplay.onrender.com`) и укажите его в `@BotFather` (или в приложении). Сервер будет работать 24/7 непрерывно!

---

## Вариант 2. Запуск на собственном VPS (Timeweb / Reg.ru / Hetzner / DigitalOcean)

Если у вас есть VPS-сервер (Ubuntu/Debian):

1. Загрузите файлы проекта на сервер.
2. Запустите в Docker одной командой:
   ```bash
   docker-compose up -d --build
   ```
3. Сервер сам перезапустится при любых сбоях или перезагрузках VPS.
