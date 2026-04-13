export interface UserProfile {
  userId: string;
  email: string;
  externalId: string;
  roleArn: string | null;
  awsConnected: boolean;
  appLensAccountId: string;
}

export interface VerifyRoleResponse {
  success: boolean;
  message: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8080";

function buildHeaders(accessToken: string): HeadersInit {
  if (!accessToken) {
    throw new Error("Missing access token for authenticated request.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getMe(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Get user profile failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json() as Promise<UserProfile>;
}

export async function verifyRole(
  roleArn: string,
  accessToken: string,
): Promise<VerifyRoleResponse> {
  const res = await fetch(`${API_BASE_URL}/api/aws/verify-role`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ roleArn }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Verify role failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json() as Promise<VerifyRoleResponse>;
}
