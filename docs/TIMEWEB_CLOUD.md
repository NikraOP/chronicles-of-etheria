# API друзей и PvP на Timeweb Cloud

Игра остаётся на **GitHub Pages**. На Timeweb поднимается только **Node API** (`server/friends-api.mjs`) — без засыпания, как на Render free.

## 1. Создать сервер в Timeweb

1. [timeweb.cloud](https://timeweb.cloud) → **Облачные серверы** → **Создать**.
2. **ОС:** Ubuntu 22.04 или 24.04.
3. **Тариф:** минимальный (1 vCPU, 1 GB RAM достаточно).
4. **SSH-ключ** — добавьте свой публичный ключ (рекомендуется). Пароль root сохраните.
5. Создайте сервер, дождитесь статуса **Запущен**.
6. Запишите **публичный IP** (например `185.x.x.x`).

В **Сеть / Firewall** откройте входящие порты:

- **22** (SSH)
- **80** и **443** (если будет домен и HTTPS)
- либо только **8790** (если без nginx — не рекомендуется для продакшена)

## 2. Подключиться по SSH

Windows (PowerShell):

```powershell
ssh root@5.42.103.145
```

### Быстрая установка одной командой

На сервере (консоль Timeweb или SSH):

```bash
curl -fsSL https://raw.githubusercontent.com/NikraOP/chronicles-of-etheria/main/deploy/timeweb/install.sh | bash
```

API будет на **https://5-42-103-145.sslip.io** (бесплатный DNS на ваш IP, нужны открытые порты **80** и **443**).

## 3. Установить Node.js 22

На сервере:

```bash
apt update && apt install -y git curl nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # v22.x
npm -v
npm install -g pm2
```

## 4. Склонировать проект

```bash
mkdir -p /opt/etheria
cd /opt/etheria
git clone https://github.com/NikraOP/chronicles-of-etheria.git app
cd app
npm install
```

Дальнейшие обновления:

```bash
cd /opt/etheria/app && git pull && pm2 restart etheria-api
```

## 5. Запустить API через PM2

```bash
cd /opt/etheria/app
export PORT=8790
export FRIENDS_CORS="*"
pm2 start server/friends-api.mjs --name etheria-api
pm2 save
pm2 startup
# выполните команду, которую выведет pm2 startup (с sudo)
```

Проверка на сервере:

```bash
curl -s http://127.0.0.1:8790/health
# {"ok":true,"service":"etheria-friends-api"}
```

Данные друзей и PvP-комнат: `/opt/etheria/app/server/data/friends-store/` — делайте бэкап этой папки.

## 6. HTTPS (рекомендуется)

### Вариант A — свой поддомен (лучше)

1. В DNS домена добавьте **A-запись**: `api.ваш-домен.ru` → IP сервера Timeweb.
2. Скопируйте конфиг nginx:

```bash
cp /opt/etheria/app/deploy/timeweb/nginx-etheria-api.conf /etc/nginx/sites-available/etheria-api
nano /etc/nginx/sites-available/etheria-api
# замените api.example.com на ваш поддомен
ln -sf /etc/nginx/sites-available/etheria-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.ваш-домен.ru
```

3. API будет доступен: `https://api.ваш-домен.ru/health`

### Вариант B — только IP (без HTTPS)

В `js/config/friendsEnv.js` можно указать `http://ВАШ_IP:8790`, но **браузер с GitHub Pages (HTTPS) заблокирует HTTP** — mixed content. Для игроков нужен **HTTPS**, поэтому используйте домен + certbot.

## 7. Прописать URL в игре

Отредактируйте `js/config/friendsEnv.js`:

```javascript
global.ETHERIA_FRIENDS_HTTP_API = onGitHubPages
    ? 'https://api.ваш-домен.ru'   // ваш Timeweb API
    : 'http://localhost:8790';
```

Закоммитьте и запушьте в `main` — GitHub Pages обновится за 1–3 минуты.

## 8. Проверка

С ПК:

```bash
curl https://api.ваш-домен.ru/health
```

В игре: **Друзья** → **Синхронизировать**, **PvP** → облако → создать комнату.

Тесты против вашего API:

```bash
FRIENDS_TEST_URL=https://api.ваш-домен.ru npm run test:friends
FRIENDS_TEST_URL=https://api.ваш-домен.ru npm run test:pvp-cloud
```

## Частые проблемы

| Симптом | Решение |
|--------|---------|
| `Connection refused` | `pm2 status`, `pm2 logs etheria-api`, порт 8790 |
| Mixed content в браузере | Нужен HTTPS (nginx + certbot), не голый HTTP |
| CORS | На сервере `FRIENDS_CORS=*` или список: `https://nikraop.github.io` |
| После `git pull` API старый | `pm2 restart etheria-api` |

Render можно отключить — игра будет ходить только на Timeweb.
