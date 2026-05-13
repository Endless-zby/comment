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
    
    if (!body.hotelName) {
      return NextResponse.json(
        { error: "酒店名称为必填项" },
        { status: 400 }
      );
    }
    
    const hotel = await prisma.hotel.create({
      data: {
        hotelName: body.hotelName,
        ctripHotelId: body.ctripHotelId || null,
        fliggyHotelId: body.fliggyHotelId || null,
        platformId: body.platformId || null,
        city: body.city || null,
        onboardDate: body.onboardDate || new Date().toISOString().split("T")[0],
      },
    });
    return NextResponse.json(hotel, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target || [];
      if (target.includes("ctrip_hotel_id")) {
        return NextResponse.json(
          { error: "携程酒店ID已存在" },
          { status: 400 }
        );
      }
      if (target.includes("fliggy_hotel_id")) {
        return NextResponse.json(
          { error: "飞猪酒店ID已存在" },
          { status: 400 }
        );
      }
      if (target.includes("platform_id")) {
        return NextResponse.json(
          { error: "后台酒店ID已存在，该酒店已被其他记录绑定" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "唯一字段冲突" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "创建酒店失败" },
      { status: 500 }
    );
  }
}