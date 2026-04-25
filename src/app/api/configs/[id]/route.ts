import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await prisma.config.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true, fetchLogs: { take: 10, orderBy: { createdAt: "desc" } } },
    });
    if (!config) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const config = await prisma.config.update({
      where: { id: parseInt(id) },
      data: {
        fetchIntervalHr: body.fetchIntervalHr,
        pageSize: body.pageSize,
        fetchMode: body.fetchMode,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.config.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "删除配置失败" }, { status: 500 });
  }
}