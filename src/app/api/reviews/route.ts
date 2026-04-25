import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const rating = searchParams.get("rating");
    const keyword = searchParams.get("keyword");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    if (rating === "good") where.rating = { gte: 4 };
    if (rating === "neutral") where.rating = { gte: 3, lt: 4 };
    if (rating === "bad") where.rating = { lt: 3 };
    if (keyword) where.content = { contains: keyword };

    const orderBy: any = {};
    if (sortBy === "date") orderBy.reviewDate = sortOrder;
    if (sortBy === "rating") orderBy.rating = sortOrder;

    const reviews = await prisma.review.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await prisma.review.count({ where });

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "获取评价列表失败" }, { status: 500 });
  }
}