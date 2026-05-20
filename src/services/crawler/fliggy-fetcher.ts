import { Page } from "puppeteer";
import { getPage, sleep, closeBrowser, getBrowser } from "./browser";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const FLIGGY_COOKIES_FILE = path.join(process.cwd(), "data", "fliggy-cookies.json");
const TARGET_PAGE_SIZE = 20;
const FLIGGY_COOKIE_KEY = "fliggy_cookie";

async function getGlobalFliggyCookie(): Promise<string | null> {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: FLIGGY_COOKIE_KEY },
  });
  return setting?.value ?? null;
}

interface FliggyReviewData {
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
  reviews: FliggyReviewData[];
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

export function getFliggyFetchStatus() {
  return currentFetchStatus;
}

async function saveCookies(cookies: any[]) {
  const dir = path.dirname(FLIGGY_COOKIES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(FLIGGY_COOKIES_FILE, JSON.stringify(cookies, null, 2));
}

async function loadCookies(): Promise<any[] | null> {
  if (fs.existsSync(FLIGGY_COOKIES_FILE)) {
    const content = fs.readFileSync(FLIGGY_COOKIES_FILE, "utf-8");
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}

async function checkLoginStatus(page: Page): Promise<boolean> {
  try {
    const loginIndicator = await page.$(".login-btn, .member-login, .user-info, .login-wrap");
    if (loginIndicator) {
      return false;
    }
    
    const memberInfo = await page.$(".member-name, .user-name, .nick-name, .member-nick, [class*='member']");
    return !!memberInfo;
  } catch {
    return false;
  }
}

async function waitForLogin(page: Page): Promise<boolean> {
  console.log("[Fliggy] 等待用户登录...");
  
  const maxWaitTime = 120000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const pageContent = await page.content();
      const hasQrcode = pageContent.includes("qrcode") || pageContent.includes("二维码");
      const hasLoginBtn = await page.$(".login-btn, .login-wrap, [class*='login']");
      
      console.log(`[Fliggy] 页面状态: 二维码=${hasQrcode}, 登录按钮=${!!hasLoginBtn}`);
      
      const isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) {
        console.log("[Fliggy] 登录成功！");
        
        const browser = await getBrowser("stealth");
        const cookies = await browser.cookies();
        await saveCookies(cookies);
        
        return true;
      }
      
      if (hasQrcode) {
        console.log("[Fliggy] 检测到二维码，请在浏览器中扫码登录");
      }
    } catch (err) {
      console.log(`[Fliggy] 检测登录状态出错: ${err}`);
    }
    
    await sleep(3000);
  }
  
  console.log("[Fliggy] 登录超时");
  return false;
}

function parseJsonpResponse(body: string): any {
  let trimmedBody = body.trim();
  
  while (trimmedBody.startsWith('\n') || trimmedBody.startsWith('\r')) {
    trimmedBody = trimmedBody.slice(1);
  }
  trimmedBody = trimmedBody.trim();
  
  console.log(`[Fliggy] 响应体前50字符: ${trimmedBody.substring(0, 50)}`);
  
  try {
    const json = JSON.parse(trimmedBody);
    return json;
  } catch {
    const jsonpMatch = trimmedBody.match(/^[a-zA-Z0-9_]+\((.+)\)$/s);
    if (jsonpMatch) {
      console.log(`[Fliggy] 检测到JSONP格式，函数名匹配成功`);
      try {
        return JSON.parse(jsonpMatch[1]);
      } catch (e) {
        console.log(`[Fliggy] JSONP内容解析失败: ${e}`);
        return null;
      }
    }
    
    const looseMatch = trimmedBody.match(/\((.+)\)/s);
    if (looseMatch) {
      console.log(`[Fliggy] 使用宽松匹配提取JSON`);
      try {
        return JSON.parse(looseMatch[1]);
      } catch (e) {
        console.log(`[Fliggy] 松散匹配解析失败: ${e}`);
        return null;
      }
    }
    
    console.log("[Fliggy] 无法识别响应格式");
    return null;
  }
}

function parseFliggyCommentResponse(json: any): FliggyReviewData[] {
  const reviews: FliggyReviewData[] = [];
  
  if (!json || !json.comments || !Array.isArray(json.comments)) {
    return reviews;
  }
  
  for (const item of json.comments) {
    const totalScore = item.totalScore || 0;
    const rating = totalScore / 2;
    
    const content = (item.content || item.title || "").trim();
    
    const photos = item.photos || [];
    const hasImage = photos.length > 0;
    
    let hotelReply = null;
    if (item.replies && item.replies.length > 0) {
      const reply = item.replies.find((r: any) => r.replyType === 2);
      if (reply) {
        hotelReply = reply.content || null;
      }
    }
    
    const review: FliggyReviewData = {
      commentId: `fliggy_${item.rateId || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rating,
      content,
      roomName: null,
      checkInDate: null,
      reviewer: item.user?.nick || null,
      reviewDate: item.date || null,
      hasImage,
      imageList: photos,
      hotelReply,
      rawJson: item,
    };
    
    reviews.push(review);
  }
  
  return reviews;
}

async function saveReviews(reviews: FliggyReviewData[], hotelId: number, configId: number, hotelName: string) {
  for (const review of reviews) {
    const saved = await prisma.review.create({
      data: {
        hotelId,
        configId,
        commentId: review.commentId,
        platform: "fliggy",
        rating: review.rating,
        content: review.content,
        roomName: review.roomName,
        checkInDate: review.checkInDate,
        reviewer: review.reviewer,
        reviewDate: review.reviewDate,
        hasImage: review.hasImage,
        imageList: review.imageList.length > 0 ? JSON.stringify(review.imageList) : null,
        hotelReply: review.hotelReply,
        rawJson: JSON.stringify(review.rawJson),
      },
    });

    if (review.rating < 3) {
      await prisma.alert.create({
        data: {
          hotelId,
          reviewId: saved.id,
          hotelName,
          platform: "fliggy",
          rating: review.rating,
          content: (review.content || "").substring(0, 200),
        },
      });
      console.log(`[Fliggy] 差评预警: ${review.rating}星 - ${(review.content || "").substring(0, 50)}`);
    }
  }
}

export async function fetchFliggyReviews(
  fliggyHotelId: string,
  hotelId: number,
  hotelName: string,
  configId: number,
  pageSize: number = TARGET_PAGE_SIZE,
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
    currentPlatform: "fliggy",
    progress: { currentPage: 0, newCount: 0, totalPages: 0 },
  };

  let client: any = null;

  try {
    await closeBrowser();
    
    const page = await getPage("stealth");
    const capturedReviews: FliggyReviewData[] = [];

    const globalCookie = await getGlobalFliggyCookie();
    if (globalCookie) {
      console.log("[Fliggy] 注入飞猪Cookie...");
      try {
        const cookieObj = JSON.parse(globalCookie);
        if (Array.isArray(cookieObj) && cookieObj.length > 0) {
          const cookies = cookieObj.map((c: any) => ({
            name: c.name,
            value: c.value,
            domain: c.domain || ".alitrip.com",
            path: c.path || "/",
          }));
          await page.setCookie(...cookies);
        } else {
          const cookies = globalCookie.split(";").map((pair: string) => {
            const [name, ...rest] = pair.trim().split("=");
            return {
              name: name.trim(),
              value: rest.join("=").trim(),
              domain: ".alitrip.com",
              path: "/",
            };
          }).filter((c: any) => c.name && c.value);
          await page.setCookie(...cookies);
        }
      } catch (cookieErr: any) {
        console.log(`[Fliggy] Cookie注入失败: ${cookieErr.message}`);
        const savedCookies = await loadCookies();
        if (savedCookies && savedCookies.length > 0) {
          console.log("[Fliggy] 加载保存的cookies...");
          const cookies = savedCookies.map((c: any) => ({
            name: c.name,
            value: c.value,
            domain: c.domain || ".alitrip.com",
            path: c.path || "/",
          }));
          await page.setCookie(...cookies);
        }
      }
    } else {
      console.log("[Fliggy] 未配置飞猪Cookie，可能需要扫码登录");
      const savedCookies = await loadCookies();
      if (savedCookies && savedCookies.length > 0) {
        console.log("[Fliggy] 加载保存的cookies...");
        const cookies = savedCookies.map((c: any) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || ".alitrip.com",
          path: c.path || "/",
        }));
        await page.setCookie(...cookies);
      }
    }

    const url = `https://hotel.alitrip.com/hotel_detail2.htm?shid=${fliggyHotelId}&_output_charset=utf8`;
    console.log(`[Fliggy] 导航到: ${url}`);
    
    console.log("[Fliggy] 启用CDP拦截...");
    client = await page.target().createCDPSession();
    
    await client.send("Fetch.enable", {
      patterns: [
        {
          urlPattern: "*getHotelRates*",
          requestStage: "Response",
        },
        {
          urlPattern: "*hotelRates*",
          requestStage: "Response",
        },
      ],
    });

    client.on("Fetch.requestPaused", async (params: any) => {
      const url = params.request.url;
      
      if (params.responseHeaders) {
        console.log(`[Fliggy] 拦截响应: ${url.substring(0, 100)}...`);
        
        try {
          const response = await client.send("Fetch.getResponseBody", {
            requestId: params.requestId,
          });
          
          const body = response.base64Encoded
            ? Buffer.from(response.body, "base64").toString("utf-8")
            : response.body;
          
          console.log(`[Fliggy] 响应体长度: ${body.length}`);
          
          try {
            const json = parseJsonpResponse(body);
            const reviews = parseFliggyCommentResponse(json);
            console.log(`[Fliggy] 解析到 ${reviews.length} 条评价`);
            
            if (reviews.length > 0) {
              capturedReviews.push(...reviews);
            }
          } catch (parseErr) {
            console.log(`[Fliggy] JSON解析失败: ${parseErr}`);
          }
          
          await client.send("Fetch.continueRequest", {
            requestId: params.requestId,
          });
        } catch (err: any) {
          console.log(`[Fliggy] 处理响应失败: ${err.message}`);
          
          try {
            await client.send("Fetch.continueRequest", {
              requestId: params.requestId,
            });
          } catch {}
        }
      } else {
        await client.send("Fetch.continueRequest", {
          requestId: params.requestId,
        });
      }
    });

    await page.goto(url, { 
      waitUntil: "networkidle0", 
      timeout: 60000 
    });

    await sleep(2000);

    const isLoggedIn = await checkLoginStatus(page);
    if (!isLoggedIn) {
      console.log("[Fliggy] 未登录，等待用户登录...");
      const loginSuccess = await waitForLogin(page);
      if (!loginSuccess) {
        throw new Error("飞猪登录超时，请手动登录后重试");
      }
      
      console.log("[Fliggy] 登录成功，刷新页面...");
      await page.goto(url, { 
        waitUntil: "networkidle0", 
        timeout: 60000 
      });
      await sleep(2000);
    }

    const existingCount = await prisma.review.count({ 
      where: { hotelId, platform: "fliggy" } 
    });
    const shouldFetchMultiplePages = existingCount === 0;
    const targetPages = shouldFetchMultiplePages ? 5 : 1;
    
    console.log(`[Fliggy] 本地飞猪评价数: ${existingCount}, 目标页数: ${targetPages}`);

    console.log("[Fliggy] 页面加载完成，等待评价数据...");
    await sleep(3000);

    await client.send("Fetch.disable");

    const allReviews: FliggyReviewData[] = [...capturedReviews];
    let currentPage = 1;
    let hasMore = true;

    if (allReviews.length > 0) {
      console.log(`[Fliggy] 首次加载获取到 ${allReviews.length} 条评价`);
    } else {
      console.log("[Fliggy] 未获取到评价数据");
    }

    currentFetchStatus.progress = {
      currentPage,
      newCount: allReviews.length,
      totalPages: currentPage,
    };

    while (hasMore && currentPage < targetPages) {
      currentPage++;
      console.log(`[Fliggy] 尝试加载第 ${currentPage} 页...`);
      
      capturedReviews.length = 0;
      
      await triggerFliggyNextPage(page);
      await sleep(5000);

      if (capturedReviews.length === 0) {
        console.log("[Fliggy] 未获取到新评价，停止翻页");
        hasMore = false;
        break;
      }

      console.log(`[Fliggy] 第 ${currentPage} 页获取到 ${capturedReviews.length} 条评价`);
      allReviews.push(...capturedReviews);

      currentFetchStatus.progress = {
        currentPage,
        newCount: allReviews.length,
        totalPages: currentPage,
      };

      onProgress?.(currentPage, allReviews.length);
    }

    await client.detach();
    await closeBrowser();

    console.log(`[Fliggy] 删除酒店 ${hotelId} 的旧飞猪评价数据...`);
    await prisma.review.deleteMany({
      where: { hotelId, platform: "fliggy" },
    });

    console.log(`[Fliggy] 保存 ${allReviews.length} 条新评价...`);
    await saveReviews(allReviews, hotelId, configId, hotelName);

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
        platform: "fliggy",
        success: true,
        fetchMode: "full",
        newCount: allReviews.length,
        totalFetched: allReviews.length,
        pagesFetched: currentPage,
      },
    });

    const allPlatformReviews = await prisma.review.findMany({
      where: { hotelId },
      select: { rating: true },
    });

    if (allPlatformReviews.length > 0) {
      const avgScore = allPlatformReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allPlatformReviews.length;
      await prisma.hotel.update({
        where: { id: hotelId },
        data: {
          totalReviews: allPlatformReviews.length,
          avgScore,
        },
      });
    }

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    console.log(`[Fliggy] 完成！获取并保存 ${allReviews.length} 条评价`);
    
    return { reviews: allReviews, totalPages: currentPage, newCount: allReviews.length };
  } catch (error: any) {
    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    await closeBrowser();

    await prisma.fetchLog.create({
      data: {
        configId,
        hotelId,
        platform: "fliggy",
        success: false,
        fetchMode: "full",
        newCount: 0,
        totalFetched: 0,
        pagesFetched: 0,
        error: error.message,
      },
    });

    throw error;
  }
}

async function triggerFliggyNextPage(page: Page) {
  try {
    const nextButton = await page.$(".next-page, .pagination-next, [class*='next']");
    if (nextButton) {
      await nextButton.click();
      console.log("[Fliggy] 点击下一页按钮");
      return;
    }

    const pagination = await page.$(".pagination, .pager, [class*='pagination']");
    if (pagination) {
      const currentPageNum = await pagination.$eval(".current, .active, [class*='current']", (el) => el.textContent);
      const nextPageNum = parseInt(currentPageNum || "1") + 1;
      
      const nextPageLink = await pagination.$(`a[data-page="${nextPageNum}"], li[data-page="${nextPageNum}"]`);
      if (nextPageLink) {
        await nextPageLink.click();
        console.log(`[Fliggy] 点击第 ${nextPageNum} 页链接`);
        return;
      }
    }

    console.log("[Fliggy] 未找到翻页元素，尝试滚动加载更多");
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  } catch (err) {
    console.log(`[Fliggy] 翻页失败: ${err}`);
  }
}

export async function fetchFliggyReviewsByApi(
  fliggyHotelId: string,
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
    currentPlatform: "fliggy",
    progress: { currentPage: 0, newCount: 0, totalPages: 0 },
  };

  try {
    const globalCookie = await getGlobalFliggyCookie();

    if (!globalCookie) {
      throw new Error("请先在系统设置中配置飞猪 Cookie");
    }

    let cookieString = globalCookie;
    try {
      const cookies = JSON.parse(cookieString);
      if (Array.isArray(cookies)) {
        cookieString = cookies.map(c => `${c.name}=${c.value}`).join("; ");
      }
    } catch {
      console.log("[Fliggy API] Cookie 格式为字符串，直接使用");
    }

    const allReviews: FliggyReviewData[] = [];
    const totalPages = 4;

    for (let page = 1; page <= totalPages; page++) {
      console.log(`[Fliggy API] 正在获取第 ${page} 页...`);

      const timestamp = Date.now();
      const ksTS = `${timestamp}_715`;
      const callback = `jsonp716`;
      const url = `https://hotel.alitrip.com/ajax/getHotelRates.htm?shid=${fliggyHotelId}&showContent=0&rateScore=0&sort=1&page=${page}&_ksTS=${ksTS}&callback=${callback}`;

      const response = await fetch(url, {
        headers: {
          'accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
          'accept-language': 'zh-CN,zh;q=0.9',
          'cookie': cookieString,
          'referer': `https://hotel.alitrip.com/hotel_detail2.htm?shid=${fliggyHotelId}&_output_charset=utf8`,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          'x-requested-with': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        console.log(`[Fliggy API] 第 ${page} 页请求失败: ${response.status}`);
        break;
      }

      const body = await response.text();
      const json = parseJsonpResponse(body);

      if (!json || json.code !== 0) {
        console.log(`[Fliggy API] 第 ${page} 页解析失败或返回错误`);
        break;
      }

      const reviews = parseFliggyCommentResponse(json);
      console.log(`[Fliggy API] 第 ${page} 页获取到 ${reviews.length} 条评价`);

      if (reviews.length === 0) {
        console.log("[Fliggy API] 没有更多评价，停止翻页");
        break;
      }

      allReviews.push(...reviews);

      currentFetchStatus.progress = {
        currentPage: page,
        newCount: allReviews.length,
        totalPages: totalPages,
      };

      onProgress?.(page, allReviews.length);

      await sleep(500);
    }

    console.log(`[Fliggy API] 删除酒店 ${hotelId} 的旧飞猪评价数据...`);
    await prisma.review.deleteMany({
      where: { hotelId, platform: "fliggy" },
    });

    console.log(`[Fliggy API] 保存 ${allReviews.length} 条新评价...`);
    await saveReviews(allReviews, hotelId, configId, hotelName);

    await prisma.config.update({
      where: { id: configId },
      data: {
        lastFetchedAt: new Date(),
        lastFetchedPage: totalPages,
        totalFetched: allReviews.length,
      },
    });

    await prisma.fetchLog.create({
      data: {
        configId,
        hotelId,
        platform: "fliggy",
        success: true,
        fetchMode: "api",
        newCount: allReviews.length,
        totalFetched: allReviews.length,
        pagesFetched: totalPages,
      },
    });

    const allPlatformReviews = await prisma.review.findMany({
      where: { hotelId },
      select: { rating: true },
    });

    if (allPlatformReviews.length > 0) {
      const avgScore = allPlatformReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allPlatformReviews.length;
      await prisma.hotel.update({
        where: { id: hotelId },
        data: {
          totalReviews: allPlatformReviews.length,
          avgScore,
        },
      });
    }

    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    console.log(`[Fliggy API] 完成！获取并保存 ${allReviews.length} 条评价`);

    return { reviews: allReviews, totalPages: totalPages, newCount: allReviews.length };
  } catch (error: any) {
    currentFetchStatus = {
      isRunning: false,
      currentHotelId: null,
      currentHotelName: null,
      currentPlatform: null,
      progress: null,
    };
    isFetching = false;

    await prisma.fetchLog.create({
      data: {
        configId,
        hotelId,
        platform: "fliggy",
        success: false,
        fetchMode: "api",
        newCount: 0,
        totalFetched: 0,
        pagesFetched: 0,
        error: error.message,
      },
    });

    throw error;
  }
}