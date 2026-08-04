import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { PAGE_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const VALID_PAGE_KEYS: Set<string> = new Set(PAGE_PERMISSIONS.map((page) => page.key));

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireAuth(request, { admin: true });
    const { id } = await params;
    const roleId = Number(id);
    const body = await request.json();
    const permissionKeys: string[] = Array.isArray(body.permissions)
      ? body.permissions.filter((key: unknown): key is string => typeof key === "string")
      : [];

    if (!Number.isInteger(roleId) || roleId <= 0) {
      return NextResponse.json({ success: false, error: "角色 ID 无效" }, { status: 400 });
    }

    const invalidPermission = permissionKeys.find((key) => !VALID_PAGE_KEYS.has(key));
    if (invalidPermission) {
      return NextResponse.json(
        { success: false, error: `未知页面权限: ${invalidPermission}` },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }
    if (role.isAdmin) {
      return NextResponse.json(
        { success: false, error: "admin 角色权限只能通过初始化脚本维护" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.pagePermission.deleteMany({ where: { roleId } });
      if (permissionKeys.length > 0) {
        await tx.pagePermission.createMany({
          data: permissionKeys.map((pageKey) => ({
            roleId,
            pageKey,
            canAccess: true,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          operatorId: operator.id,
          action: "role.update-permissions",
          payload: JSON.stringify({ roleId, permissionKeys }),
        },
      });
    });

    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    return NextResponse.json({ success: true, data: updatedRole });
  } catch (error) {
    return authErrorResponse(error);
  }
}
