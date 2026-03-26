#!/bin/sh
set -eu

PRISMA_VERSION="5.14.0"

echo "Starting containers"
docker compose up -d --build

echo "Running Prisma migrations"
docker compose exec -T app npx "prisma@${PRISMA_VERSION}" migrate deploy

echo "Done"
