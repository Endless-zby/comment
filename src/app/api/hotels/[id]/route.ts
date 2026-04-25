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
    const hotel = await prisma.hotel.update({
      where: { id: parseInt(id) },
      data: {
        hotelName: body.hotelName,
        city: body.city,
        isActive: body.isActive,
        totalReviews: body.totalReviews,
        avgScore: body.avgScore,
      },
    });
    return NextResponse.json(hotel);
  } catch (error) {
    return NextResponse.json({ error: "更新酒店失败" }, { status: 500 });
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