import { NextResponse } from "next/server";

import { auth } from "@/lib/next-auth";
import {
  buildStorageUrl,
  createMinioClient,
  ensureJobPhotosBucket,
  isMinioConfigured,
  JOB_PHOTOS_BUCKET,
} from "@/lib/minio";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMinioConfigured()) {
    return NextResponse.json({ urls: [] });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId")?.trim();

  if (!jobId) {
    return NextResponse.json({ urls: [] });
  }

  await ensureJobPhotosBucket();

  const minio = createMinioClient();
  const objectNames: string[] = [];
  const stream = minio.listObjectsV2(JOB_PHOTOS_BUCKET, `${jobId}/`, true);

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (item) => {
      if (item.name) {
        objectNames.push(item.name);
      }
    });
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  objectNames.sort();

  return NextResponse.json({
    urls: objectNames.map((objectName) => buildStorageUrl(objectName)),
  });
}
