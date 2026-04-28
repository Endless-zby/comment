import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hotel = await prisma.hotel.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { reviews: true } },
        configs: true,
      },
    });
    if (!hotel) {
      return NextResponse.json({ error: "酒店不存在" }, { status: 404 });
    }
    return NextResponse.json(hotel);
  } catch (error) {
    return NextResponse.json({ error: "获取酒店失败" }, { status: 500 });
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
    
    if (body.hotelName !== undefined) {
      updateData.hotelName = body.hotelName;
    }
    if (body.ctripHotelId !== undefined) {
      updateData.ctripHotelId = body.ctripHotelId || null;
    }
    if (body.fliggyHotelId !== undefined) {
      updateData.fliggyHotelId = body.fliggyHotelId || null;
    }
    if (body.city !== undefined) {
      updateData.city = body.city;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }
    if (body.totalReviews !== undefined) {
      updateData.totalReviews = body.totalReviews;
    }
    if (body.avgScore !== undefined) {
      updateData.avgScore = body.avgScore;
    }
    
    const hotel = await prisma.hotel.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
    return NextResponse.json(hotel);
  } catch (error: any) {
    console.error("[Hotel API] 更新错误:", error);
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      if (target.includes("ctrip_hotel_id")) {
        return NextResponse.json({ error: "携程酒店ID已存在" }, { status: 400 });
      }
      if (target.includes("fliggy_hotel_id")) {
        return NextResponse.json({ error: "飞猪酒店ID已存在" }, { status: 400 });
      }
      return NextResponse.json({ error: "唯一字段冲突" }, { status: 400 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "酒店不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: `更新酒店失败: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.hotel.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "删除酒店失败" }, { status: 500 });
  }
}