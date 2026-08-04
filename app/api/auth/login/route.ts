import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import { cookieName, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const envEmail = process.env.ADMIN_EMAIL || "admin@salon.local";
  const envPassword = process.env.ADMIN_PASSWORD || "admin123";

  let user = hasDatabaseUrl() ? await prisma.user.findUnique({ where: { email } }).catch(() => null) : null;
  let validPassword = false;

  if (user) {
    validPassword = await bcrypt.compare(password, user.password);
  } else if (email === envEmail && password === envPassword) {
    user = {
      id: "env-admin",
      name: "Salon Admin",
      email: envEmail,
      password: "",
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    validPassword = true;
  }

  if (!user || !validPassword) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
  response.cookies.set(cookieName, signSession({ id: user.id, name: user.name, email: user.email, role: user.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
