import { cookies } from "next/headers";

const SESSION_TOKEN_COOKIE_NAME = "session_token";

/**
 * Gets the session token from cookies.
 * Middleware ensures the token exists, so this should always return a value.
 *
 * @returns The session token string
 */
export async function getOrCreateSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN_COOKIE_NAME);

  // Middleware ensures token exists, but handle gracefully if it doesn't
  if (!token?.value) {
    throw new Error(
      "Session token not found - middleware should have created it"
    );
  }

  return token.value;
}

/**
 * Gets the session token from cookies without creating a new one.
 * Returns undefined if no session token exists.
 *
 * @returns The session token string or undefined
 */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_TOKEN_COOKIE_NAME)?.value;
}

