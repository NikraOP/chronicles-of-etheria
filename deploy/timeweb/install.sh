#!/bin/bash
# Etheria friends + PvP API на Timeweb Cloud (Ubuntu).
# Запуск на сервере: bash install.sh
set -euo pipefail

API_HOST="${API_HOST:-5-42-103-145.sslip.io}"
APP_DIR="${APP_DIR:-/opt/etheria/app}"
REPO="${REPO:-https://github.com/NikraOP/chronicles-of-etheria.git}"
PORT="${PORT:-8790}"

echo "==> API host: https://${API_HOST}"
echo "==> App dir: ${APP_DIR}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null || [[ "$(node -v 2>/dev/null || echo v0)" < v22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

npm install -g pm2

mkdir -p "$(dirname "$APP_DIR")"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO" "$APP_DIR"
else
  cd "$APP_DIR" && git pull --ff-only
fi

cd "$APP_DIR"
npm install --omit=dev 2>/dev/null || npm install

export PORT
export FRIENDS_CORS="*"
pm2 delete etheria-api 2>/dev/null || true
pm2 start server/friends-api.mjs --name etheria-api
pm2 save

if ! pm2 startup systemd -u root --hp /root 2>/dev/null | grep -q "already"; then
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root
fi

NGX="/etc/nginx/sites-available/etheria-api"
cat > "$NGX" <<EOF
server {
    listen 80;
    server_name ${API_HOST};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf "$NGX" /etc/nginx/sites-enabled/etheria-api
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl enable nginx
systemctl reload nginx

if [[ ! -f "/etc/letsencrypt/live/${API_HOST}/fullchain.pem" ]]; then
  certbot --nginx -d "${API_HOST}" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect || {
    echo "WARN: certbot failed. Open ports 80/443 in Timeweb firewall, then run:"
    echo "  certbot --nginx -d ${API_HOST}"
  }
fi

sleep 1
curl -sf "http://127.0.0.1:${PORT}/health" && echo ""
curl -sfk "https://${API_HOST}/health" && echo "" || curl -sf "http://${API_HOST}/health" && echo ""

echo ""
echo "DONE. API: https://${API_HOST}"
echo "Set in js/config/friendsEnv.js: ETHERIA_FRIENDS_HTTP_API = 'https://${API_HOST}'"
echo "pm2 logs: pm2 logs etheria-api"
