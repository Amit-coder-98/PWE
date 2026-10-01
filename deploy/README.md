# Lightsail production deployment

This package runs the React site and FastAPI on one Lightsail instance. Caddy serves the site over HTTPS and forwards `/api` to FastAPI. MongoDB Atlas and the private R2 bucket remain external. Do not use the local development `.env` on the server without reviewing every value.

## Before first start

1. Create an Ubuntu Lightsail instance and attach a **static IP**. Allow TCP 80 and 443; allow SSH (TCP 22) only from trusted administrator IPs. Allow UDP 443 if HTTP/3 is wanted. Point the chosen domain's `A` record at the static IP.
2. In Atlas **Network Access**, allow that static IP. Back up and migrate the existing database before starting this stack. The new Atlas database starts empty; the old deployment's users, customers, and orders do not move automatically. Verify source and destination counts. Keep the old deployment available until the new site passes acceptance checks.
3. In R2 bucket **Settings → CORS**, allow the exact production origin `https://YOUR_DOMAIN` with `GET`, `PUT`, and `HEAD`, and allowed headers `*`. Keep public bucket access disabled. Use the private bucket's read/write object credentials only on the backend.
4. On the server, clone this repository. Copy root `.env.example` to root `.env` and set `APP_DOMAIN` to the domain **without** `https://`. Leave `frontend/.env.local` absent (or set `VITE_API_URL` empty) so the browser uses same-origin `/api`. Create `backend/.env` from `backend/.env.example` with the migrated Atlas URL/database, unique `JWT_SECRET` and `CRON_SECRET`, and R2 credentials. Never commit either `.env` file. The Compose file forces `APP_ENV=production`, `COOKIE_SECURE=true`, and `FRONTEND_ORIGINS=https://APP_DOMAIN`.
5. Install Docker Engine and the Compose plugin using the official Docker Ubuntu instructions. On a 1 GB instance, the frontend image build may need temporary swap or an image built on a larger machine; do not assume build memory is sufficient.

## Start and verify

After migration and DNS are ready, run from the repository root:

```sh
docker compose up -d --build
docker compose ps
curl -fsS https://YOUR_DOMAIN/api/health
```

The health response must report `status: ok`, `database: atlas`, and `storage: r2`. This storage field checks configuration, not a live R2 operation; test one authenticated image upload and view separately. Test admin and each staff login, order creation, and workflow updates before directing real users to the new site. Do not run `bootstrap_admin` on the migrated database, because the users already exist.

## Daily artwork cleanup

The Vercel cron will not run on Lightsail. After the site works, install this root crontab entry on the instance (adjust the repository path):

```cron
0 2 * * * cd /opt/prabodhan-bag-demo && /usr/bin/docker compose exec -T api python -m app.cleanup_job >> /var/log/prabodhan-cleanup.log 2>&1
```

Run `docker compose exec -T api python -m app.cleanup_job` once to confirm the secret and endpoint work. Monitor the log and retain independent Atlas and R2 backups. An R2 bucket is file storage, not a database backup.

## Rollback

Do not discard the prior Vercel deployment or original Atlas data during cutover. If checks fail, point users back to the old site. If users have written data to the new site, reconcile those writes before any rollback; switching DNS alone does not merge databases.
