import { NextRequest, NextResponse } from "next/server";
import { fetchReviews, getFetchStatus } from "@/services/crawler/review-fetcher";
import { fetchFliggyReviews, fetchFliggyReviewsByApi, getFliggyFetchStatus } from "@/services/crawler/fliggy-fetcher";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, platform, fetchMode } = body;

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

    const targetPlatform = platform || "ctrip";

    if (targetPlatform === "fliggy") {
      if (!config.hotel.fliggyHotelId) {
        return NextResponse.json({ error: "该酒店未配置飞猪酒店ID" }, { status: 400 });
      }

      if (fetchMode === "api") {
        const result = await fetchFliggyReviewsByApi(
          config.hotel.fliggyHotelId,
          config.hotel.id,
          config.hotel.hotelName,
          config.id
        );

        return NextResponse.json({
          success: true,
          platform: "fliggy",
          fetchMode: "api",
          newCount: result.newCount,
          totalPages: result.totalPages,
        });
      } else {
        const result = await fetchFliggyReviews(
          config.hotel.fliggyHotelId,
          config.hotel.id,
          config.hotel.hotelName,
          config.id,
          config.pageSize
        );

        return NextResponse.json({
          success: true,
          platform: "fliggy",
          fetchMode: "cdp",
          newCount: result.newCount,
          totalPages: result.totalPages,
        });
      }
    } else {
      if (!config.hotel.ctripHotelId) {
        return NextResponse.json({ error: "该酒店未配置携程酒店ID" }, { status: 400 });
      }

      const result = await fetchReviews(
        config.hotel.ctripHotelId,
        config.hotel.id,
        config.hotel.hotelName,
        config.id,
        config.pageSize,
        config.fetchMode as "full" | "incremental"
      );

      return NextResponse.json({
        success: true,
        platform: "ctrip",
        newCount: result.newCount,
        totalPages: result.totalPages,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const ctripStatus = getFetchStatus();
  const fliggyStatus = getFliggyFetchStatus();
  
  if (ctripStatus.isRunning) {
    return NextResponse.json(ctripStatus);
  }
  
  if (fliggyStatus.isRunning) {
    return NextResponse.json(fliggyStatus);
  }
  
  return NextResponse.json({
    isRunning: false,
    currentHotelId: null,
    currentHotelName: null,
    currentPlatform: null,
    progress: null,
  });
}