const SESSION_KEY = "prelegal.session";

/** The signed-in user, kept in localStorage. */
export interface Session {
  token: string;
  email: string;
}

export function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Call the API with the session token. A 401 means the session ended (e.g. the
 * server restarted and reset its database), so send the user back to sign in.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = getSession();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
    },
  });
  if (response.status === 401) {
    signOut();
    window.location.assign("/");
    throw new Error("Session ended");
  }
  return response;
}

const VALIDATION_ERROR = "Enter a valid email and a password of at least 8 characters.";

/** Sign in or sign up; stores the session and returns null, or returns an error message. */
export async function authenticate(mode: "signin" | "signup", email: string, password: string): Promise<string | null> {
  const response = await fetch(`/api/auth/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.ok) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(await response.json()));
    return null;
  }
  if (response.status === 422) return VALIDATION_ERROR;
  if (response.status === 401 || response.status === 409) return (await response.json()).detail;
  return "Something went wrong. Please try again.";
}
