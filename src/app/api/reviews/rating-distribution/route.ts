import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const platform = searchParams.get("platform");

    const where: Prisma.ReviewWhereInput = {};
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (platform && platform !== "all") where.platform = platform;

    const reviews = await prisma.review.findMany({
      where,
      select: { rating: true },
    });

    const total = reviews.length;
    const distribution = [1, 2, 3, 4, 5].map((star) => {
      const count = reviews.filter((r) => Math.floor(r.rating) === star).length;
      return {
        rating: star,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });

    return NextResponse.json(distribution);
  } catch (error) {
    return NextResponse.json({ error: "获取评分分布失败" }, { status: 500 });
  }
}
