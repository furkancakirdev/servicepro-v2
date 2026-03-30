# ServicePRO Deploy Guide

## Primary Server

Current production target:

```text
Host: 192.168.12.11
App: http://192.168.12.11:3000
MinIO Console: http://192.168.12.11:9001
Project Dir: /home/serviceproadmin/apps/ServicePRO
User: serviceproadmin
```

Primary workflow is now server-first. Code changes should be synced directly to this server and kept current there.

## Required Environment

Before running `bootstrap-qnap-prod-safe.sh`, make sure the production `.env` includes:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `MINIO_*`
- `DB_PASSWORD`
- `APP_URL`
- `APP_DOMAIN`

`docker-compose.yml` uses `APP_DOMAIN` for the Caddy reverse proxy and `AUTH_URL` / `APP_URL` should point to the same public HTTPS origin.

## Default Rule

For this repository, the expected end-of-task workflow is:

1. Run local verification (`test`, `lint`, `build`) as needed for the change.
2. Connect to the production environment through the operator-provided Sophos/SSH access.
3. Deploy on the server with the safe live-data script unless a demo or fresh install is explicitly requested.
4. Run the post-deploy verification commands and confirm that the app is reachable.

Credentials must not be committed to the repository. Use the operator-provided credentials outside the repo when connecting.

## Scripts

Safe live-data deploy:

```bash
cd /home/serviceproadmin/apps/ServicePRO
sh bootstrap-qnap-prod-safe.sh
```

Demo / fresh install deploy:

```bash
cd /home/serviceproadmin/apps/ServicePRO
sh bootstrap-qnap.sh
```

These scripts do the following:

1. `docker compose up -d --build`
2. `docker compose exec -T app npx prisma@5.14.0 migrate deploy`
3. Demo script only: `docker compose exec -T app npm run db:seed`

## Important Notes

- `npm run db:seed` overwrites real data with sample data. Never run it on the live database.
- Prisma migrations on this server were baselined on `2026-03-26`, so `migrate deploy` now works cleanly against the existing production database.
- The deploy scripts pin Prisma to `5.14.0` to avoid `npx` pulling Prisma 7 and breaking migration commands.
- Reverse proxy config lives in [infra/Caddyfile](./infra/Caddyfile); `docker-compose.yml` mounts that file into the `caddy` service.
- PWA installability requires HTTPS. Raw `http://192.168.12.11:3000` is useful for debugging, but browsers will not register the service worker there as an installable app.

## Verification

After deploy:

```bash
docker compose ps
docker compose logs --tail=80 app
docker compose exec -T app npx prisma@5.14.0 migrate status
```
