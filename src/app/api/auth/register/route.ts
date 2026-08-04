import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword, serializeUser, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.@-]{3,32}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const nickname = String(body.nickname || "").trim();

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        { success: false, error: "用户名需为 3-32 位字母、数字或 _.@-" },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { success: false, error: "密码长度至少 10 位" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "用户名已存在" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        accountType: "web",
        username,
        passwordHash: hashPassword(password),
        nickname: nickname || null,
        status: "pending",
      },
      include: { role: { include: { permissions: true } } },
    });

    const token = await createSession(user.id);
    const response = NextResponse.json({
      success: true,
      message: "注册成功，等待管理员审核",
      user: serializeUser(user),
    });
    setAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "注册失败" }, { status: 500 });
  }
}
