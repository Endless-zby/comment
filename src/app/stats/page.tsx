"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ReferenceLine,
} from "recharts";
import { RefreshCw, AlertTriangle, MessageSquare } from "lucide-react";

const RATING_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#f59e0b",
  4: "#84cc16",
  5: "#22c55e",
};

interface Summary {
  totalReviews: number;
  avgScore: number;
  goodRate: number;
  badRate: number;
  goodCount: number;
  neutralCount: number;
  badCount: number;
  ctripCount: number;
  fliggyCount: number;
  recent7dCount: number;
  recent30dCount: number;
}

interface WeeklyStat {
  weekLabel: string;
  weekStart: string;
  totalCount: number;
  goodCount: number;
  neutralCount: number;
  badCount: number;
  avgScore: number;
}

interface RatingDist {
  rating: number;
  count: number;
  percentage: number;
}

interface PlatformComp {
  platform: string;
  platformLabel: string;
  totalReviews: number;
  avgScore: number;
  goodRate: number;
  neutralRate: number;
  badRate: number;
}

interface ReplyRate {
  date: string;
  totalReviews: number;
  repliedCount: number;
  replyRate: number;
}

interface HeatmapItem {
  date: string;
  count: number;
}

interface BadReview {
  id: number;
  hotelName: string;
  rating: number;
  content: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  hotelReply: string | null;
  platform: string;
}

interface Hotel {
  id: number;
  hotelName: string;
  onboardDate: string | null;
}

export default function StatsPage() {
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [ratingDist, setRatingDist] = useState<RatingDist[]>([]);
  const [platformComp, setPlatformComp] = useState<PlatformComp[]>([]);
  const [replyRate, setReplyRate] = useState<ReplyRate[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [badReviews, setBadReviews] = useState<BadReview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedHotelId, selectedPlatform]);

  const getParams = () => {
    const params = new URLSearchParams();
    if (selectedHotelId !== "all") params.set("hotelId", selectedHotelId);
    if (selectedPlatform !== "all") params.set("platform", selectedPlatform);
    return params.toString();
  };

  const loadHotels = async () => {
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) setHotels(await res.json());
    } catch (err) {
      console.error("加载酒店失败:", err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const qs = getParams();
      const suffix = qs ? `?${qs}` : "";

      const [summaryRes, weeklyRes, ratingRes, platformRes, replyRes, heatmapRes, badRes] =
        await Promise.all([
          fetch(`/api/reviews/summary${suffix}`),
          fetch(`/api/reviews/weekly${suffix}`),
          fetch(`/api/reviews/rating-distribution${suffix}`),
          fetch(`/api/reviews/platform-comparison${suffix}`),
          fetch(`/api/reviews/reply-rate${suffix}`),
          fetch(`/api/reviews/heatmap${suffix}`),
          fetch(`/api/reviews/bad-reviews${qs ? `${suffix}&days=30&limit=10` : "?days=30&limit=10"}`),
        ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (weeklyRes.ok) setWeeklyStats(await weeklyRes.json());
      if (ratingRes.ok) setRatingDist(await ratingRes.json());
      if (platformRes.ok) setPlatformComp(await platformRes.json());
      if (replyRes.ok) setReplyRate(await replyRes.json());
      if (heatmapRes.ok) setHeatmap(await heatmapRes.json());
      if (badRes.ok) setBadReviews(await badRes.json());
    } catch (err) {
      console.error("加载统计数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const pieData = summary
    ? [
        { name: "好评", value: summary.goodCount, color: "#22c55e" },
        { name: "中评", value: summary.neutralCount, color: "#f59e0b" },
        { name: "差评", value: summary.badCount, color: "#ef4444" },
      ]
    : [];

  const chartData = weeklyStats.map((stat) => ({
    week: stat.weekLabel,
    weekLabel: stat.weekLabel,
    weekStart: stat.weekStart,
    good: stat.goodCount,
    neutral: stat.neutralCount,
    bad: stat.badCount,
    avgScore: stat.avgScore,
  }));

  const onboardWeekLabel = getOnboardWeekLabel(hotels, selectedHotelId, weeklyStats);

  const sentimentTimelineData = weeklyStats.map((stat) => ({
    week: stat.weekLabel,
    好评率: stat.totalCount > 0 ? Math.round((stat.goodCount / stat.totalCount) * 100) : 0,
    中评率: stat.totalCount > 0 ? Math.round((stat.neutralCount / stat.totalCount) * 100) : 0,
    差评率: stat.totalCount > 0 ? Math.round((stat.badCount / stat.totalCount) * 100) : 0,
    totalCount: stat.totalCount,
  }));

  const heatmapGrid = buildHeatmapGrid(heatmap);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">评价统计</h2>
            <p className="text-muted-foreground">
              多维度评价数据分析与可视化图表
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="选择酒店" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部酒店</SelectItem>
                {hotels.map((hotel) => (
                  <SelectItem key={hotel.id} value={String(hotel.id)}>
                    {hotel.hotelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                <SelectItem value="ctrip">携程</SelectItem>
                <SelectItem value="fliggy">飞猪</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            </CardContent>
          </Card>
        ) : !summary || summary.totalReviews === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p>暂无评价数据，请先拉取评价</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">总评价数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalReviews ?? 0}</div>
                  {selectedPlatform === "all" && summary && (
                    <div className="text-xs text-muted-foreground mt-1">
                      携程: {summary.ctripCount} · 飞猪: {summary.fliggyCount}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">平均评分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary?.avgScore ? summary.avgScore.toFixed(1) : "-"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">好评率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {summary?.goodRate ?? 0}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">近7天新增</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.recent7dCount ?? 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>周评论增长趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickFormatter={(v: string) => v.replace(/^\d{4}-W/, "W")} angle={-45} textAnchor="end" height={60} interval={0} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="good" name="好评" fill="#22c55e" />
                        <Bar dataKey="neutral" name="中评" fill="#f59e0b" />
                        <Bar dataKey="bad" name="差评" fill="#ef4444" />
                        {onboardWeekLabel && (
                          <ReferenceLine x={onboardWeekLabel} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" label={{ value: "入驻", position: "top", fill: "#8b5cf6", fontSize: 12 }} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>评分趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickFormatter={(v: string) => v.replace(/^\d{4}-W/, "W")} angle={-45} textAnchor="end" height={60} />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          name="平均评分"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                        {onboardWeekLabel && (
                          <ReferenceLine x={onboardWeekLabel} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" label={{ value: "入驻", position: "top", fill: "#8b5cf6", fontSize: 12 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>评价分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>评分分布直方图</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ratingDist} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="rating"
                          type="category"
                          tickFormatter={(v: number) => `${v}星`}
                          width={40}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === "count") return [value, "评价数"];
                            return [value, name];
                          }}
                          labelFormatter={(label: number) => `${label}星`}
                        />
                        <Bar dataKey="count" name="count" radius={[0, 4, 4, 0]}>
                          {ratingDist.map((entry) => (
                            <Cell key={`rating-${entry.rating}`} fill={RATING_COLORS[entry.rating] || "#3b82f6"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>评价情感时间线</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sentimentTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickFormatter={(v: string) => v.replace(/^\d{4}-W/, "W")} angle={-45} textAnchor="end" height={60} />
                        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                        <Area type="monotone" dataKey="好评率" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="中评率" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="差评率" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        {onboardWeekLabel && (
                          <ReferenceLine x={onboardWeekLabel} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" label={{ value: "入驻", position: "top", fill: "#8b5cf6", fontSize: 12 }} />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>酒店回复率趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {replyRate.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={replyRate}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                          <Tooltip formatter={(value: number, name: string) => {
                            if (name === "replyRate") return [`${value}%`, "回复率"];
                            return [value, name === "totalReviews" ? "总评价数" : "已回复数"];
                          }} />
                          <Line
                            type="monotone"
                            dataKey="replyRate"
                            name="replyRate"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        暂无回复率数据
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {platformComp.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>平台评价对比</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={platformComp}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="platformLabel" />
                        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend />
                        <Bar dataKey="goodRate" name="好评率" fill="#22c55e" />
                        <Bar dataKey="neutralRate" name="中评率" fill="#f59e0b" />
                        <Bar dataKey="badRate" name="差评率" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid gap-4 mt-4">
                    {platformComp.map((p) => (
                      <div key={p.platform} className="flex items-center justify-between border rounded-lg p-3">
                        <span className="font-medium">{p.platformLabel}</span>
                        <div className="flex gap-6 text-sm">
                          <span>评价数: <strong>{p.totalReviews}</strong></span>
                          <span>平均分: <strong>{p.avgScore}</strong></span>
                          <span className="text-green-600">好评: {p.goodRate}%</span>
                          <span className="text-red-600">差评: {p.badRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>月度评价热力图 ({new Date().getFullYear()})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {heatmapGrid.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>星期分布：</span>
                        <span className="flex gap-2">
                          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                            <span key={d} className="w-[18px] text-center">{d}</span>
                          ))}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-[3px]">
                        {heatmapGrid.map((item, idx) => (
                          <div
                            key={idx}
                            className="w-[18px] h-[18px] rounded-sm"
                            style={{ backgroundColor: item.color }}
                            title={`${item.date}: ${item.count} 条评价`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>少</span>
                        <div className="w-[14px] h-[14px] rounded-sm" style={{ backgroundColor: "#ebedf0" }} />
                        <div className="w-[14px] h-[14px] rounded-sm" style={{ backgroundColor: "#9be9a8" }} />
                        <div className="w-[14px] h-[14px] rounded-sm" style={{ backgroundColor: "#40c463" }} />
                        <div className="w-[14px] h-[14px] rounded-sm" style={{ backgroundColor: "#30a14e" }} />
                        <div className="w-[14px] h-[14px] rounded-sm" style={{ backgroundColor: "#216e39" }} />
                        <span>多</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      暂无热力图数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  差评预警（近30天）
                </CardTitle>
              </CardHeader>
              <CardContent>
                {badReviews.length > 0 ? (
                  <div className="space-y-3">
                    {badReviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{review.hotelName}</span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                review.rating <= 1
                                  ? "bg-red-100 text-red-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {review.rating}星
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {review.platform === "ctrip" ? "携程" : "飞猪"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{review.reviewDate || "未知日期"}</span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {review.content || "无内容"}
                        </p>
                        {review.hotelReply ? (
                          <p className="text-sm text-blue-600 line-clamp-1">
                            酒店回复: {review.hotelReply}
                          </p>
                        ) : (
                          <p className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            未回复
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 text-muted-foreground">
                    近30天无差评，太棒了！
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function getOnboardWeekLabel(
  hotels: Hotel[],
  selectedHotelId: string,
  weeklyStats: WeeklyStat[]
): string | null {
  if (selectedHotelId === "all") return null;
  const hotel = hotels.find((h) => h.id === parseInt(selectedHotelId));
  if (!hotel?.onboardDate) return null;
  if (weeklyStats.length === 0) return null;

  const onboardStr = hotel.onboardDate;

  const sorted = [...weeklyStats].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const exactMatch = sorted.find((s) => s.weekStart <= onboardStr && onboardStr < getNextWeekStart(s.weekStart));
  if (exactMatch) {
    return exactMatch.weekLabel;
  }

  const laterWeek = sorted.find((s) => s.weekStart > onboardStr);
  if (laterWeek) {
    return laterWeek.weekLabel;
  }

  return sorted[sorted.length - 1].weekLabel;
}

function getNextWeekStart(weekStart: string): string {
  const parts = weekStart.split("-");
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildHeatmapGrid(data: HeatmapItem[]): Array<{ date: string; count: number; color: string }> {
  if (data.length === 0) return [];

  const countMap = new Map<string, number>();
  data.forEach((item) => countMap.set(item.date, item.count));

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const today = new Date();

  const result: Array<{ date: string; count: number; color: string }> = [];
  const current = new Date(startDate);

  while (current <= endDate && current <= today) {
    const dateStr = current.toISOString().split("T")[0];
    const count = countMap.get(dateStr) || 0;
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCount) * 4));
    const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
    result.push({ date: dateStr, count, color: colors[level] });
    current.setDate(current.getDate() + 1);
  }

  return result;
}
