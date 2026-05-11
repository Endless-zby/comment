import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const platform = searchParams.get("platform");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    const where: Prisma.ReviewWhereInput = {
      OR: [
        { reviewDate: { gte: startDate.toISOString(), lte: endDate.toISOString() } },
        { reviewDate: null, createdAt: { gte: startDate, lte: endDate } },
      ],
    };
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (platform && platform !== "all") where.platform = platform;

    const reviews = await prisma.review.findMany({
      where,
      select: { reviewDate: true, createdAt: true },
    });

    const dailyCount = new Map<string, number>();

    reviews.forEach((review) => {
      const date = review.reviewDate ? new Date(review.reviewDate) : review.createdAt;
      const dateKey = date.toISOString().split("T")[0];
      dailyCount.set(dateKey, (dailyCount.get(dateKey) || 0) + 1);
    });

    const result = Array.from(dailyCount.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "获取热力图数据失败" }, { status: 500 });
  }
}
