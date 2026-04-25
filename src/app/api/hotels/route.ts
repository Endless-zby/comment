import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hotels = await prisma.hotel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { reviews: true } },
        configs: true,
      },
    });
    return NextResponse.json(hotels);
  } catch (error) {
    return NextResponse.json(
      { error: "获取酒店列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hotel = await prisma.hotel.create({
      data: {
        hotelId: body.hotelId,
        hotelName: body.hotelName,
        city: body.city || null,
      },
    });
    return NextResponse.json(hotel, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "酒店ID已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "创建酒店失败" },
      { status: 500 }
    );
  }
}