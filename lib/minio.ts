import "server-only";

import * as Minio from "minio";

export const JOB_PHOTOS_BUCKET = "job-photos";

let bucketReadyPromise: Promise<void> | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createMinioClient() {
  return new Minio.Client({
    endPoint: getRequiredEnv("MINIO_ENDPOINT"),
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: getRequiredEnv("MINIO_ACCESS_KEY"),
    secretKey: getRequiredEnv("MINIO_SECRET_KEY"),
  });
}

export function isMinioConfigured() {
  return Boolean(
    process.env.MINIO_ENDPOINT &&
      process.env.MINIO_ACCESS_KEY &&
      process.env.MINIO_SECRET_KEY
  );
}

export function buildStorageUrl(objectName: string) {
  const baseUrl = (process.env.MINIO_PUBLIC_URL ?? "/storage").replace(/\/$/, "");
  return `${baseUrl}/${objectName}`;
}

export async function ensureJobPhotosBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const minio = createMinioClient();
      const exists = await minio.bucketExists(JOB_PHOTOS_BUCKET);

      if (!exists) {
        await minio.makeBucket(JOB_PHOTOS_BUCKET);
      }
    })().catch((error) => {
      bucketReadyPromise = null;
      throw error;
    });
  }

  await bucketReadyPromise;
}
