import { BACKEND_URL as BACKEND_URL_ENV } from "$app/env/private";

export const BACKEND_URL = BACKEND_URL_ENV || "http://localhost:3000";

export async function getDemoMode() {
  const res = await fetch(`${BACKEND_URL}/api/v1/demo-mode`, {});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
