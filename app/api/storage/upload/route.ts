import { randomUUID } from "node:crypto";

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

function isValidPhotoType(value: string) {
  return value === "before" || value === "after" || value === "detail";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMinioConfigured()) {
    return NextResponse.json({ error: "MinIO yapılandırması eksik." }, { status: 500 });
  }

  const formData = await request.formData();
  const jobId = String(formData.get("jobId") ?? "").trim();
  const photoType = String(formData.get("photoType") ?? "").trim();
  const file = formData.get("file");

  if (!jobId) {
    return NextResponse.json({ error: "jobId zorunludur." }, { status: 400 });
  }

  if (!isValidPhotoType(photoType)) {
    return NextResponse.json({ error: "Geçersiz fotoğraf tipi." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : null;

  if (!extension) {
    return NextResponse.json({ error: "Dosya uzantısı gerekli." }, { status: 400 });
  }

  await ensureJobPhotosBucket();

  const objectName = `${jobId}/${photoType}-${Date.now()}-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const minio = createMinioClient();

  await minio.putObject(JOB_PHOTOS_BUCKET, objectName, buffer, buffer.length, {
    "Content-Type": file.type || "application/octet-stream",
  });

  return NextResponse.json({
    publicUrl: buildStorageUrl(objectName),
  });
}
