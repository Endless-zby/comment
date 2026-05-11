import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");

    const where: Prisma.ReviewWhereInput = {};
    if (hotelId) where.hotelId = parseInt(hotelId);

    const reviews = await prisma.review.findMany({
      where,
      select: { rating: true, platform: true },
    });

    const PLATFORM_LABELS: Record<string, string> = {
      ctrip: "携程",
      fliggy: "飞猪",
    };

    const platforms = ["ctrip", "fliggy"];
    const result = platforms
      .map((platform) => {
        const platformReviews = reviews.filter((r) => r.platform === platform);
        const total = platformReviews.length;
        if (total === 0) return null;
        const avgScore = platformReviews.reduce((sum, r) => sum + r.rating, 0) / total;
        const goodCount = platformReviews.filter((r) => r.rating >= 4).length;
        const neutralCount = platformReviews.filter((r) => r.rating >= 3 && r.rating < 4).length;
        const badCount = platformReviews.filter((r) => r.rating < 3).length;
        return {
          platform,
          platformLabel: PLATFORM_LABELS[platform] || platform,
          totalReviews: total,
          avgScore: Math.round(avgScore * 10) / 10,
          goodRate: Math.round((goodCount / total) * 1000) / 10,
          neutralRate: Math.round((neutralCount / total) * 1000) / 10,
          badRate: Math.round((badCount / total) * 1000) / 10,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "获取平台对比数据失败" }, { status: 500 });
  }
}
