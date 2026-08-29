"use client";

// Image upload via the existing uploads lambda (same flow as godmode):
// presigned URL from POST /uploads/presigned-url (cookie auth), then a
// direct PUT to S3. Returns the public URL to store on the record.

import { apiBase } from "@/lib/apiBase";

const BASE = apiBase();
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pick an image file (PNG or JPG).");
  if (file.size > MAX_BYTES) throw new Error("Image too large. 5MB is the limit.");

  // /api prefix: CloudFront on bndy.live only forwards /api/* and /auth/*.
  // Backend serves both /uploads/presigned-url (legacy) and /api/uploads/presigned-url.
  const res = await fetch(`${BASE}/api/uploads/presigned-url`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, uploadType: "avatar", fileSize: file.size }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Upload failed (${res.status}).`);
  }
  const { uploadUrl, publicUrl } = (await res.json()) as { uploadUrl: string; publicUrl: string };

  const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
  return publicUrl;
}
