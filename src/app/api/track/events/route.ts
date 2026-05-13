import { NextRequest, NextResponse } from "next/server";
import { queryRawTrackEvents } from "@/services/track-match";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await queryRawTrackEvents(body.platformId || undefined);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `查询失败: ${error.message}` },
      { status: 500 }
    );
  }
}
