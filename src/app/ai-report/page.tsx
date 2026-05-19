"use client";

import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, AlertCircle, CalendarDays, FileText, RefreshCw, Eye, ChevronLeft, ChevronRight } from "lucide-react";
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

const PRESET_DAYS = [
  { label: "7天", value: 7 },
  { label: "14天", value: 14 },
  { label: "30天", value: 30 },
  { label: "60天", value: 60 },
  { label: "90天", value: 90 },
  { label: "自定义", value: 0 },
];

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
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

  const [selectedDays, setSelectedDays] = useState(7);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reviewDates, setReviewDates] = useState<Set<string>>(new Set());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  useEffect(() => {
    loadHotels();
    checkApiKey();
    loadSavedReports();
  }, []);

  useEffect(() => {
    if (selectedHotelId !== "all") {
      loadReviewDates(parseInt(selectedHotelId));
      if (apiKeyConfigured) {
        handleLoadReport(parseInt(selectedHotelId));
      }
    } else {
      setReport(null);
      setReviewDates(new Set());
    }
  }, [selectedHotelId, apiKeyConfigured]);

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

  const loadReviewDates = async (hotelId: number) => {
    try {
      const res = await fetch(`/api/reviews/dates?hotelId=${hotelId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReviewDates(new Set(data.dates));
        }
      }
    } catch {}
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

  const getDateRange = (): { weekStart: string; weekEnd: string } => {
    const now = new Date();
    const weekEnd = formatDate(now);

    if (selectedDays > 0) {
      const start = new Date(now.getTime() - selectedDays * 24 * 60 * 60 * 1000);
      return { weekStart: formatDate(start), weekEnd };
    }

    return {
      weekStart: customStart || formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
      weekEnd: customEnd || weekEnd,
    };
  };

  const handleGenerate = async () => {
    if (!apiKeyConfigured) return;
    if (selectedHotelId === "all") {
      setError("请先选择一个具体的酒店再生成报告");
      return;
    }

    if (selectedDays === 0 && (!customStart || !customEnd)) {
      setError("请选择自定义时间范围的起止日期");
      return;
    }

    setGenerating(true);
    setError(null);
    setReport(null);

    try {
      const { weekStart, weekEnd } = getDateRange();

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

  const handleCalendarDateClick = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (selectedDays === 0) {
      if (!customStart || (customStart && customEnd)) {
        setCustomStart(dateStr);
        setCustomEnd("");
      } else if (dateStr >= customStart) {
        setCustomEnd(dateStr);
      } else {
        setCustomStart(dateStr);
        setCustomEnd("");
      }
    }
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calendarYear, calendarMonth]);

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const isDateInRange = (day: number): boolean => {
    if (selectedDays === 0 && customStart && customEnd) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return dateStr >= customStart && dateStr <= customEnd;
    }
    return false;
  };

  const isDateStart = (day: number): boolean => {
    if (selectedDays === 0 && customStart) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return dateStr === customStart;
    }
    return false;
  };

  const isDateEnd = (day: number): boolean => {
    if (selectedDays === 0 && customEnd) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return dateStr === customEnd;
    }
    return false;
  };

  const hasReviewData = (day: number): boolean => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return reviewDates.has(dateStr);
  };

  const dateRangePreview = useMemo(() => {
    const { weekStart, weekEnd } = getDateRange();
    return `${weekStart} ~ ${weekEnd}`;
  }, [selectedDays, customStart, customEnd]);

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI 评价周报</h2>
            <p className="text-muted-foreground">
              基于 DeepSeek AI 自动生成评价摘要报告，每个酒店保留最新一份
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

        {selectedHotelId !== "all" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-purple-500" />
                选择时间范围
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>时间段（天）</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_DAYS.map((p) => (
                        <Button
                          key={p.value}
                          variant={selectedDays === p.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedDays(p.value)}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedDays === 0 && (
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>开始日期</Label>
                        <Input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>结束日期</Label>
                        <Input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        也可以在右侧日历中点击选择起止日期
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">数据范围：</span>
                      <span className="font-medium">{dateRangePreview}</span>
                    </p>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !apiKeyConfigured || selectedHotelId === "all"}
                    className="w-full bg-purple-600 hover:bg-purple-700"
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>评价数据日历</Label>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[100px] text-center">
                        {calendarYear}年 {monthNames[calendarMonth]}
                      </span>
                      <Button variant="ghost" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                      <div key={d} className="text-xs text-muted-foreground py-1 font-medium">
                        {d}
                      </div>
                    ))}
                    {calendarDays.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} />;
                      }
                      const hasData = hasReviewData(day);
                      const inRange = isDateInRange(day);
                      const isStart = isDateStart(day);
                      const isEnd = isDateEnd(day);

                      let dayClass = "relative h-9 w-9 flex items-center justify-center rounded-md text-sm transition-colors ";
                      if (hasData && inRange) {
                        dayClass += "bg-green-500 text-white font-bold";
                      } else if (inRange) {
                        dayClass += "bg-purple-100 text-purple-700 font-medium";
                      } else if (isStart || isEnd) {
                        dayClass += "bg-purple-500 text-white font-bold";
                      } else if (hasData) {
                        dayClass += "bg-green-100 text-green-700 font-medium hover:bg-green-200";
                      } else {
                        dayClass += "hover:bg-accent";
                      }

                      return (
                        <button
                          key={day}
                          className={dayClass}
                          onClick={() => handleCalendarDateClick(day)}
                          title={hasData ? "有评价数据" : "无评价数据"}
                        >
                          {day}
                          {hasData && !inRange && !isStart && !isEnd && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
                      有评价数据
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-purple-100 border border-purple-300" />
                      选中范围
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-green-500" />
                      范围内有数据
                    </div>
                  </div>
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
