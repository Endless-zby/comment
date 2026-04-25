import { Page } from "puppeteer";
import { getPage, sleep, closeBrowser } from "./browser";
import { prisma } from "@/lib/prisma";

const INITIAL_FETCH_PAGES = 5;
const TARGET_PAGE_SIZE = 50;

interface CtripReviewData {
  commentId: string;
  rating: number;
  content: string;
  roomName: string | null;
  checkInDate: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  hasImage: boolean;
  imageList: string[];
  hotelReply: string | null;
  rawJson: any;
}

interface FetchResult {
  reviews: CtripReviewData[];
  totalPages: number;
  newCount: number;
}

let isFetching = false;
let currentFetchStatus = {
  isRunning: false,
  currentHotelId: null as string | null,
  currentHotelName: null as string | null,
  progress: null as { currentPage: number; newCount: number; totalPages: number } | null,
};

export function getFetchStatus() {
  return currentFetchStatus;
}

export async function fetchReviews(
  hotelId: string,
  hotelName: string,
  configId: number,
  pageSize: number = 20,
  fetchMode: "full" | "incremental" = "incremental",
  onProgress?: (page: number, newCount: number) => void
): Promise<FetchResult> {
  if (isFetching) {
    throw new Error("已有拉取任务正在运行");
  }

  isFetching = true;
  currentFetchStatus = {
    isRunning: true,
    currentHotelId: hotelId,
    currentHotelName: hotelName,
    progress: { currentPage: 0, newCount: 0, totalPages: 0 },
  };

  let client: any = null;

  try {
    await closeBrowser();
    
    const page = await getPage();
    const capturedReviews: CtripReviewData[] = [];

    const existingCount = await prisma.review.count({ where: { hotelId } });
    const shouldFetchMultiplePages = existingCount === 0;
    const targetPages = shouldFetchMultiplePages ? INITIAL_FETCH_PAGES : 1;
    
    console.log(`[Fetcher] 本地评价数: ${existingCount}, 目标页数: ${targetPages}, 目标pageSize: ${TARGET_PAGE_SIZE}`);

    client = await page.target().createCDPSession();
    
    await client.send("Fetch.enable", {
      patterns: [
        {
          urlPattern: "*getHotelCommentList*",
          requestStage: "Request",
        },
        {
          urlPattern: "*getHotelCommentList*",
          requestStage: "Response",
        },
      ],
    });

    client.on("Fetch.requestPaused", async (params: any) => {
      const url = params.request.url;
      const stage = params.resourceType;
      
      if (params.request && !params.responseHeaders) {
        console.log(`[Fetch] 拦截请求阶段: ${url.substring(0, 100)}...`);
        
        try {
          let modifiedPostData = params.request.postData;
          
          if (modifiedPostData) {
            try {
              const bodyJson = JSON.parse(modifiedPostData);
              const originalPageSize = bodyJson.pageSize;
              let modified = false;
              
              if (bodyJson.pageSize && bodyJson.pageSize !== TARGET_PAGE_SIZE) {
                bodyJson.pageSize = TARGET_PAGE_SIZE;
                console.log(`[Fetch] 修改pageSize: ${originalPageSize} -> ${TARGET_PAGE_SIZE}`);
                modified = true;
              }
              
              if (bodyJson.orderBy !== 1) {
                bodyJson.orderBy = 1;
                console.log(`[Fetch] 添加orderBy: 1`);
                modified = true;
              }
              
              if (modified) {
                const newPostDataStr = JSON.stringify(bodyJson);
                modifiedPostData = Buffer.from(newPostDataStr, "utf-8").toString("base64");
              } else {
                modifiedPostData = Buffer.from(modifiedPostData, "utf-8").toString("base64");
              }
            } catch (parseErr) {
              console.log(`[Fetch] 无法解析postData，保持原样`);
              modifiedPostData = Buffer.from(modifiedPostData, "utf-8").toString("base64");
            }
          }
          
          await client.send("Fetch.continueRequest", {
            requestId: params.requestId,
            postData: modifiedPostData,
          });
        } catch (err: any) {
          console.log(`[Fetch] continueRequest失败: ${err.message}`);
          
          try {
            await client.send("Fetch.continueRequest", {
              requestId: params.requestId,
            });
          } catch {}
        }
      } else if (params.responseHeaders) {
        console.log(`[Fetch] 拦截响应阶段: ${url.substring(0, 100)}...`);
        
        try {
          const response = await client.send("Fetch.getResponseBody", {
            requestId: params.requestId,
          });
          
          const body = response.base64Encoded
            ? Buffer.from(response.body, "base64").toString("utf-8")
            : response.body;
          
          console.log(`[Fetch] 获取响应体长度: ${body.length}`);
          
          const json = JSON.parse(body);
          const reviews = parseCommentListResponse(json);
          console.log(`[Fetch] 从响应解析 ${reviews.length} 条评价`);
          
          if (reviews.length > 0) {
            capturedReviews.push(...reviews);
          }
          
          await client.send("Fetch.continueRequest", {
            requestId: params.requestId,
          });
        } catch (err: any) {
          console.log(`[Fetch] 处理响应失败: ${err.message}`);
          
          try {
            await client.send("Fetch.continueRequest", {
              requestId: params.requestId,
            });
          } catch {}
        }
      }
    });

    const url = `https://hotels.ctrip.com/hotels/${hotelId}.html`;
    console.log(`[Fetcher] 导航到: ${url}`);
    
    await page.goto(url, { 
      waitUntil: "networkidle0", 
      timeout: 60000 
    });

    console.log("[Fetcher] 页面加载完成，等待评价数据...");

    await sleep(3000);

    await client.send("Fetch.disable");

    const allReviews: CtripReviewData[] = [...capturedReviews];
    let currentPage = 1;
    let hasMore = true;

    if (allReviews.length > 0) {
      console.log(`[Fetcher] 首次加载获取到 ${allReviews.length} 条评价`);
    } else {
      console.log("[Fetcher] 未获取到评价数据");
    }

    currentFetchStatus.progress = {
      currentPage,
      newCount: allReviews.length,
      totalPages: currentPage,
    };

    const continueCondition = shouldFetchMultiplePages 
      ? (currentPage < targetPages && hasMore)
      : (hasMore && allReviews.length >= TARGET_PAGE_SIZE * currentPage);

    while (continueCondition) {
      currentPage++;
      console.log(`[Fetcher] 尝试加载第 ${currentPage} 页...`);
      
      capturedReviews.length = 0;
      
      await triggerNextPage(page);
      await sleep(5000);

      if (capturedReviews.length === 0) {
        console.log("[Fetcher] 未获取到新评价，停止翻页");
        hasMore = false;
        break;
      }

      console.log(`[Fetcher] 第 ${currentPage} 页获取到 ${capturedReviews.length} 条评价`);
      allReviews.push(...capturedReviews);

      currentFetchStatus.progress = {
        currentPage,
        newCount: allReviews.length,
        totalPages: currentPage,
      };

      onProgress?.(currentPage, allReviews.length);

      const nextContinueCondition = shouldFetchMultiplePages 
        ? (currentPage < targetPages && hasMore)
        : (hasMore && allReviews.length >= TARGET_PAGE_SIZE * currentPage);
      
      if (!nextContinueCondition) break;
    }

    await client.detach();
    await closeBrowser();

    console.log(`[Fetcher] 删除酒店 ${hotelId} 的旧评价数据...`);
    await prisma.review.deleteMany({
      where: { hotelId },
    });

    console.log(`[Fetcher] 保存 ${allReviews.length} 条新评价...`);
    await saveReviews(allReviews, hotelId, configId);

    await prisma.config.update({
      where: { id: configId },
      data: {
        lastFetchedAt: new Date(),
        lastFetchedPage: currentPage,
        totalFetched: allReviews.length,
      },
    });

    await prisma.fetchLog.create({
      data: {
        configId,
        hotelId,
        success: true,
        fetchMode: "full",
        newCount: allReviews.length,
        totalFetched: allReviews.length,
        pagesFetched: currentPage,
      },
    });

    if (allReviews.length > 0) {
      const avgScore = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await prisma.hotel.update({
        where: { hotelId },
        data: {
          totalReviews: allReviews.length,
          avgScore,
        },
      });
    }

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      progress: null,
    };
    isFetching = false;

    console.log(`[Fetcher] 完成！获取并保存 ${allReviews.length} 条评价`);
    
    return { reviews: allReviews, totalPages: currentPage, newCount: allReviews.length };
  } catch (error: any) {
    console.error("[Fetcher] 错误:", error.message);
    
    if (client) {
      try {
        await client.send("Fetch.disable");
        await client.detach();
      } catch {}
    }
    
    await closeBrowser();

    await prisma.fetchLog.create({
      data: {
        configId,
        hotelId,
        success: false,
        fetchMode,
        error: error.message,
      },
    });

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      progress: null,
    };
    isFetching = false;

    throw error;
  }
}

async function triggerNextPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    
    const reviewSection = document.querySelector('[class*="comment"], [class*="review"], [class*="CommentList"]');
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    
    const selectors = [
      '[class*="load-more"]',
      '[class*="LoadMore"]',
      'button[class*="more"]',
      '.comment-load-more',
      '.review-load-more',
    ];
    
    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        (btn as HTMLElement).click();
        break;
      }
    }
  });
}

function parseCommentListResponse(json: any): CtripReviewData[] {
  const commentList = json?.data?.commentList || [];
  return commentList.map((item: any) => ({
    commentId: String(item.id),
    rating: item.rating || 0,
    content: item.content || "",
    roomName: item.roomTypeName || null,
    checkInDate: item.checkInDate || null,
    reviewer: item.userInfo?.nickName || null,
    reviewDate: item.createDate || null,
    hasImage: (item.imageList?.length || 0) > 0,
    imageList: item.imageList || [],
    hotelReply: item.feedbackList?.[0]?.content || null,
    rawJson: item,
  }));
}

async function saveReviews(
  reviews: CtripReviewData[],
  hotelId: string,
  configId: number
): Promise<void> {
  for (const review of reviews) {
    try {
      await prisma.review.create({
        data: {
          hotelId,
          configId,
          commentId: review.commentId,
          rating: review.rating,
          content: review.content,
          roomName: review.roomName,
          checkInDate: review.checkInDate,
          reviewer: review.reviewer,
          reviewDate: review.reviewDate,
          hasImage: review.hasImage,
          imageList: JSON.stringify(review.imageList),
          hotelReply: review.hotelReply,
          rawJson: JSON.stringify(review.rawJson),
        },
      });
    } catch (error: any) {
      if (error.code !== "P2002") {
        console.error("Failed to save review:", error);
      }
    }
  }
}