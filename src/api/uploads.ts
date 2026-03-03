export type PresignUploadRequest = {
  filename: string;
  contentType?: string;
};

export type PresignUploadResponse = {
  url: string;
  s3Key: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8080";

export async function presignTerraformUpload(
  req: PresignUploadRequest,
): Promise<PresignUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Presign failed (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as PresignUploadResponse;
}

export async function uploadFileToPresignedUrl(
  url: string,
  file: File,
): Promise<void> {
  // S3 presigned PUT expects the same Content-Type as used in the signature.
  const contentType = file.type || "application/octet-stream";

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 upload failed (${res.status}): ${text || res.statusText}`);
  }
}
