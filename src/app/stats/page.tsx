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
} from "recharts";
import { RefreshCw } from "lucide-react";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

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

interface Hotel {
  id: number;
  hotelName: string;
}

export default function StatsPage() {
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedHotelId, selectedPlatform]);

  const loadHotels = async () => {
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) {
        const data = await res.json();
        setHotels(data);
      }
    } catch (err) {
      console.error("加载酒店失败:", err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHotelId !== "all") {
        params.set("hotelId", selectedHotelId);
      }
      if (selectedPlatform !== "all") {
        params.set("platform", selectedPlatform);
      }

      const queryString = params.toString();
      const suffix = queryString ? `?${queryString}` : "";

      const [summaryRes, weeklyRes] = await Promise.all([
        fetch(`/api/reviews/summary${suffix}`),
        fetch(`/api/reviews/weekly${suffix}`),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        setWeeklyStats(data);
      }
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
    week: stat.weekLabel.replace(/^\d{4}-W/, "W"),
    good: stat.goodCount,
    neutral: stat.neutralCount,
    bad: stat.badCount,
    avgScore: stat.avgScore,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">评价统计</h2>
            <p className="text-muted-foreground">
              以周为单位的评论增长统计图表（支持携程和飞猪平台）
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
            <Card>
              <CardHeader>
                <CardTitle>
                  周评论增长趋势
                  {selectedPlatform !== "all" && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({selectedPlatform === "fliggy" ? "飞猪" : "携程"})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="good" name="好评" fill="#22c55e" />
                      <Bar dataKey="neutral" name="中评" fill="#f59e0b" />
                      <Bar dataKey="bad" name="差评" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>评分趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          name="平均评分"
                          stroke="#3b82f6"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>评价分布</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
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
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}