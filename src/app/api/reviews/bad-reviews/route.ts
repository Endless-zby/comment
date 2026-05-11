import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const platform = searchParams.get("platform");
    const days = parseInt(searchParams.get("days") || "30");
    const limit = parseInt(searchParams.get("limit") || "20");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const where: Prisma.ReviewWhereInput = {
      rating: { lt: 3 },
      OR: [
        { reviewDate: { gte: cutoffDate.toISOString() } },
        { reviewDate: null, createdAt: { gte: cutoffDate } },
      ],
    };
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (platform && platform !== "all") where.platform = platform;

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { reviewDate: "desc" },
      take: limit,
      include: { hotel: { select: { hotelName: true } } },
    });

    const result = reviews.map((review) => ({
      id: review.id,
      hotelName: review.hotel.hotelName,
      rating: review.rating,
      content: review.content,
      reviewer: review.reviewer,
      reviewDate: review.reviewDate,
      hotelReply: review.hotelReply,
      platform: review.platform,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "获取差评预警数据失败" }, { status: 500 });
  }
}
