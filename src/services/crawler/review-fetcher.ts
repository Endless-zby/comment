import { Page } from "puppeteer";
import { getPage, sleep, closeBrowser } from "./browser";
import { prisma } from "@/lib/prisma";

const TARGET_PAGE_SIZE = 100;
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

    const globalCookie = await getGlobalCtripCookie();
    if (globalCookie) {
      console.log("[Fetcher] 注入携程Cookie...");
      try {
        const cookieObj = JSON.parse(globalCookie);
        if (Array.isArray(cookieObj)) {
          const cookies = cookieObj.map((c: any) => ({
            name: c.name,
            value: c.value,
            domain: c.domain || ".ctrip.com",
            path: c.path || "/",
          }));
          await page.setCookie(...cookies);
        } else {
          const cookies = globalCookie.split(";").map((pair: string) => {
            const [name, ...rest] = pair.trim().split("=");
            return {
              name: name.trim(),
              value: rest.join("=").trim(),
              domain: ".ctrip.com",
              path: "/",
            };
          }).filter((c: any) => c.name && c.value);
          await page.setCookie(...cookies);
        }
      } catch (cookieErr: any) {
        console.log(`[Fetcher] Cookie注入失败: ${cookieErr.message}`);
      }
    } else {
      console.log("[Fetcher] 未配置携程Cookie，可能被反爬拦截");
    }

    const existingCount = await prisma.review.count({ where: { hotelId } });
    
    console.log(`[Fetcher] 本地评价数: ${existingCount}, 目标pageSize: ${TARGET_PAGE_SIZE}`);

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
        console.log(`[Fetch] 拦截请求: ${url.substring(0, 80)}...`);
        
        try {
          let postData = params.request.postData;
          
          if (postData) {
            try {
              const bodyJson = JSON.parse(postData);
              let modified = false;
              
              if (bodyJson.pageSize && bodyJson.pageSize !== TARGET_PAGE_SIZE) {
                console.log(`[Fetch] 修改pageSize: ${bodyJson.pageSize} -> ${TARGET_PAGE_SIZE}`);
                bodyJson.pageSize = TARGET_PAGE_SIZE;
                modified = true;
              }
              
              if (bodyJson.orderBy !== 1) {
                console.log(`[Fetch] 添加orderBy: 1`);
                bodyJson.orderBy = 1;
                modified = true;
              }
              
              if (modified) {
                postData = Buffer.from(JSON.stringify(bodyJson), "utf-8").toString("base64");
              }
            } catch (parseErr) {
              console.log(`[Fetch] postData解析失败，保持原样`);
            }
          }
          
          await client.send("Fetch.continueRequest", {
            requestId: params.requestId,
            postData,
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
        console.log(`[Fetch] 拦截响应: ${url.substring(0, 80)}...`);
        
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
          
          console.log(`[Fetch] 响应体长度: ${body.length}`);
          
          if (body.length === 0) {
            console.log(`[Fetch] 响应体为空，携程反爬拦截`);
            await client.send("Fetch.continueResponse", {
              requestId: params.requestId,
            });
            return;
          }
          
          try {
            const json = JSON.parse(body);
            const reviews = parseCommentListResponse(json);
            console.log(`[Fetch] 解析到 ${reviews.length} 条评价`);
            
            if (reviews.length > 0) {
              capturedReviews.push(...reviews);
            }
          } catch (parseErr: any) {
            console.log(`[Fetch] JSON解析失败: ${parseErr.message}, 前200字符: ${body.substring(0, 200)}`);
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
    
    try {
      await page.goto(url, { 
        waitUntil: "networkidle2", 
        timeout: 60000 
      });
    } catch (navErr: any) {
      console.log(`[Fetcher] 页面导航异常: ${navErr.message}，继续尝试获取数据...`);
    }

    console.log("[Fetcher] 页面加载完成，等待评价API响应...");

    await sleep(8000);

    await client.send("Fetch.disable");

    const seenIds = new Set<string>();
    const allReviews: CtripReviewData[] = [];
    for (const r of capturedReviews) {
      if (!seenIds.has(r.commentId)) {
        seenIds.add(r.commentId);
        allReviews.push(r);
      }
    }

    if (allReviews.length > 0) {
      console.log(`[Fetcher] 获取到 ${allReviews.length} 条评价（去重后）`);
    } else {
      console.log("[Fetcher] 未获取到评价数据，可能被反爬拦截");
    }

    currentFetchStatus.progress = {
      currentPage: 1,
      newCount: allReviews.length,
      totalPages: 1,
    };

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
        lastFetchedPage: 1,
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
        pagesFetched: 1,
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
    
    return { reviews: allReviews, totalPages: 1, newCount: allReviews.length };
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
    const cid = `${Date.now()}.${Math.random().toString(36).substring(2, 14)}`;

    const requestBody = {
      hotelId: ctripHotelId,
      pageIndex: 1,
      pageSize: 100,
      repeatComment: 1,
      needStaticInfo: false,
      functionOptions: [
        "integratedTopComment",
        "ctripIntegratedExpediaTaList",
      ],
      orderBy: 1,
      head: {
        platform: "PC",
        cver: "0",
        cid: cid,
        bu: "HBU",
        group: "ctrip",
        aid: "",
        sid: "",
        ouid: "",
        locale: "zh-CN",
        timezone: "8",
        currency: "CNY",
        pageId: "102003",
        vid: cid,
        guid: "",
        isSSR: false,
      },
    };

    const response = await fetch(
      "https://m.ctrip.com/restapi/soa2/33278/getHotelCommentList",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`携程 API 请求失败: ${response.status}`);
    }

    const json = await response.json();

    const status = json?.ResponseStatus;
    if (status?.Ack === "Failure") {
      const msgs = (status.Errors || []).map((e: any) => e.Message || "unknown").join("; ");
      throw new Error(`携程 API SOA 错误: ${msgs}`);
    }

    if (!json || !json.data || !json.data.commentList) {
      throw new Error("携程 API 返回数据异常，请检查网络或稍后重试");
    }

    const allReviews = parseCommentListResponse(json);
    console.log(`[Ctrip API] 获取到 ${allReviews.length} 条评价`);

    currentFetchStatus.progress = {
      currentPage: 1,
      newCount: allReviews.length,
      totalPages: 1,
    };

    onProgress?.(1, allReviews.length);

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
        lastFetchedPage: 1,
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
        pagesFetched: 1,
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

    return { reviews: allReviews, totalPages: 1, newCount: allReviews.length };
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
