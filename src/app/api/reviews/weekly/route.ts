import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getWeekNumber(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

function getWeekStart(weekLabel: string): string {
  const [year, week] = weekLabel.split("-W");
  const weekNum = parseInt(week);
  const startOfYear = new Date(parseInt(year), 0, 1);
  const dayOffset = (weekNum - 1) * 7 - startOfYear.getDay() + 1;
  const weekStart = new Date(startOfYear.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  return weekStart.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");

    const where = hotelId ? { hotelId } : {};

    const reviews = await prisma.review.findMany({
      where,
      select: {
        rating: true,
        reviewDate: true,
        createdAt: true,
      },
    });

    const weeklyData = new Map<string, { ratings: number[]; count: number }>();

    reviews.forEach((review) => {
      const date = review.reviewDate ? new Date(review.reviewDate) : review.createdAt;
      const weekLabel = getWeekNumber(date);

      if (!weeklyData.has(weekLabel)) {
        weeklyData.set(weekLabel, { ratings: [], count: 0 });
      }
      const data = weeklyData.get(weekLabel)!;
      data.ratings.push(review.rating);
      data.count++;
    });

    const stats = Array.from(weeklyData.entries())
      .map(([weekLabel, data]) => ({
        weekLabel,
        weekStart: getWeekStart(weekLabel),
        totalCount: data.count,
        goodCount: data.ratings.filter(r => r >= 4).length,
        neutralCount: data.ratings.filter(r => r >= 3 && r < 4).length,
        badCount: data.ratings.filter(r => r < 3).length,
        avgScore: data.ratings.length > 0
          ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
          : 0,
      }))
      .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: "获取周统计失败" }, { status: 500 });
  }
}