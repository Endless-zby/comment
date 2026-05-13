import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_REMOTE_API_URL = "https://api-jdagent.stqcloud.com/hotel/callback/ai/hotelList";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || "";

    let remoteApiUrl = DEFAULT_REMOTE_API_URL;
    try {
      const setting = await prisma.globalSetting.findUnique({
        where: { key: "remote_hotel_api_url" },
      });
      if (setting?.value) {
        remoteApiUrl = setting.value;
      }
    } catch {}

    const response = await fetch(remoteApiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `远程接口返回 ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    if (result.message?.code !== 0) {
      return NextResponse.json(
        { success: false, error: result.message?.message || "远程接口返回错误" },
        { status: 502 }
      );
    }

    let hotels = result.data || [];

    if (keyword) {
      const kw = keyword.toLowerCase();
      hotels = hotels.filter(
        (h: { platformId: string; hotelName: string }) =>
          h.hotelName.toLowerCase().includes(kw) ||
          h.platformId.includes(kw)
      );
    }

    return NextResponse.json({ success: true, data: hotels });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `获取远程酒店列表失败: ${error.message}` },
      { status: 500 }
    );
  }
}
