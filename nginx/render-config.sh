#!/bin/sh
set -eu

APP_DOMAIN="${APP_DOMAIN:-_}"
APP_DOMAIN_ALIASES_RAW="${APP_DOMAIN_ALIASES:-}"
APP_DOMAIN_ALIASES="$(printf '%s' "$APP_DOMAIN_ALIASES_RAW" | tr ',' ' ')"
SERVER_NAMES="$APP_DOMAIN"

if [ -n "$APP_DOMAIN_ALIASES" ]; then
  SERVER_NAMES="$SERVER_NAMES $APP_DOMAIN_ALIASES"
fi

CERT_DIR="/etc/letsencrypt/live/$APP_DOMAIN"
FULLCHAIN_PATH="$CERT_DIR/fullchain.pem"
PRIVKEY_PATH="$CERT_DIR/privkey.pem"
HAS_SSL=0

if [ "$APP_DOMAIN" != "_" ] && [ -f "$FULLCHAIN_PATH" ] && [ -f "$PRIVKEY_PATH" ]; then
  HAS_SSL=1
fi

if [ "$HAS_SSL" -eq 1 ]; then
  cat > /etc/nginx/conf.d/default.conf <<EOF
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  '' close;
}

resolver 127.0.0.11 valid=10s ipv6=off;

server {
  listen 80;
  server_name $SERVER_NAMES;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 301 https://\$host\$request_uri;
  }
}

server {
  listen 443 ssl;
  server_name $SERVER_NAMES;

  ssl_certificate $FULLCHAIN_PATH;
  ssl_certificate_key $PRIVKEY_PATH;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_protocols TLSv1.2 TLSv1.3;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  # Never expose project secrets or VCS metadata through the proxy.
  location ~ /\.(?!well-known/) {
    return 404;
  }

  location = /api {
    set \$api_upstream http://api:3000;
    proxy_pass \$api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /api/ {
    set \$api_upstream http://api:3000;
    proxy_pass \$api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location / {
    set \$web_upstream http://web:5173;
    proxy_pass \$web_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
}
EOF
else
  cat > /etc/nginx/conf.d/default.conf <<EOF
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  '' close;
}

resolver 127.0.0.11 valid=10s ipv6=off;

server {
  listen 80;
  server_name $SERVER_NAMES;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  # Never expose project secrets or VCS metadata through the proxy.
  location ~ /\.(?!well-known/) {
    return 404;
  }

  location = /api {
    set \$api_upstream http://api:3000;
    proxy_pass \$api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /api/ {
    set \$api_upstream http://api:3000;
    proxy_pass \$api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location / {
    set \$web_upstream http://web:5173;
    proxy_pass \$web_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
}
EOF
fi
