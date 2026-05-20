import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get("isRead");
    const hotelId = searchParams.get("hotelId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const where: any = {};
    if (isRead !== null && isRead !== "all") {
      where.isRead = isRead === "true";
    }
    if (hotelId) where.hotelId = parseInt(hotelId);

    const [alerts, total, unreadCount] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.alert.count({ where }),
      prisma.alert.count({ where: { isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      alerts,
      unreadCount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取预警列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelId, reviewId, hotelName, platform, rating, content } = body;

    const alert = await prisma.alert.create({
      data: {
        hotelId,
        reviewId,
        hotelName,
        platform: platform || "ctrip",
        rating,
        content,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "创建预警失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, isRead } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { success: false, error: "请提供预警ID列表" },
        { status: 400 }
      );
    }

    await prisma.alert.updateMany({
      where: { id: { in: ids } },
      data: { isRead: isRead ?? true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "更新预警失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { success: false, error: "请提供预警ID" },
        { status: 400 }
      );
    }

    await prisma.alert.deleteMany({
      where: { id: { in: ids.split(",").map(Number) } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "删除预警失败" },
      { status: 500 }
    );
  }
}
