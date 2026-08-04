import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { PAGE_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const VALID_PAGE_KEYS: Set<string> = new Set(PAGE_PERMISSIONS.map((page) => page.key));

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { admin: true });

    const roles = await prisma.role.findMany({
      orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        isAdmin: role.isAdmin,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        userCount: role._count.users,
        permissions: role.isAdmin
          ? PAGE_PERMISSIONS.map((page) => page.key)
          : role.permissions
              .filter((permission) => permission.canAccess)
              .map((permission) => permission.pageKey),
      })),
      pages: PAGE_PERMISSIONS,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const operator = await requireAuth(request, { admin: true });
    const body = await request.json();
    const name = String(body.name || "").trim();
    const permissionKeys: string[] = Array.isArray(body.permissions)
      ? body.permissions.filter((key: unknown): key is string => typeof key === "string")
      : [];

    if (name.length < 2 || name.length > 30) {
      return NextResponse.json(
        { success: false, error: "角色名称需为 2-30 个字符" },
        { status: 400 }
      );
    }

    const invalidPermission = permissionKeys.find((key) => !VALID_PAGE_KEYS.has(key));
    if (invalidPermission) {
      return NextResponse.json(
        { success: false, error: `未知页面权限: ${invalidPermission}` },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        isAdmin: false,
        permissions: {
          create: permissionKeys.map((pageKey) => ({
            pageKey,
            canAccess: true,
          })),
        },
      },
      include: { permissions: true },
    });

    await prisma.auditLog.create({
      data: {
        operatorId: operator.id,
        action: "role.create",
        payload: JSON.stringify({ roleId: role.id, name, permissionKeys }),
      },
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ success: false, error: "角色名称已存在" }, { status: 409 });
    }
    return authErrorResponse(error);
  }
}
