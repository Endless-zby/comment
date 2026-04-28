import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hotels = await prisma.hotel.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { reviews: true } },
      },
    });

    const totalHotels = hotels.length;

    const allReviews = await prisma.review.findMany({
      select: { rating: true },
    });

    const totalReviews = allReviews.length;
    const avgScore = allReviews.length > 0
      ? allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allReviews.length
      : 0;

    const badReviews = allReviews.filter((r: { rating: number }) => r.rating < 3).length;

    const hotelStats = hotels.map((hotel: { id: number; hotelName: string; ctripHotelId: string | null; fliggyHotelId: string | null; _count: { reviews: number }; avgScore: number | null; isActive: boolean }) => ({
      id: hotel.id,
      hotelName: hotel.hotelName,
      ctripHotelId: hotel.ctripHotelId,
      fliggyHotelId: hotel.fliggyHotelId,
      totalReviews: hotel._count.reviews,
      avgScore: hotel.avgScore,
      isActive: hotel.isActive,
    }));

    return NextResponse.json({
      totalHotels,
      totalReviews,
      avgScore: Math.round(avgScore * 10) / 10,
      badReviews,
      hotelStats,
    });
  } catch (error) {
    return NextResponse.json({ error: "获取仪表盘统计失败" }, { status: 500 });
  }
}