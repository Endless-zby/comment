import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await requireAuth(request, { admin: true });
    const { id } = await params;
    const userId = Number(id);
    const body = await request.json();
    const roleId = Number(body.roleId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "用户 ID 无效" }, { status: 400 });
    }
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return NextResponse.json({ success: false, error: "请选择角色" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ success: false, error: "角色不存在" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        operatorId: operator.id,
        targetUserId: user.id,
        action: "user.assign-role",
        payload: JSON.stringify({ roleId }),
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return authErrorResponse(error);
  }
}
