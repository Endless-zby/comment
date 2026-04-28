import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");

    const where = hotelId ? { hotelId: parseInt(hotelId) } : {};

    const configs = await prisma.config.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { hotel: true },
    });
    return NextResponse.json(configs);
  } catch (error) {
    return NextResponse.json({ error: "获取配置列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.hotelId) {
      return NextResponse.json({ error: "请选择酒店" }, { status: 400 });
    }
    
    const config = await prisma.config.create({
      data: {
        hotelId: parseInt(body.hotelId),
        fetchIntervalHr: body.fetchIntervalHr || 24,
        pageSize: body.pageSize || 20,
        fetchMode: body.fetchMode || "incremental",
        isActive: body.isActive ?? true,
      },
      include: { hotel: true },
    });
    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建配置失败" }, { status: 500 });
  }
}