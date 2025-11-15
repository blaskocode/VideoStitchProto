import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const SESSION_TOKEN_COOKIE_NAME = "session_token";
const SESSION_TOKEN_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Gets or creates a session token for the current visitor.
 * If a session token cookie exists, returns it.
 * Otherwise, generates a new UUID, sets it as a cookie, and returns it.
 *
 * @returns The session token string
 */
export async function getOrCreateSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(SESSION_TOKEN_COOKIE_NAME);

  if (existingToken?.value) {
    return existingToken.value;
  }

  // Generate new UUID
  const newToken = uuidv4();

  // Set cookie with HttpOnly, secure in production, long expiry
  cookieStore.set(SESSION_TOKEN_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TOKEN_MAX_AGE,
  });

  return newToken;
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

