export interface Hotel {
  id: number;
  hotelName: string;
  ctripHotelId: string | null;
  fliggyHotelId: string | null;
  platformId: string | null;
  city: string | null;
  onboardDate: string | null;
  totalReviews: number;
  avgScore: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface Config {
  id: number;
  hotelId: number;
  fetchIntervalHr: number;
  pageSize: number;
  fetchMode: "full" | "incremental";
  isActive: boolean;
  lastFetchedAt: Date | null;
  lastFetchedPage: number;
  totalFetched: number;
  createdAt: Date;
}

export interface Review {
  id: number;
  hotelId: number;
  configId: number | null;
  commentId: string;
  platform: string;
  rating: number;
  content: string | null;
  roomName: string | null;
  checkInDate: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  hasImage: boolean;
  imageList: string | null;
  hotelReply: string | null;
  rawJson: string | null;
  createdAt: Date;
}

export interface FetchLog {
  id: number;
  configId: number;
  hotelId: number;
  success: boolean;
  fetchMode: string | null;
  newCount: number;
  totalFetched: number;
  pagesFetched: number;
  error: string | null;
  createdAt: Date;
}

export interface WeeklyStats {
  weekLabel: string;
  weekStart: string;
  totalCount: number;
  goodCount: number;
  neutralCount: number;
  badCount: number;
  avgScore: number;
}

export interface ReviewSummary {
  totalReviews: number;
  avgScore: number;
  goodRate: number;
  badRate: number;
  recent7dCount: number;
  recent30dCount: number;
}

export interface FetchStatus {
  isRunning: boolean;
  currentHotelId: number | null;
  currentHotelName: string | null;
  currentPlatform: string | null;
  progress: {
    currentPage: number;
    newCount: number;
    totalPages: number;
  } | null;
}

export interface CtripReviewData {
  commentId: string;
  rating: number;
  content: string;
  roomName: string | null;
  checkInDate: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  hasImage: boolean;
  hotelReply: string | null;
  rawJson: object;
}

export interface HotelWithStats extends Hotel {
  _count?: {
    reviews: number;
  };
  configs?: Config[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface HotelScoreComparison {
  hotelId: number;
  hotelName: string;
  avgScore: number;
  totalReviews: number;
  goodRate: number;
  neutralRate: number;
  badRate: number;
}

export interface PlatformComparison {
  platform: string;
  platformLabel: string;
  totalReviews: number;
  avgScore: number;
  goodRate: number;
  neutralRate: number;
  badRate: number;
}

export interface SentimentTimeline {
  date: string;
  goodRate: number;
  neutralRate: number;
  badRate: number;
  avgScore: number;
  totalCount: number;
}

export interface ReplyRateTrend {
  date: string;
  totalReviews: number;
  repliedCount: number;
  replyRate: number;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface WordCloudItem {
  text: string;
  value: number;
}

export interface BadReviewItem {
  id: number;
  hotelName: string;
  rating: number;
  content: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  hotelReply: string | null;
  platform: string;
}

export interface WeeklySummaryRequest {
  hotelId?: string;
  weekStart?: string;
  weekEnd?: string;
}

export interface WeeklySummaryResponse {
  success: boolean;
  summary: string;
  weekRange: string;
  hotelName: string;
  generatedAt: string;
}

export interface RemoteHotel {
  platformId: string;
  hotelName: string;
}

export interface TrackCopyEvent {
  platformId: string;
  hotelName: string;
  content: string;
  timestamp: string;
}

export interface TrackMatchResult {
  trackEvent: TrackCopyEvent;
  matchedReview: {
    id: number;
    content: string;
    rating: number;
    platform: string;
    reviewDate: string | null;
    hotelName: string;
  } | null;
  similarity: number;
  hotelId: number | null;
  hotelName: string | null;
}

export interface TrackMatchRequest {
  hotelId?: number;
  platformId?: string;
  minSimilarity?: number;
  pageSize?: number;
  page?: number;
}

export interface TrackMatchStats {
  totalTrackEvents: number;
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number;
  byHotel: { hotelName: string; platformId: string; total: number; matched: number }[];
}

export interface TrackMatchResponse {
  success: boolean;
  stats: TrackMatchStats;
  results: TrackMatchResult[];
  total: number;
  page: number;
  pageSize: number;
}