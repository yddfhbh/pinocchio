#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

APP_DOMAIN="${APP_DOMAIN:-}"
APP_DOMAIN_ALIASES_RAW="${APP_DOMAIN_ALIASES:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ -z "$APP_DOMAIN" ]]; then
  echo "APP_DOMAIN is required. Set it in .env first."
  exit 1
fi

if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
  echo "LETSENCRYPT_EMAIL is required. Set it in .env first."
  exit 1
fi

ALIASES=()
if [[ -n "$APP_DOMAIN_ALIASES_RAW" ]]; then
  IFS=',' read -r -a ALIASES <<< "$APP_DOMAIN_ALIASES_RAW"
fi

DOMAIN_ARGS=(-d "$APP_DOMAIN")
for alias in "${ALIASES[@]}"; do
  alias="$(echo "$alias" | xargs)"
  if [[ -n "$alias" ]]; then
    DOMAIN_ARGS+=(-d "$alias")
  fi
done

docker compose up -d nginx
docker compose run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  "${DOMAIN_ARGS[@]}"
docker compose up -d --force-recreate nginx
