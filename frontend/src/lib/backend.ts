import { env } from "$env/dynamic/private";

export const BACKEND_URL = env.BACKEND_URL || "http://localhost:3000";

export const SESSION_COOKIE = "invio_session";
export const DEFAULT_SESSION_MAX_AGE = 3600;

async function buildBackendError(res: Response): Promise<Error> {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (typeof body?.details === "string" && body.details.trim()) {
      msg = body.details;
    } else if (typeof body?.error === "string" && body.error.trim()) {
      msg = body.error;
    }
  } catch {
    // Ignore non-JSON responses and keep status text fallback.
  }
  return new Error(msg);
}

export async function backendGet(path: string, authHeader: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw await buildBackendError(res);
  return await res.json();
}

export async function backendPost(
  path: string,
  authHeader: string | null,
  body?: unknown,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await buildBackendError(res);
  return await res.json();
}

export async function backendPostFormData(
  path: string,
  authHeader: string | null,
  body: FormData,
) {
  const headers: Record<string, string> = {};
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) throw await buildBackendError(res);
  return await res.json();
}

export async function backendDelete(path: string, authHeader: string | null) {
  const headers: Record<string, string> = {};
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw await buildBackendError(res);
  return await res.json();
}

export async function backendPut(
  path: string,
  authHeader: string | null,
  body?: unknown,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await buildBackendError(res);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
