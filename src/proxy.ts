import { auth } from "@/auth";

// Next.js "proxy" convention (formerly "middleware").
// Protect everything except auth endpoints, the login page and static assets.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname === "/403" ||
    // Called server-to-server by the OnlyOffice Document Server, which has
    // no session cookie — protected by their own route/JWT tokens instead
    // (see src/lib/onlyoffice/jwt.ts), not the browser session.
    pathname === "/api/onlyoffice/document" ||
    pathname === "/api/onlyoffice/callback";

  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
