import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  serializeUser,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "请输入用户名和密码" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ success: false, error: "用户名或密码错误" }, { status: 401 });
    }

    if (user.status === "disabled") {
      return NextResponse.json({ success: false, error: "账号已停用" }, { status: 403 });
    }

    const token = await createSession(user.id);
    const response = NextResponse.json({ success: true, user: serializeUser(user) });
    setAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "登录失败" }, { status: 500 });
  }
}
