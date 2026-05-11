import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个",
  "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好",
  "自己", "这", "他", "她", "它", "们", "那", "些", "什么", "怎么", "如果", "因为",
  "所以", "但是", "而且", "或者", "还是", "已经", "可以", "这个", "那个", "就是",
  "比较", "非常", "真的", "太", "还", "又", "吗", "吧", "呢", "啊", "哦", "嗯",
  "把", "被", "让", "给", "从", "向", "对", "跟", "比", "用", "以", "为",
  "酒店", "入住", "房间", "评价", "评论", "感觉", "觉得", "地方", "时候",
  "东西", "问题", "下次", "一点", "不过", "其他", "然后", "出来", "知道",
  "这里", "那里", "这样", "那样", "不知", "不是", "一些", "之后",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
  "both", "either", "neither", "each", "every", "all", "any", "few",
  "more", "most", "other", "some", "such", "no", "only", "own", "same",
  "than", "too", "very", "just", "because",
]);

function extractWords(text: string): string[] {
  const cleaned = text
    .replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words: string[] = [];
  const chineseRegex = /[\u4e00-\u9fa5]+/g;
  let match;
  while ((match = chineseRegex.exec(cleaned)) !== null) {
    const segment = match[0];
    for (let len = 2; len <= Math.min(4, segment.length); len++) {
      for (let i = 0; i <= segment.length - len; i++) {
        const word = segment.substring(i, i + len);
        if (!STOP_WORDS.has(word)) {
          words.push(word);
        }
      }
    }
  }

  const englishWords = cleaned
    .replace(/[\u4e00-\u9fa5]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()));
  words.push(...englishWords.map((w) => w.toLowerCase()));

  return words;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "80");

    const where: Prisma.ReviewWhereInput = { content: { not: null } };
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (platform && platform !== "all") where.platform = platform;

    const reviews = await prisma.review.findMany({
      where,
      select: { content: true },
    });

    const wordFreq = new Map<string, number>();
    reviews.forEach((review) => {
      if (!review.content) return;
      const words = extractWords(review.content);
      words.forEach((word) => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });

    const result = Array.from(wordFreq.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "获取词云数据失败" }, { status: 500 });
  }
}
