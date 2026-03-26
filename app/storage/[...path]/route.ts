import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import {
  createMinioClient,
  ensureJobPhotosBucket,
  isMinioConfigured,
  JOB_PHOTOS_BUCKET,
} from "@/lib/minio";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  if (!isMinioConfigured()) {
    return new NextResponse("Storage unavailable", { status: 503 });
  }

  const objectName = params.path.join("/");

  if (!objectName) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await ensureJobPhotosBucket();

    const minio = createMinioClient();
    const stat = await minio.statObject(JOB_PHOTOS_BUCKET, objectName);
    const stream = await minio.getObject(JOB_PHOTOS_BUCKET, objectName);

    return new Response(Readable.toWeb(stream as unknown as Readable) as BodyInit, {
      headers: {
        "content-type":
          stat.metaData?.["content-type"] ??
          stat.metaData?.["Content-Type"] ??
          "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
