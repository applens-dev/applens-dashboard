export type PresignUploadRequest = {
  filename: string;
  contentType?: string;
};

export type PresignUploadResponse = {
  uploadId: string;
  url: string;
  s3Key: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8080";

function buildHeaders(accessToken?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function presignTerraformUpload(
  req: PresignUploadRequest,
  accessToken?: string,
): Promise<PresignUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/presign`, {
    method: "POST",
    headers: buildHeaders(accessToken),
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
  onProgress?: (percent: number) => void,
): Promise<void> {
  const contentType = file.type || "application/octet-stream";

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(
          new Error(
            `S3 upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error("S3 upload failed: network error"));
    };

    xhr.send(file);
  });
}

export async function getCurrentUser(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Get current user failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}