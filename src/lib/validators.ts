import { z } from "zod";

export const hotelSchema = z.object({
  hotelId: z.string().min(1, "酒店ID不能为空"),
  hotelName: z.string().min(1, "酒店名称不能为空"),
  city: z.string().optional(),
});

export const configSchema = z.object({
  hotelId: z.string().min(1, "请选择酒店"),
  fetchIntervalHr: z.number().int().min(1).max(168),
  pageSize: z.number().int().min(10).max(50),
  fetchMode: z.enum(["full", "incremental"]),
  isActive: z.boolean(),
});

export const reviewQuerySchema = z.object({
  hotelId: z.string().optional(),
  rating: z.enum(["all", "good", "neutral", "bad"]).optional(),
  hasReply: z.boolean().optional(),
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(20),
  sortBy: z.enum(["date", "rating"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type HotelInput = z.infer<typeof hotelSchema>;
export type ConfigInput = z.infer<typeof configSchema>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;