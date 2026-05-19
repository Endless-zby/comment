import { prisma } from "@/lib/prisma";
import type { TrackCopyEvent, TrackMatchResult, TrackMatchRequest, TrackMatchResponse, TrackMatchStats } from "@/types";

const DEFAULT_ES_URL = "http://10.31.177.15:9200";
const DEFAULT_ES_INDEX = "mobile_hotel_h5_log-*";
const DEFAULT_MIN_SIMILARITY = 70;

async function getEsUrl(): Promise<string> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "es_url" } });
  return setting?.value || DEFAULT_ES_URL;
}

async function getEsIndex(): Promise<string> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "es_index" } });
  return setting?.value || DEFAULT_ES_INDEX;
}

async function getMinSimilarity(): Promise<number> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "track_min_similarity" } });
  return setting?.value ? parseInt(setting.value, 10) : DEFAULT_MIN_SIMILARITY;
}

function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr = new Array(n + 1).fill(0);
  }

  return prev[n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return (lcsLength(a, b) / maxLen) * 100;
}

async function queryTrackEventsFromES(platformId?: string): Promise<TrackCopyEvent[]> {
  const esUrl = await getEsUrl();
  const esIndex = await getEsIndex();

  const must: any[] = [
    { term: { "name.keyword": "复制评价内容" } },
    { exists: { field: "data.platformId" } },
    { exists: { field: "data.other" } },
  ];

  if (platformId) {
    must.push({ term: { "data.platformId": platformId } });
  }

  const response = await fetch(`${esUrl}/${esIndex}/_search?size=10000`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: { bool: { must } },
      _source: ["data.platformId", "data.name", "data.other", "timestamp", "timestampFormat"],
      sort: [{ timestamp: { order: "desc" } }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`ES查询失败: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  const hits = result.hits?.hits || [];

  return hits.map((hit: any) => {
    let content = "";
    try {
      const other = hit._source?.data?.other;
      if (other) {
        const parsed = typeof other === "string" ? JSON.parse(other) : other;
        content = parsed?.content || "";
      }
    } catch {}

    const ts = hit._source?.timestamp;
    let timestamp = "";
    if (typeof ts === "number") {
      timestamp = new Date(ts).toISOString();
    } else if (typeof ts === "string") {
      timestamp = ts;
    }

    return {
      platformId: hit._source?.data?.platformId || "",
      hotelName: hit._source?.data?.name || "",
      content,
      timestamp,
    };
  });
}

export interface TrackEventsResponse {
  success: boolean;
  total: number;
  events: (TrackCopyEvent & { boundHotelName: string | null; boundHotelId: number | null })[];
  byHotel: { hotelName: string; platformId: string; count: number; bound: boolean; boundHotelId: number | null }[];
  timeRange: { earliest: string | null; latest: string | null };
}

export async function queryRawTrackEvents(platformId?: string): Promise<TrackEventsResponse> {
  const events = await queryTrackEventsFromES(platformId);

  const hotels = await prisma.hotel.findMany({
    where: { platformId: { not: null } },
    select: { id: true, hotelName: true, platformId: true },
  });

  const hotelByPlatformId = new Map<string, { id: number; hotelName: string }>();
  for (const h of hotels) {
    if (h.platformId) {
      hotelByPlatformId.set(h.platformId, { id: h.id, hotelName: h.hotelName });
    }
  }

  const enrichedEvents = events.map((e) => {
    const bound = e.platformId ? hotelByPlatformId.get(e.platformId) : null;
    return {
      ...e,
      boundHotelName: bound?.hotelName || null,
      boundHotelId: bound?.id || null,
    };
  });

  const byHotelMap = new Map<string, { hotelName: string; platformId: string; count: number; bound: boolean; boundHotelId: number | null }>();
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const e of enrichedEvents) {
    const key = e.platformId || "unknown";
    const existing = byHotelMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      byHotelMap.set(key, {
        hotelName: e.boundHotelName || e.hotelName || "未绑定酒店",
        platformId: e.platformId || "",
        count: 1,
        bound: e.boundHotelId !== null,
        boundHotelId: e.boundHotelId,
      });
    }

    if (e.timestamp) {
      if (!earliest || e.timestamp < earliest) earliest = e.timestamp;
      if (!latest || e.timestamp > latest) latest = e.timestamp;
    }
  }

  return {
    success: true,
    total: enrichedEvents.length,
    events: enrichedEvents,
    byHotel: Array.from(byHotelMap.values()),
    timeRange: { earliest, latest },
  };
}

export async function matchTrackEvents(request: TrackMatchRequest): Promise<TrackMatchResponse> {
  const minSimilarity = request.minSimilarity || await getMinSimilarity();
  const pageSize = request.pageSize || 50;
  const page = request.page || 1;

  const trackEvents = await queryTrackEventsFromES(request.platformId);

  const hotels = await prisma.hotel.findMany({
    include: { _count: { select: { reviews: true } } },
  });

  const hotelByPlatformId = new Map<string, typeof hotels[0]>();
  for (const hotel of hotels) {
    if (hotel.platformId) {
      hotelByPlatformId.set(hotel.platformId, hotel);
    }
  }

  const results: TrackMatchResult[] = [];

  for (const event of trackEvents) {
    if (!event.content) continue;

    let matchedHotel: typeof hotels[0] | undefined;

    if (event.platformId) {
      matchedHotel = hotelByPlatformId.get(event.platformId);
    }

    if (!matchedHotel && event.hotelName) {
      const kw = event.hotelName.toLowerCase();
      matchedHotel = hotels.find((h) =>
        h.hotelName.toLowerCase().includes(kw) ||
        kw.includes(h.hotelName.toLowerCase())
      );
    }

    if (request.hotelId && matchedHotel?.id !== request.hotelId) {
      if (matchedHotel) {
        results.push({
          trackEvent: event,
          matchedReview: null,
          similarity: 0,
          hotelId: matchedHotel.id,
          hotelName: matchedHotel.hotelName,
        });
      }
      continue;
    }

    if (!matchedHotel) {
      results.push({
        trackEvent: event,
        matchedReview: null,
        similarity: 0,
        hotelId: null,
        hotelName: null,
      });
      continue;
    }

    const reviews = await prisma.review.findMany({
      where: { hotelId: matchedHotel.id, content: { not: null } },
      select: {
        id: true,
        content: true,
        rating: true,
        platform: true,
        reviewDate: true,
        hotel: { select: { hotelName: true } },
      },
    });

    let bestMatch: TrackMatchResult["matchedReview"] = null;
    let bestSimilarity = 0;

    for (const review of reviews) {
      if (!review.content) continue;
      const sim = similarity(event.content, review.content);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatch = {
          id: review.id,
          content: review.content,
          rating: review.rating,
          platform: review.platform,
          reviewDate: review.reviewDate,
          hotelName: review.hotel.hotelName,
        };
      }
    }

    results.push({
      trackEvent: event,
      matchedReview: bestSimilarity >= minSimilarity ? bestMatch : null,
      similarity: Math.round(bestSimilarity * 10) / 10,
      hotelId: matchedHotel.id,
      hotelName: matchedHotel.hotelName,
    });
  }

  const matchedCount = results.filter((r) => r.matchedReview !== null).length;
  const unmatchedCount = results.length - matchedCount;

  const byHotelMap = new Map<string, { hotelName: string; platformId: string; total: number; matched: number }>();
  for (const r of results) {
    const key = r.hotelId?.toString() || r.trackEvent.hotelName || "unknown";
    const existing = byHotelMap.get(key);
    if (existing) {
      existing.total++;
      if (r.matchedReview) existing.matched++;
    } else {
      byHotelMap.set(key, {
        hotelName: r.hotelName || r.trackEvent.hotelName || "未知酒店",
        platformId: r.trackEvent.platformId || "",
        total: 1,
        matched: r.matchedReview ? 1 : 0,
      });
    }
  }

  const stats: TrackMatchStats = {
    totalTrackEvents: results.length,
    matchedCount,
    unmatchedCount,
    matchRate: results.length > 0 ? Math.round((matchedCount / results.length) * 1000) / 10 : 0,
    byHotel: Array.from(byHotelMap.values()),
  };

  const total = results.length;
  const start = (page - 1) * pageSize;
  const pagedResults = results.slice(start, start + pageSize);

  return {
    success: true,
    stats,
    results: pagedResults,
    total,
    page,
    pageSize,
  };
}
