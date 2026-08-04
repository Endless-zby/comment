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

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: "用户 ID 无效" }, { status: 400 });
    }
    if (userId === operator.id) {
      return NextResponse.json({ success: false, error: "不能拒绝当前登录账号" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: "rejected",
        roleId: null,
        approvedAt: null,
        approvedBy: operator.id,
      },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        operatorId: operator.id,
        targetUserId: user.id,
        action: "user.reject",
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return authErrorResponse(error);
  }
}
