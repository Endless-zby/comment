import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, deleteSession, getRequestToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await deleteSession(getRequestToken(request));
  const response = NextResponse.json({ success: true });
  clearAuthCookie(response);
  return response;
}
