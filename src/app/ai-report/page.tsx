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
import { Sparkles, Loader2, AlertCircle, CalendarDays, FileText, RefreshCw, Eye } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Hotel {
  id: number;
  hotelName: string;
}

interface SavedReport {
  hotelId: number;
  hotelName: string;
  weekRange: string;
  reviewCount: number;
  avgScore: number | null;
  generatedAt: string;
}

export default function AIReportPage() {
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    summary: string;
    weekRange: string;
    hotelName: string;
    generatedAt: string;
  } | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHotels();
    checkApiKey();
    loadSavedReports();
  }, []);

  const loadHotels = async () => {
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) setHotels(await res.json());
    } catch (err) {
      console.error("加载酒店失败:", err);
    }
  };

  const checkApiKey = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setApiKeyConfigured(!!data.deepseek_api_key);
      }
    } catch (err) {
      console.error("检查设置失败:", err);
    }
  };

  const loadSavedReports = async () => {
    try {
      const res = await fetch("/api/ai/weekly-summary");
      if (res.ok) {
        const data = await res.json();
        if (data.reports) {
          setSavedReports(data.reports);
        }
      }
    } catch (err) {
      console.error("加载已保存报告失败:", err);
    }
  };

  const handleLoadReport = async (hotelId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/weekly-summary?hotelId=${hotelId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      } else {
        setError(data.error || "加载失败");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHotelId !== "all" && apiKeyConfigured) {
      handleLoadReport(parseInt(selectedHotelId));
    } else {
      setReport(null);
    }
  }, [selectedHotelId]);

  const handleGenerate = async () => {
    if (!apiKeyConfigured) return;
    if (selectedHotelId === "all") {
      setError("请先选择一个具体的酒店再生成报告");
      return;
    }

    setGenerating(true);
    setError(null);
    setReport(null);

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekStart = sevenDaysAgo.toISOString().split("T")[0];
      const weekEnd = now.toISOString().split("T")[0];

      const res = await fetch("/api/ai/weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: selectedHotelId, weekStart, weekEnd }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "生成失败");
        return;
      }

      setReport(data);
      loadSavedReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI 评价周报</h2>
            <p className="text-muted-foreground">
              基于 DeepSeek AI 自动生成每周评价摘要报告，每个酒店保留最新一份
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
            <Button
              onClick={handleGenerate}
              disabled={generating || !apiKeyConfigured || selectedHotelId === "all"}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  AI 生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成报告
                </>
              )}
            </Button>
          </div>
        </div>

        {!apiKeyConfigured && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-yellow-800">
                    DeepSeek API Key 未配置
                  </p>
                  <p className="text-sm text-yellow-700">
                    请先前往系统设置页面配置 DeepSeek API Key，才能使用 AI 周报功能。
                  </p>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="mt-2">
                      前往设置
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">操作失败</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {generating && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className="text-muted-foreground">AI 正在分析评价数据，请稍候...</p>
                <p className="text-xs text-muted-foreground">
                  这通常需要 10-30 秒
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {report && !generating && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  评价周报 - {report.hotelName}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {report.weekRange}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="markdown-body">
                <ReactMarkdown>{report.summary}</ReactMarkdown>
              </div>
              <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
                生成时间: {new Date(report.generatedAt).toLocaleString("zh-CN")} · 由 DeepSeek AI 生成
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                加载报告中...
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              已保存的报告
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedReports.length > 0 ? (
              <div className="space-y-3">
                {savedReports.map((r) => (
                  <div
                    key={r.hotelId}
                    className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{r.hotelName}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {r.weekRange}
                        </span>
                        <span>{r.reviewCount} 条评价</span>
                        {r.avgScore && <span>均分 {r.avgScore}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.generatedAt).toLocaleString("zh-CN")}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedHotelId(String(r.hotelId));
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        查看
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedHotelId(String(r.hotelId));
                          setTimeout(() => handleGenerate(), 100);
                        }}
                        disabled={!apiKeyConfigured}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        重新生成
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                {apiKeyConfigured
                  ? "暂无已保存的报告，请选择酒店并点击「生成报告」"
                  : "配置 DeepSeek API Key 后即可生成 AI 评价周报"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
