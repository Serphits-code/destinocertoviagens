import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Rotas públicas
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/auth");

  // Se não está logado e tenta acessar rota protegida → redireciona para login
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se está logado e tenta acessar login → redireciona para cockpit
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/cockpit", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
