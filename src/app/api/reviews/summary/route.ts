import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const platform = searchParams.get("platform");

    const where: any = {};
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (platform && platform !== "all") where.platform = platform;

    const reviews = await prisma.review.findMany({
      where,
      select: {
        rating: true,
        reviewDate: true,
        createdAt: true,
        platform: true,
      },
    });

    const totalReviews = reviews.length;
    const avgScore = reviews.length > 0
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
      : 0;

    const goodCount = reviews.filter((r: { rating: number }) => r.rating >= 4).length;
    const neutralCount = reviews.filter((r: { rating: number }) => r.rating >= 3 && r.rating < 4).length;
    const badCount = reviews.filter((r: { rating: number }) => r.rating < 3).length;

    const ctripCount = reviews.filter((r: { platform: string }) => r.platform === "ctrip").length;
    const fliggyCount = reviews.filter((r: { platform: string }) => r.platform === "fliggy").length;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recent7dCount = reviews.filter((r: { reviewDate: string | null; createdAt: Date }) => {
      const date = r.reviewDate ? new Date(r.reviewDate) : r.createdAt;
      return date >= sevenDaysAgo;
    }).length;

    const recent30dCount = reviews.filter((r: { reviewDate: string | null; createdAt: Date }) => {
      const date = r.reviewDate ? new Date(r.reviewDate) : r.createdAt;
      return date >= thirtyDaysAgo;
    }).length;

    return NextResponse.json({
      totalReviews,
      avgScore: Math.round(avgScore * 10) / 10,
      goodRate: totalReviews > 0 ? Math.round((goodCount / totalReviews) * 100) : 0,
      badRate: totalReviews > 0 ? Math.round((badCount / totalReviews) * 100) : 0,
      goodCount,
      neutralCount,
      badCount,
      ctripCount,
      fliggyCount,
      recent7dCount,
      recent30dCount,
    });
  } catch (error) {
    return NextResponse.json({ error: "获取统计摘要失败" }, { status: 500 });
  }
}