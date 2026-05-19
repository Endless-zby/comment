"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck, Database, Clock, Building2, Link2, Plus } from "lucide-react";
import type { TrackMatchResult, TrackMatchStats, TrackMatchResponse, TrackCopyEvent } from "@/types";

interface HotelOption {
  id: number;
  hotelName: string;
  platformId: string | null;
}

interface TrackEventItem extends TrackCopyEvent {
  boundHotelName: string | null;
  boundHotelId: number | null;
}

interface TrackEventsResponse {
  success: boolean;
  total: number;
  events: TrackEventItem[];
  byHotel: { hotelName: string; platformId: string; count: number; bound: boolean; boundHotelId: number | null }[];
  timeRange: { earliest: string | null; latest: string | null };
}

export default function TrackMatchPage() {
  const [activeTab, setActiveTab] = useState<"events" | "match">("events");
  const [hotels, setHotels] = useState<HotelOption[]>([]);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsData, setEventsData] = useState<TrackEventsResponse | null>(null);
  const [eventsHotelFilter, setEventsHotelFilter] = useState<string>("");
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsExpandedIdx, setEventsExpandedIdx] = useState<number | null>(null);

  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [minSimilarity, setMinSimilarity] = useState(70);
  const [matchLoading, setMatchLoading] = useState(false);
  const [results, setResults] = useState<TrackMatchResult[]>([]);
  const [stats, setStats] = useState<TrackMatchStats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [isBindDialogOpen, setIsBindDialogOpen] = useState(false);
  const [bindHotelName, setBindHotelName] = useState("");
  const [bindPlatformId, setBindPlatformId] = useState("");
  const [bindCtripHotelId, setBindCtripHotelId] = useState("");
  const [bindFliggyHotelId, setBindFliggyHotelId] = useState("");
  const [bindOnboardDate, setBindOnboardDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bindError, setBindError] = useState("");
  const [bindSubmitting, setBindSubmitting] = useState(false);

  const eventsPageSize = 20;

  const handleOpenBindDialog = (hotelName: string, platformId: string) => {
    setBindHotelName(hotelName);
    setBindPlatformId(platformId);
    setBindCtripHotelId("");
    setBindFliggyHotelId("");
    setBindOnboardDate(new Date().toISOString().split("T")[0]);
    setBindError("");
    setBindSubmitting(false);
    setIsBindDialogOpen(true);
  };

  const handleBindSubmit = async () => {
    setBindError("");
    if (!bindHotelName) {
      setBindError("请填写酒店名称");
      return;
    }
    setBindSubmitting(true);
    try {
      const res = await fetch("/api/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName: bindHotelName,
          ctripHotelId: bindCtripHotelId || null,
          fliggyHotelId: bindFliggyHotelId || null,
          platformId: bindPlatformId || null,
          city: null,
          onboardDate: bindOnboardDate || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsBindDialogOpen(false);
        loadHotels();
        if (eventsData) {
          handleQueryEvents();
        }
      } else {
        setBindError(data.error || "添加失败");
      }
    } catch {
      setBindError("网络错误，请重试");
    } finally {
      setBindSubmitting(false);
    }
  };

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) {
        const data = await res.json();
        setHotels(data.map((h: any) => ({ id: h.id, hotelName: h.hotelName, platformId: h.platformId })));
      }
    } catch {}
  };

  const handleQueryEvents = async () => {
    setEventsLoading(true);
    setEventsExpandedIdx(null);
    setEventsPage(1);
    try {
      const matchedHotel = hotels.find((h) => h.id === Number(eventsHotelFilter));
      const platformId = matchedHotel?.platformId || undefined;

      const res = await fetch("/api/track/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId }),
      });
      if (res.ok) {
        const data: TrackEventsResponse = await res.json();
        setEventsData(data);
      } else {
        const data = await res.json();
        alert(data.error || "查询失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setEventsLoading(false);
    }
  };

  const handleMatch = async () => {
    setMatchLoading(true);
    setResults([]);
    setStats(null);
    setExpandedId(null);
    try {
      const res = await fetch("/api/track/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotelId || undefined,
          minSimilarity,
          page,
          pageSize,
        }),
      });
      if (res.ok) {
        const data: TrackMatchResponse = await res.json();
        setResults(data.results);
        setStats(data.stats);
        setTotal(data.total);
        setPageSize(data.pageSize);
      } else {
        const data = await res.json();
        alert(data.error || "匹配失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleMatchPageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => handleMatch(), 0);
  };

  const matchTotalPages = Math.ceil(total / pageSize);

  const truncateContent = (text: string, maxLen: number = 80) => {
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  };

  const getSimilarityColor = (sim: number) => {
    if (sim >= 90) return "text-green-600 bg-green-50";
    if (sim >= 70) return "text-yellow-600 bg-yellow-50";
    if (sim >= 50) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "未知";
    try {
      return new Date(ts).toLocaleString("zh-CN");
    } catch {
      return ts;
    }
  };

  const filteredEvents = eventsData?.events || [];
  const pagedEvents = filteredEvents.slice(
    (eventsPage - 1) * eventsPageSize,
    eventsPage * eventsPageSize
  );
  const eventsTotalPages = Math.ceil(filteredEvents.length / eventsPageSize);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">评价溯源</h2>
            <p className="text-muted-foreground">
              匹配 H5 埋点复制事件与平台评价，识别从 AI 工具复制的评价内容
            </p>
          </div>
        </div>

        <div className="flex gap-1 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "events"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("events")}
          >
            <Database className="h-4 w-4 inline mr-1.5" />
            埋点数据
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "match"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("match")}
          >
            <ShieldCheck className="h-4 w-4 inline mr-1.5" />
            匹配结果
          </button>
        </div>

        {activeTab === "events" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总事件数</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventsData?.total ?? "-"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">涉及酒店</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventsData?.byHotel.length ?? "-"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">时间范围</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {eventsData?.timeRange.earliest
                      ? `${formatTimestamp(eventsData.timeRange.earliest).split(" ")[0]} ~ ${formatTimestamp(eventsData.timeRange.latest!).split(" ")[0]}`
                      : "-"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>筛选条件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="grid gap-2">
                    <Label>酒店（按 platformId 筛选）</Label>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
                      value={eventsHotelFilter}
                      onChange={(e) => setEventsHotelFilter(e.target.value)}
                    >
                      <option value="">全部酒店</option>
                      {hotels
                        .filter((h) => h.platformId)
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.hotelName} ({h.platformId})
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button onClick={handleQueryEvents} disabled={eventsLoading}>
                    {eventsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        查询中...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        查询埋点数据
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {eventsData && eventsData.byHotel.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>按酒店统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {eventsData.byHotel.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.hotelName}</span>
                          <span className="text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
                            {item.platformId}
                          </span>
                          {item.bound ? (
                            <span className="text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5 flex items-center gap-0.5">
                              <CheckCircle className="h-3 w-3" />
                              已绑定
                            </span>
                          ) : (
                            <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
                              未绑定
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            复制事件: <strong>{item.count}</strong> 次
                          </span>
                          {!item.bound && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => handleOpenBindDialog(item.hotelName, item.platformId)}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              去绑定
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>埋点事件列表 ({eventsData?.total ?? 0})</span>
                  {eventsData && eventsTotalPages > 1 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      第 {eventsPage}/{eventsTotalPages} 页
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    正在查询 ES 数据...
                  </div>
                ) : !eventsData ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>请选择筛选条件后点击「查询埋点数据」</p>
                  </div>
                ) : pagedEvents.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>未查询到数据</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pagedEvents.map((event, idx) => {
                      const globalIdx = (eventsPage - 1) * eventsPageSize + idx;
                      const isExpanded = eventsExpandedIdx === globalIdx;
                      return (
                        <div key={globalIdx} className="border rounded-lg overflow-hidden">
                          <div
                            className="p-4 cursor-pointer hover:bg-accent/50"
                            onClick={() => setEventsExpandedIdx(isExpanded ? null : globalIdx)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm">{event.boundHotelName || event.hotelName || "未绑定酒店"}</span>
                              {event.platformId && (
                                <span className="text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
                                  {event.platformId}
                                </span>
                              )}
                              {event.boundHotelId ? (
                                <span className="text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5">已绑定</span>
                              ) : (
                                <span className="text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">未绑定</span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                {formatTimestamp(event.timestamp).split(" ")[0]}
                              </span>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm leading-relaxed">
                              {isExpanded
                                ? (event.content || "（无内容）")
                                : truncateContent(event.content, 200)
                              }
                            </div>
                            {!isExpanded && event.content && event.content.length > 200 && (
                              <p className="text-xs text-muted-foreground mt-1.5 text-right">
                                点击展开完整内容（共 {event.content.length} 字）
                              </p>
                            )}
                            {isExpanded && (
                              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                <span>复制时间: {formatTimestamp(event.timestamp)}</span>
                                <span>字数: {event.content?.length || 0}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {eventsTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={eventsPage <= 1}
                          onClick={() => setEventsPage(eventsPage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          上一页
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {eventsPage} / {eventsTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={eventsPage >= eventsTotalPages}
                          onClick={() => setEventsPage(eventsPage + 1)}
                        >
                          下一页
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "match" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总埋点事件</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalTrackEvents ?? "-"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">已匹配</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.matchedCount ?? "-"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">未匹配</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats?.unmatchedCount ?? "-"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">匹配率</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats ? `${stats.matchRate}%` : "-"}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>筛选条件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="grid gap-2">
                    <Label>酒店</Label>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedHotelId || ""}
                      onChange={(e) => setSelectedHotelId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">全部酒店</option>
                      {hotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.hotelName}{h.platformId ? ` (${h.platformId})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>最低相似度: {minSimilarity}%</Label>
                    <input
                      type="range"
                      min={30}
                      max={100}
                      value={minSimilarity}
                      onChange={(e) => setMinSimilarity(Number(e.target.value))}
                      className="w-40"
                    />
                  </div>
                  <Button onClick={handleMatch} disabled={matchLoading}>
                    {matchLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        匹配中...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        开始匹配
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {stats && stats.byHotel.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>按酒店统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.byHotel.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{item.hotelName}</span>
                          {item.platformId && (
                            <span className="ml-2 text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
                              {item.platformId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>总事件: <strong>{item.total}</strong></span>
                          <span className="text-green-600">已匹配: <strong>{item.matched}</strong></span>
                          <span className="text-red-600">未匹配: <strong>{item.total - item.matched}</strong></span>
                          <span className="text-blue-600">
                            匹配率: <strong>{item.total > 0 ? Math.round((item.matched / item.total) * 100) : 0}%</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>匹配结果 ({total})</span>
                  {total > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      第 {page}/{matchTotalPages} 页
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    正在查询 ES 数据并匹配...
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>请设置筛选条件后点击「开始匹配」</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((item, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50"
                          onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{item.hotelName || item.trackEvent.hotelName || "未知酒店"}</span>
                              {item.trackEvent.platformId && (
                                <span className="text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
                                  {item.trackEvent.platformId}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {truncateContent(item.trackEvent.content)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {item.matchedReview ? (
                              <>
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  已匹配
                                </span>
                                <span className={`text-xs rounded-full px-2 py-0.5 ${getSimilarityColor(item.similarity)}`}>
                                  {item.similarity}%
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-red-500 flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  未匹配
                                </span>
                                {item.similarity > 0 && (
                                  <span className={`text-xs rounded-full px-2 py-0.5 ${getSimilarityColor(item.similarity)}`}>
                                    {item.similarity}%
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {expandedId === idx && (
                          <div className="border-t bg-muted/30 p-4 space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-blue-600">📋 埋点复制内容</h4>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                {item.trackEvent.content || "（无内容）"}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                复制时间: {formatTimestamp(item.trackEvent.timestamp)}
                              </p>
                            </div>
                            {item.matchedReview && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 text-green-600">✅ 匹配的平台评价</h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                  {item.matchedReview.content}
                                </div>
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  <span>平台: {item.matchedReview.platform}</span>
                                  <span>评分: {item.matchedReview.rating}</span>
                                  <span>评价日期: {item.matchedReview.reviewDate || "未知"}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {matchTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => handleMatchPageChange(page - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          上一页
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {page} / {matchTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= matchTotalPages}
                          onClick={() => handleMatchPageChange(page + 1)}
                        >
                          下一页
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={isBindDialogOpen} onOpenChange={(open) => { setIsBindDialogOpen(open); if (!open) setBindError(""); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              添加酒店并绑定
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bindHotelName">酒店名称 *</Label>
              <Input
                id="bindHotelName"
                value={bindHotelName}
                onChange={(e) => setBindHotelName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>后台酒店 ID（platformId）</Label>
              <Input
                value={bindPlatformId}
                onChange={(e) => setBindPlatformId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                已自动填充埋点数据中的 platformId，绑定后即可在评价溯源中匹配
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bindOnboardDate">入驻日期（可选）</Label>
              <Input
                id="bindOnboardDate"
                type="date"
                value={bindOnboardDate}
                onChange={(e) => setBindOnboardDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bindCtripHotelId">携程酒店 ID（可选）</Label>
              <Input
                id="bindCtripHotelId"
                placeholder="如 128045084"
                value={bindCtripHotelId}
                onChange={(e) => setBindCtripHotelId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bindFliggyHotelId">飞猪酒店 ID（可选）</Label>
              <Input
                id="bindFliggyHotelId"
                placeholder="如 77034255"
                value={bindFliggyHotelId}
                onChange={(e) => setBindFliggyHotelId(e.target.value)}
              />
            </div>
            {bindError && <p className="text-sm text-red-500">{bindError}</p>}
            <Button onClick={handleBindSubmit} disabled={bindSubmitting}>
              {bindSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  提交中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  确认添加
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
