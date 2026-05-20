import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

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
    const { reviewId, style, tags } = body as {
      reviewId?: number;
      style?: string;
      tags?: string;
    };

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: "请提供评价ID" },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { hotel: { select: { hotelName: true } } },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: "评价不存在" },
        { status: 404 }
      );
    }

    const styleMap: Record<string, string> = {
      professional: "专业正式，体现酒店的服务态度和解决问题的诚意",
      friendly: "亲切温暖，像朋友一样沟通，拉近与客人的距离",
      brief: "简短有力，直接回应核心问题，不啰嗦",
    };
    const styleDesc = styleMap[style || "professional"] || styleMap.professional;

    const platformLabel = review.platform === "fliggy" ? "飞猪" : "携程";
    const ratingLabel = review.rating >= 4 ? "好评" : review.rating >= 3 ? "中评" : "差评";

    const tagsSection = tags?.trim()
      ? `\n## 回复重点标签\n用户希望回复中重点关注以下方面：${tags.trim()}`
      : "";

    const prompt = `你是一位专业的酒店客服经理。请根据以下${platformLabel}${ratingLabel}，生成一条酒店回复。

## 评价信息
- 酒店：${review.hotel.hotelName}
- 评分：${review.rating}星（${ratingLabel}）
- 房型：${review.roomName || "未注明"}
- 评价内容：${review.content || "无内容"}

## 回复风格
${styleDesc}
${tagsSection}

## 要求
1. 回复内容控制在50-150字
2. 如果是差评，先道歉再说明改进措施
3. 如果是中评，感谢反馈并说明提升方向
4. 如果是好评，表达感谢并欢迎再次入住
5. 不要使用模板化的套话，要有针对性
6. 如果用户提供了回复重点标签，务必在回复中重点回应这些方面
7. 只输出回复内容，不要加任何前缀或解释`;

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
            content: "你是一位专业的酒店客服，擅长撰写得体、有温度的客户回复。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `DeepSeek API 调用失败: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "生成失败";

    return NextResponse.json({ success: true, reply });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "生成回复失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
