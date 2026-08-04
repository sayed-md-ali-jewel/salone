import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";

export async function POST() {
  const response = new NextResponse(null, { status: 303, headers: { Location: "/login" } });
  response.cookies.delete(cookieName);
  return response;
}
