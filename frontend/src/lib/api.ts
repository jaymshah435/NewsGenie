// Calls the FastAPI backend. Adds the login token and turns errors into readable messages.

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "newsgenie_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // Expired or invalid login: send the user back to the login page.
    if (response.status === 401 && path !== "/api/auth/login") {
      clearToken();
      // Full page load so no data from the expired session stays on screen.
      window.location.href = "/login";
    }
    const detail = body?.detail;
    throw new ApiError(typeof detail === "string" ? detail : `Request failed (${response.status})`, response.status);
  }
  return body as T;
}

/** Builds "?a=1&b=2", skipping empty values. */
export function query(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}
