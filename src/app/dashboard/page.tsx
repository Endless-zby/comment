"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MessageSquare, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

interface DashboardStats {
  totalHotels: number;
  totalReviews: number;
  avgScore: number;
  badReviews: number;
  hotelStats: Array<{
    id: number;
    hotelName: string;
    ctripHotelId: string | null;
    fliggyHotelId: string | null;
    totalReviews: number;
    avgScore: number | null;
    isActive: boolean;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">评价仪表盘</h2>
            <p className="text-muted-foreground">
              概览所有监控酒店的评价状态
            </p>
          </div>
          <Button variant="outline" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">监控酒店</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalHotels ?? 0}</div>
              <p className="text-xs text-muted-foreground">已添加酒店数量</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总评价数</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReviews ?? 0}</div>
              <p className="text-xs text-muted-foreground">已拉取评价总数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均评分</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.avgScore ? stats.avgScore.toFixed(1) : "-"}
              </div>
              <p className="text-xs text-muted-foreground">所有酒店平均评分</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">差评数</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats?.badReviews ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">1-2星评价数量</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>酒店评价概览</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : !stats || stats.hotelStats.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>暂无监控酒店，请先添加酒店</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">酒店名称</th>
                      <th className="text-left py-3 px-4 font-medium">平台ID</th>
                      <th className="text-left py-3 px-4 font-medium">评价数</th>
                      <th className="text-left py-3 px-4 font-medium">平均评分</th>
                      <th className="text-left py-3 px-4 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.hotelStats.map((hotel) => (
                      <tr key={hotel.id} className="border-b">
                        <td className="py-3 px-4">{hotel.hotelName}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {hotel.ctripHotelId && `携程: ${hotel.ctripHotelId}`}
                          {hotel.ctripHotelId && hotel.fliggyHotelId && " · "}
                          {hotel.fliggyHotelId && `飞猪: ${hotel.fliggyHotelId}`}
                          {!hotel.ctripHotelId && !hotel.fliggyHotelId && "未配置"}
                        </td>
                        <td className="py-3 px-4">{hotel.totalReviews}</td>
                        <td className="py-3 px-4">
                          {hotel.avgScore ? hotel.avgScore.toFixed(1) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                              hotel.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {hotel.isActive ? "启用" : "禁用"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}