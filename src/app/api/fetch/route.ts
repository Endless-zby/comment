import { NextRequest, NextResponse } from "next/server";
import { fetchReviews, getFetchStatus } from "@/services/crawler/review-fetcher";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId } = body;

    if (!configId) {
      return NextResponse.json({ error: "请提供配置ID" }, { status: 400 });
    }

    const config = await prisma.config.findUnique({
      where: { id: configId },
      include: { hotel: true },
    });

    if (!config) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    if (!config.hotel) {
      return NextResponse.json({ error: "酒店不存在" }, { status: 404 });
    }

    const result = await fetchReviews(
      config.hotel.hotelId,
      config.hotel.hotelName,
      config.id,
      config.pageSize,
      config.fetchMode as "full" | "incremental"
    );

    return NextResponse.json({
      success: true,
      newCount: result.newCount,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const status = getFetchStatus();
  return NextResponse.json(status);
}