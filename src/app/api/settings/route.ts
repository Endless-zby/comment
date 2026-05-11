import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.globalSetting.findMany();
    const result: Record<string, string | null> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json({ error: "缺少 key 参数" }, { status: 400 });
    }

    const setting = await prisma.globalSetting.upsert({
      where: { key },
      update: { value: value ?? null, description },
      create: { key, value: value ?? null, description },
    });

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: "保存设置失败" }, { status: 500 });
  }
}