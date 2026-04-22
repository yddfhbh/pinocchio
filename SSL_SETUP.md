# SSL Setup

This project can issue and serve a Let's Encrypt certificate for the public domain that points at the server.

## 1. DNS

Point the domain's `A` record at the server IP.

Example:

- `pusanpino.kro.kr -> 134.185.101.15`

## 2. Open ports

Allow inbound TCP traffic on:

- `80`
- `443`

If you are using Oracle Cloud, add both ports to the VM's ingress rules.

## 3. Server `.env`

Set these values on the server:

```env
APP_DOMAIN=pusanpino.kro.kr
APP_DOMAIN_ALIASES=
LETSENCRYPT_EMAIL=you@example.com
VITE_ALLOWED_HOSTS=pusanpino.kro.kr,.pusanpino.kro.kr,localhost,127.0.0.1
```

If you also want `www`, set:

```env
APP_DOMAIN_ALIASES=www.pusanpino.kro.kr
VITE_ALLOWED_HOSTS=pusanpino.kro.kr,.pusanpino.kro.kr,localhost,127.0.0.1
```

## 4. Deploy

```bash
git pull origin main
docker compose up -d --force-recreate web api nginx
```

## 5. Issue the certificate

```bash
bash ./scripts/issue-letsencrypt-cert.sh
```

The script starts `nginx`, requests the certificate through the shared webroot, and recreates `nginx` with the TLS config enabled.

## 6. Renew later

```bash
bash ./scripts/renew-letsencrypt-cert.sh
```
