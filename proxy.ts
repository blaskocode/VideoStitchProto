import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

const SESSION_TOKEN_COOKIE_NAME = "session_token";
const SESSION_TOKEN_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

export function proxy(request: NextRequest) {
  // Check if session token exists
  const sessionToken = request.cookies.get(SESSION_TOKEN_COOKIE_NAME);

  // If no session token, create one
  if (!sessionToken) {
    const newToken = uuidv4();
    const response = NextResponse.next();

    response.cookies.set(SESSION_TOKEN_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TOKEN_MAX_AGE,
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

