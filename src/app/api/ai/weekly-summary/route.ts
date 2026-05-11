import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");

    if (hotelId && hotelId !== "all") {
      const report = await prisma.aiReport.findUnique({
        where: { hotelId: parseInt(hotelId) },
      });
      if (!report) {
        return NextResponse.json({ success: false, error: "暂无已保存的报告" });
      }
      return NextResponse.json({
        success: true,
        summary: report.summary,
        weekRange: report.weekRange,
        hotelName: report.hotelName,
        reviewCount: report.reviewCount,
        avgScore: report.avgScore,
        generatedAt: report.createdAt.toISOString(),
      });
    }

    const reports = await prisma.aiReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { hotel: { select: { hotelName: true } } },
    });

    return NextResponse.json({
      success: true,
      reports: reports.map((r) => ({
        hotelId: r.hotelId,
        hotelName: r.hotelName,
        weekRange: r.weekRange,
        reviewCount: r.reviewCount,
        avgScore: r.avgScore,
        generatedAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "获取报告失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKeySetting = await prisma.globalSetting.findUnique({
      where: { key: "deepseek_api_key" },
    });
    const apiKey = apiKeySetting?.value;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "请先在系统设置中配置 DeepSeek API Key" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { hotelId, weekStart, weekEnd } = body as {
      hotelId?: string;
      weekStart?: string;
      weekEnd?: string;
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const effectiveStart = weekStart || sevenDaysAgo.toISOString().split("T")[0];
    const effectiveEnd = weekEnd || now.toISOString().split("T")[0];

    const where: Prisma.ReviewWhereInput = {
      OR: [
        { reviewDate: { gte: effectiveStart, lte: effectiveEnd } },
        { reviewDate: null, createdAt: { gte: new Date(effectiveStart), lte: new Date(effectiveEnd) } },
      ],
    };
    if (hotelId && hotelId !== "all") where.hotelId = parseInt(hotelId);

    const reviews = await prisma.review.findMany({
      where,
      include: { hotel: { select: { hotelName: true } } },
      orderBy: { reviewDate: "desc" },
      take: 100,
    });

    if (reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: "所选时间范围内没有评价数据",
      });
    }

    const totalReviews = reviews.length;
    const avgScore = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const goodCount = reviews.filter((r) => r.rating >= 4).length;
    const neutralCount = reviews.filter((r) => r.rating >= 3 && r.rating < 4).length;
    const badCount = reviews.filter((r) => r.rating < 3).length;

    const reviewSamples = reviews.slice(0, 30).map((r) => ({
      rating: r.rating,
      content: (r.content || "无内容").substring(0, 200),
      hotelName: r.hotel.hotelName,
      platform: r.platform,
    }));

    const prompt = `你是一位专业的酒店评价分析师。请根据以下酒店评价数据，生成一份专业的周评价摘要报告。

## 本周评价数据概况
- 总评价数: ${totalReviews}
- 平均评分: ${avgScore.toFixed(1)}
- 好评数: ${goodCount} (${((goodCount / totalReviews) * 100).toFixed(1)}%)
- 中评数: ${neutralCount} (${((neutralCount / totalReviews) * 100).toFixed(1)}%)
- 差评数: ${badCount} (${((badCount / totalReviews) * 100).toFixed(1)}%)

## 评价样本（最近30条）
${reviewSamples.map((r) => `[${r.rating}星][${r.hotelName}][${r.platform === "ctrip" ? "携程" : "飞猪"}] ${r.content}`).join("\n")}

## 请生成报告，包含以下内容：
1. **本周总体评价概述**：用2-3句话总结本周评价的整体表现
2. **用户好评亮点**：列出用户最满意的3-5个方面
3. **用户差评痛点**：列出用户最不满意的3-5个方面
4. **改进建议**：基于评价数据给出3-5条具体的改进建议
5. **风险预警**：如果有值得关注的负面趋势，请特别指出

请使用 Markdown 格式输出，语言简洁专业。`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是一位专业的酒店评价数据分析师，擅长从用户评价中提取有价值的信息并给出改进建议。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("DeepSeek API error:", errData);
      return NextResponse.json(
        { success: false, error: `DeepSeek API 调用失败: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "生成失败";

    const hotelName = hotelId && hotelId !== "all"
      ? reviews[0]?.hotel?.hotelName || "未知酒店"
      : "全部酒店";

    if (hotelId && hotelId !== "all") {
      const numericHotelId = parseInt(hotelId);
      await prisma.aiReport.upsert({
        where: { hotelId: numericHotelId },
        update: {
          summary,
          weekRange: `${effectiveStart} ~ ${effectiveEnd}`,
          hotelName,
          reviewCount: totalReviews,
          avgScore: Math.round(avgScore * 10) / 10,
        },
        create: {
          hotelId: numericHotelId,
          summary,
          weekRange: `${effectiveStart} ~ ${effectiveEnd}`,
          hotelName,
          reviewCount: totalReviews,
          avgScore: Math.round(avgScore * 10) / 10,
        },
      });
    }

    return NextResponse.json({
      success: true,
      summary,
      weekRange: `${effectiveStart} ~ ${effectiveEnd}`,
      hotelName,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "生成周报失败";
    console.error("生成周报失败:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
