import { NextRequest, NextResponse } from "next/server";
import { matchTrackEvents } from "@/services/track-match";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await matchTrackEvents({
      hotelId: body.hotelId || undefined,
      platformId: body.platformId || undefined,
      minSimilarity: body.minSimilarity || undefined,
      pageSize: body.pageSize || 50,
      page: body.page || 1,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `匹配失败: ${error.message}` },
      { status: 500 }
    );
  }
}
