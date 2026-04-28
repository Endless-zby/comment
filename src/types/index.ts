export interface Hotel {
  id: number;
  hotelName: string;
  ctripHotelId: string | null;
  fliggyHotelId: string | null;
  city: string | null;
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