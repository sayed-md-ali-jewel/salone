import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UserRole = "ADMIN" | "MANAGER" | "CASHIER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const cookieName = "salon_session";

function getSecret() {
  return process.env.JWT_SECRET || "dev-only-change-this-secret";
}

export function signSession(user: AuthUser) {
  return jwt.sign(user, getSecret(), { expiresIn: "7d" });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, getSecret()) as AuthUser;
  } catch {
    return null;
  }
}

export async function requireUser(roles?: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (roles?.length && !roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

export { cookieName };
