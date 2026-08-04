import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, { admin: true });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { role: true },
    });

    return NextResponse.json({
      success: true,
      data: users.map((user) => ({
        id: user.id,
        accountType: user.accountType,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        status: user.status,
        roleId: user.roleId,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              isAdmin: user.role.isAdmin,
            }
          : null,
        approvedAt: user.approvedAt,
        approvedBy: user.approvedBy,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
