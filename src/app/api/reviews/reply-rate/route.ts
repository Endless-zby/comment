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
      select: {
        reviewDate: true,
        createdAt: true,
        hotelReply: true,
      },
      orderBy: { reviewDate: "desc" },
    });

    const monthlyData = new Map<string, { total: number; replied: number }>();

    reviews.forEach((review) => {
      const date = review.reviewDate ? new Date(review.reviewDate) : review.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { total: 0, replied: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.total++;
      if (review.hotelReply && review.hotelReply.trim().length > 0) {
        data.replied++;
      }
    });

    const result = Array.from(monthlyData.entries())
      .map(([date, data]) => ({
        date,
        totalReviews: data.total,
        repliedCount: data.replied,
        replyRate: data.total > 0 ? Math.round((data.replied / data.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "获取回复率趋势失败" }, { status: 500 });
  }
}
