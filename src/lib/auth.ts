import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PageKey } from "@/lib/permissions";

export const AUTH_COOKIE_NAME = "hotel_monitor_session";

const SESSION_TTL_DAYS = 7;
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");
  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [iterationsRaw, salt, storedHash] = passwordHash.split(":");
  const iterations = Number(iterationsRaw);
  if (!iterations || !salt || !storedHash) return false;

  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const storedHashBuffer = Buffer.from(storedHash, "hex");
  if (hashBuffer.length !== storedHashBuffer.length) return false;

  return crypto.timingSafeEqual(hashBuffer, storedHashBuffer);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return token;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.authSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getRequestToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return request.cookies.get(AUTH_COOKIE_NAME)?.value;
}

export async function getCurrentUser(request: NextRequest) {
  const token = getRequestToken(request);
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          role: {
            include: { permissions: true },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.authSession.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export function serializeUser(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const permissions =
    user.role?.permissions
      .filter((permission) => permission.canAccess)
      .map((permission) => permission.pageKey) ?? [];

  return {
    id: user.id,
    accountType: user.accountType,
    username: user.username,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    status: user.status,
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          isAdmin: user.role.isAdmin,
        }
      : null,
    permissions: user.role?.isAdmin ? ["*"] : permissions,
  };
}

export function userCanAccessPage(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  pageKey: PageKey
): boolean {
  if (user.role?.isAdmin) return true;
  return Boolean(
    user.role?.permissions.some(
      (permission) => permission.pageKey === pageKey && permission.canAccess
    )
  );
}

export async function requireAuth(
  request: NextRequest,
  options?: { pageKey?: PageKey; admin?: boolean }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError("未登录", 401);
  }
  if (user.status !== "approved") {
    throw new AuthError("账号未审核或已停用", 403);
  }
  if (options?.admin && !user.role?.isAdmin) {
    throw new AuthError("需要管理员权限", 403);
  }
  if (options?.pageKey && !userCanAccessPage(user, options.pageKey)) {
    throw new AuthError("无页面访问权限", 403);
  }
  return user;
}

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
}
