import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addJob, removeJob } from "@/services/scheduler";

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

    const updateData: any = {};
    if (body.fetchIntervalHr !== undefined) updateData.fetchIntervalHr = body.fetchIntervalHr;
    if (body.pageSize !== undefined) updateData.pageSize = body.pageSize;
    if (body.fetchMode !== undefined) updateData.fetchMode = body.fetchMode;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const config = await prisma.config.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    if (config.isActive) {
      addJob(config.id);
    } else {
      removeJob(config.id);
    }

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
    const configId = parseInt(id);

    await prisma.config.delete({
      where: { id: configId },
    });

    removeJob(configId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "删除配置失败" }, { status: 500 });
  }
}
