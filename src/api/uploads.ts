export type PresignUploadRequest = {
  filename: string;
  contentType?: string;
};

export type PresignUploadResponse = {
  uploadId: string;
  url: string;
  s3Key: string;
};

export type UploadJob = {
  userId: string;
  uploadId: string;
  status: string;
  bucket: string;
  sourceKey: string;
  planKey: string | null;
  graphKey: string | null;
  buildId: string | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UploadStatusResponse = {
  uploadId: string;
  status: string;
  bucket: string;
  sourceKey: string;
  planKey: string | null;
  graphKey: string | null;
  buildId: string | null;
  lastError: string | null;
};

export type UploadArtifactInfo = {
  name: string;
  key: string;
  exists: boolean;
  required: boolean;
};

export type UploadArtifactsResponse = {
  uploadId: string;
  status: string;
  bucket: string;
  artifacts: UploadArtifactInfo[];
  allRequiredReady: boolean;
  graphReady: boolean;
};

export type ArtifactPresignResponse = {
  artifactName: string;
  key: string;
  url: string;
  expiresInSeconds: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8080";

function buildHeaders(accessToken: string): HeadersInit {
  if (!accessToken) {
    throw new Error("Missing access token for authenticated upload request.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function presignTerraformUpload(
  req: PresignUploadRequest,
  accessToken: string,
): Promise<PresignUploadResponse> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/presign`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Presign failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return (await res.json()) as PresignUploadResponse;
}

export async function completeTerraformUpload(
  uploadId: string,
  payload: { s3Key: string },
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Complete upload failed (${res.status}): ${text || res.statusText}`,
    );
  }
}

export async function getUploads(accessToken: string): Promise<UploadJob[]> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Get uploads failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return (await res.json()) as UploadJob[];
}

export async function getUpload(
  uploadId: string,
  accessToken: string,
): Promise<UploadStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/${uploadId}`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Get upload failed (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as UploadStatusResponse;
}

export async function deleteUpload(
  uploadId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/${uploadId}`, {
    method: "DELETE",
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Delete upload failed (${res.status}): ${text || res.statusText}`,
    );
  }
}

export async function getUploadArtifacts(
  uploadId: string,
  accessToken: string,
): Promise<UploadArtifactsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/uploads/${uploadId}/artifacts`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Get upload artifacts failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return (await res.json()) as UploadArtifactsResponse;
}

export async function getUploadGraph(
  uploadId: string,
  accessToken: string,
  view: "condensed" | "full" = "condensed",
): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/uploads/${uploadId}/graph?view=${view}`,
    {
      method: "GET",
      headers: buildHeaders(accessToken),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Get graph failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json() as Promise<unknown>;
}

export async function presignUploadArtifact(
  uploadId: string,
  artifactName: "parsed_iac" | "graph" | "graph_full" | "graph_condensed" | "stride",
  accessToken: string,
): Promise<ArtifactPresignResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/uploads/${uploadId}/artifacts/${artifactName}/presign`,
    {
      method: "GET",
      headers: buildHeaders(accessToken),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Presign artifact failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return (await res.json()) as ArtifactPresignResponse;
}

export async function fetchPresignedJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Artifact fetch failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return (await res.json()) as T;
}

export async function uploadFileToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
  contentType?: string,
): Promise<void> {
  const resolvedContentType =
    contentType || file.type || "application/octet-stream";

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", resolvedContentType);

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
    throw new Error(
      `Get current user failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return res.json();
}
