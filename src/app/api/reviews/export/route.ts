import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId");
    const rating = searchParams.get("rating");
    const keyword = searchParams.get("keyword");
    const platform = searchParams.get("platform");

    const where: any = {};
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (rating === "good") where.rating = { gte: 4 };
    if (rating === "neutral") where.rating = { gte: 3, lt: 4 };
    if (rating === "bad") where.rating = { lt: 3 };
    if (keyword) where.content = { contains: keyword };
    if (platform && platform !== "all") where.platform = platform;

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { reviewDate: "desc" },
      include: { hotel: true },
    });

    const exportData = reviews.map((review, index) => {
      const getRatingLabel = (rating: number) => {
        if (rating >= 4) return "好评";
        if (rating >= 3) return "中评";
        return "差评";
      };

      const getPlatformLabel = (platform: string) => {
        return platform === "fliggy" ? "飞猪" : "携程";
      };

      let imageUrls = "";
      if (review.imageList) {
        try {
          const images = JSON.parse(review.imageList);
          imageUrls = images.join("\n");
        } catch {
          imageUrls = review.imageList;
        }
      }

      return {
        "序号": index + 1,
        "酒店名称": review.hotel?.hotelName || "",
        "平台": getPlatformLabel(review.platform),
        "评分": review.rating,
        "评价类型": getRatingLabel(review.rating),
        "房型": review.roomName || "",
        "入住日期": review.checkInDate || "",
        "评价日期": review.reviewDate || "",
        "评价者": review.reviewer || "匿名",
        "评价内容": review.content || "",
        "是否有图片": review.hasImage ? "是" : "否",
        "图片链接": imageUrls,
        "酒店回复": review.hotelReply || "",
        "评价ID": review.commentId,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const columnWidths = [
      { wch: 6 },
      { wch: 30 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 60 },
      { wch: 10 },
      { wch: 50 },
      { wch: 40 },
      { wch: 20 },
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "评价数据");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const hotel = hotelId ? reviews[0]?.hotel?.hotelName : "全部酒店";
    const platformLabel = platform === "ctrip" ? "携程" : platform === "fliggy" ? "飞猪" : "全部平台";
    const ratingLabel = rating === "good" ? "好评" : rating === "neutral" ? "中评" : rating === "bad" ? "差评" : "全部评分";
    const date = new Date().toISOString().split("T")[0];
    const filename = `评价导出_${hotel || "全部"}_${platformLabel}_${ratingLabel}_${date}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error: any) {
    console.error("导出评价失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "导出评价失败" },
      { status: 500 }
    );
  }
}