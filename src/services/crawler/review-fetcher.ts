import { Page } from "puppeteer";
import { getPage, sleep, closeBrowser } from "./browser";
import { prisma } from "@/lib/prisma";

const INITIAL_FETCH_PAGES = 5;
const TARGET_PAGE_SIZE = 50;
const CTRIP_COOKIE_KEY = "ctrip_cookie";

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
  currentHotelId: null as number | null,
  currentHotelName: null as string | null,
  currentPlatform: null as string | null,
  progress: null as { currentPage: number; newCount: number; totalPages: number } | null,
};

export function getFetchStatus() {
  return currentFetchStatus;
}

async function getGlobalCtripCookie(): Promise<string | null> {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: CTRIP_COOKIE_KEY },
  });
  return setting?.value ?? null;
}

export async function fetchReviews(
  ctripHotelId: string,
  hotelId: number,
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
    currentPlatform: "ctrip",
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
          const statusCode = params.responseStatusCode;
          if (statusCode && statusCode >= 400) {
            console.log(`[Fetch] 响应状态码异常: ${statusCode}，跳过`);
            await client.send("Fetch.continueResponse", {
              requestId: params.requestId,
            });
            return;
          }

          const response = await client.send("Fetch.getResponseBody", {
            requestId: params.requestId,
          });
          
          const body = response.base64Encoded
            ? Buffer.from(response.body, "base64").toString("utf-8")
            : response.body;
          
          console.log(`[Fetch] 获取响应体长度: ${body.length}`);
          
          if (body.length === 0) {
            console.log(`[Fetch] 响应体为空，携程可能触发了反爬机制，跳过`);
            await client.send("Fetch.continueResponse", {
              requestId: params.requestId,
            });
            return;
          }
          
          try {
            const json = JSON.parse(body);
            const reviews = parseCommentListResponse(json);
            console.log(`[Fetch] 从响应解析 ${reviews.length} 条评价`);
            
            if (reviews.length > 0) {
              capturedReviews.push(...reviews);
            }
          } catch (parseErr: any) {
            console.log(`[Fetch] JSON解析失败: ${parseErr.message}, 响应体前200字符: ${body.substring(0, 200)}`);
          }
          
          await client.send("Fetch.continueResponse", {
            requestId: params.requestId,
          });
        } catch (err: any) {
          console.log(`[Fetch] 处理响应失败: ${err.message}`);
          
          try {
            await client.send("Fetch.continueResponse", {
              requestId: params.requestId,
            });
          } catch {}
        }
      }
    });

    const url = `https://hotels.ctrip.com/hotels/${ctripHotelId}.html`;
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

    console.log(`[Fetcher] 删除酒店 ${hotelId} 的旧携程评价数据...`);
    await prisma.review.deleteMany({
      where: { hotelId, platform: "ctrip" },
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
        platform: "ctrip",
        success: true,
        fetchMode: "cdp",
        newCount: allReviews.length,
        totalFetched: allReviews.length,
        pagesFetched: currentPage,
      },
    });

    await updateHotelStats(hotelId);

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
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
        platform: "ctrip",
        success: false,
        fetchMode,
        error: error.message,
      },
    });

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    throw error;
  }
}

export async function fetchCtripReviewsByApi(
  ctripHotelId: string,
  hotelId: number,
  hotelName: string,
  configId: number,
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
    currentPlatform: "ctrip",
    progress: { currentPage: 0, newCount: 0, totalPages: 0 },
  };

  try {
    const globalCookie = await getGlobalCtripCookie();

    if (!globalCookie) {
      throw new Error("请先在系统设置中配置携程 Cookie");
    }

    let cookieString = globalCookie;
    try {
      const cookies = JSON.parse(cookieString);
      if (Array.isArray(cookies)) {
        cookieString = cookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join("; ");
      }
    } catch {
      console.log("[Ctrip API] Cookie 格式为字符串，直接使用");
    }

    const allReviews: CtripReviewData[] = [];
    let currentPage = 1;
    const maxPages = 10;
    let consecutiveEmptyPages = 0;

    while (currentPage <= maxPages && consecutiveEmptyPages < 2) {
      console.log(`[Ctrip API] 正在获取第 ${currentPage} 页...`);

      const requestBody = {
        hotelId: ctripHotelId,
        pageSize: TARGET_PAGE_SIZE,
        orderBy: 1,
        pageType: "hotelDetail",
        pageIndex: currentPage,
        roomName: "",
        tagType: -1,
        tagId: 0,
        travelType: -1,
        hasImage: false,
        isDetail: false,
      };

      try {
        const response = await fetch(
          "https://m.ctrip.com/restapi/soa2/33278/getHotelCommentList",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "accept-language": "zh-CN,zh;q=0.9",
              cookie: cookieString,
              referer: `https://hotels.ctrip.com/hotels/${ctripHotelId}.html`,
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
              origin: "https://hotels.ctrip.com",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          console.log(`[Ctrip API] 第 ${currentPage} 页请求失败: ${response.status}`);
          break;
        }

        const json = await response.json();

        if (!json || !json.data || !json.data.commentList) {
          console.log(`[Ctrip API] 第 ${currentPage} 页返回数据异常，可能 Cookie 已过期`);
          if (currentPage === 1 && allReviews.length === 0) {
            throw new Error("携程 API 返回数据异常，Cookie 可能已过期，请重新配置");
          }
          break;
        }

        const reviews = parseCommentListResponse(json);
        console.log(`[Ctrip API] 第 ${currentPage} 页获取到 ${reviews.length} 条评价`);

        if (reviews.length === 0) {
          consecutiveEmptyPages++;
          console.log(`[Ctrip API] 连续空页: ${consecutiveEmptyPages}`);
          if (consecutiveEmptyPages >= 2) {
            console.log("[Ctrip API] 连续两页无评价，停止翻页");
            break;
          }
        } else {
          consecutiveEmptyPages = 0;
          allReviews.push(...reviews);
        }

        currentFetchStatus.progress = {
          currentPage,
          newCount: allReviews.length,
          totalPages: currentPage,
        };

        onProgress?.(currentPage, allReviews.length);

        const totalCount = json.data?.totalCount || 0;
        if (totalCount > 0 && allReviews.length >= totalCount) {
          console.log(`[Ctrip API] 已获取全部评价 (${allReviews.length}/${totalCount})`);
          break;
        }

        currentPage++;

        await sleep(1500 + Math.random() * 1000);
      } catch (fetchErr: any) {
        if (fetchErr.message.includes("Cookie")) {
          throw fetchErr;
        }
        console.log(`[Ctrip API] 第 ${currentPage} 页请求异常: ${fetchErr.message}`);
        break;
      }
    }

    console.log(`[Ctrip API] 删除酒店 ${hotelId} 的旧携程评价数据...`);
    await prisma.review.deleteMany({
      where: { hotelId, platform: "ctrip" },
    });

    console.log(`[Ctrip API] 保存 ${allReviews.length} 条新评价...`);
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
        platform: "ctrip",
        success: true,
        fetchMode: "api",
        newCount: allReviews.length,
        totalFetched: allReviews.length,
        pagesFetched: currentPage,
      },
    });

    await updateHotelStats(hotelId);

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    console.log(`[Ctrip API] 完成！获取并保存 ${allReviews.length} 条评价`);

    return { reviews: allReviews, totalPages: currentPage, newCount: allReviews.length };
  } catch (error: any) {
    console.error("[Ctrip API] 错误:", error.message);

    await prisma.fetchLog.create({
      data: {
        configId,
        hotelId,
        platform: "ctrip",
        success: false,
        fetchMode: "api",
        error: error.message,
      },
    });

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    throw error;
  }
}

async function updateHotelStats(hotelId: number): Promise<void> {
  const allPlatformReviews = await prisma.review.findMany({
    where: { hotelId },
    select: { rating: true },
  });

  if (allPlatformReviews.length > 0) {
    const avgScore =
      allPlatformReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
      allPlatformReviews.length;
    await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        totalReviews: allPlatformReviews.length,
        avgScore,
      },
    });
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
  hotelId: number,
  configId: number
): Promise<void> {
  for (const review of reviews) {
    try {
      await prisma.review.create({
        data: {
          hotelId,
          configId,
          commentId: review.commentId,
          platform: "ctrip",
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
