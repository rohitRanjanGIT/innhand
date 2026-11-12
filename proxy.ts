import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// A quick cookie check only, to bounce signed-out visitors away from /admin. The real check is
// requireAdmin() in the server code, which reads the session from the database.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/sign-in")) return NextResponse.next();
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/admin/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
