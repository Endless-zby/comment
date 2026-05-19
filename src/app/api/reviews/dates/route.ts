import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");

    if (!hotelId || hotelId === "all") {
      return NextResponse.json({ success: true, dates: [] });
    }

    const reviews = await prisma.review.findMany({
      where: { hotelId: parseInt(hotelId) },
      select: { reviewDate: true, createdAt: true },
    });

    const dateSet = new Set<string>();
    for (const r of reviews) {
      const raw = r.reviewDate || r.createdAt.toISOString();
      const dateOnly = raw.substring(0, 10);
      if (dateOnly) dateSet.add(dateOnly);
    }

    return NextResponse.json({
      success: true,
      dates: Array.from(dateSet).sort(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取评价日期失败" },
      { status: 500 }
    );
  }
}
