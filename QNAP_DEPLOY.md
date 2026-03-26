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

## Verification

After deploy:

```bash
docker compose ps
docker compose logs --tail=80 app
docker compose exec -T app npx prisma@5.14.0 migrate status
```
