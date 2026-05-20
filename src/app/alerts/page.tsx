"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: number;
  hotelId: number;
  reviewId: number;
  hotelName: string;
  platform: string;
  rating: number;
  content: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const REPLY_STYLES = [
  { label: "专业正式", value: "professional" },
  { label: "亲切温暖", value: "friendly" },
  { label: "简短有力", value: "brief" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [filter, setFilter] = useState("unread");

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyReviewId, setReplyReviewId] = useState<number | null>(null);
  const [replyStyle, setReplyStyle] = useState("professional");
  const [replyTags, setReplyTags] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyGenerating, setReplyGenerating] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAlerts(1);

    const es = new EventSource("/api/alerts/stream");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "alert-count") {
          setUnreadCount(data.unreadCount);
        }
      } catch {}
    };
    es.onerror = () => es.close();

    return () => es.close();
  }, []);

  useEffect(() => {
    loadAlerts(1);
  }, [filter]);

  const loadAlerts = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (filter === "unread") params.set("isRead", "false");
      else if (filter === "read") params.set("isRead", "true");

      const res = await fetch(`/api/alerts?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAlerts(data.alerts);
          setUnreadCount(data.unreadCount);
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error("加载预警失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (ids: number[]) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isRead: true }),
      });
      if (res.ok) {
        loadAlerts(pagination.page);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.isRead).map((a) => a.id);
    if (unreadIds.length === 0) return;
    await handleMarkRead(unreadIds);
  };

  const handleDelete = async (ids: number[]) => {
    try {
      const res = await fetch(`/api/alerts?ids=${ids.join(",")}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadAlerts(pagination.page);
      }
    } catch {}
  };

  const handleGenerateReply = async () => {
    if (!replyReviewId) return;
    setReplyGenerating(true);
    setReplyError("");
    setReplyText("");
    setCopied(false);

    try {
      const res = await fetch("/api/reviews/reply-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: replyReviewId, style: replyStyle, tags: replyTags }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyText(data.reply);
      } else {
        setReplyError(data.error || "生成失败");
      }
    } catch {
      setReplyError("网络错误");
    } finally {
      setReplyGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(replyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openReplyModal = (reviewId: number) => {
    setReplyReviewId(reviewId);
    setReplyText("");
    setReplyError("");
    setReplyTags("");
    setCopied(false);
    setReplyModalOpen(true);
  };

  const getPlatformBadge = (platform: string) => {
    if (platform === "fliggy") return "bg-orange-100 text-orange-700";
    return "bg-blue-100 text-blue-700";
  };

  const getPlatformLabel = (platform: string) => {
    return platform === "fliggy" ? "飞猪" : "携程";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">评价预警</h2>
            <p className="text-muted-foreground">
              差评自动预警，评分低于3星的评价将自动标记
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                <Bell className="h-3 w-3" />
                {unreadCount} 条未读
              </span>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                预警列表
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unread">未读</SelectItem>
                    <SelectItem value="read">已读</SelectItem>
                    <SelectItem value="all">全部</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  全部已读
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAlerts(pagination.page)}
                  disabled={loading}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <BellOff className="h-5 w-5 mr-2" />
                {filter === "unread" ? "没有未读预警" : "暂无预警数据"}
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 border rounded-lg space-y-2 transition-colors",
                      !alert.isRead
                        ? "border-red-200 bg-red-50/50"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {!alert.isRead && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                          <span className="font-medium text-sm">
                            {alert.hotelName}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              getPlatformBadge(alert.platform)
                            )}
                          >
                            {getPlatformLabel(alert.platform)}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < Math.floor(alert.rating)
                                    ? "fill-red-400 text-red-400"
                                    : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {alert.content || "无评价内容"}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      {!alert.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleMarkRead([alert.id])}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          标记已读
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openReplyModal(alert.reviewId)}
                      >
                        生成回复
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete([alert.id])}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}

                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1 || loading}
                      onClick={() => loadAlerts(pagination.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一页
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      第 {pagination.page} / {pagination.totalPages} 页 (共{" "}
                      {pagination.total} 条)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        pagination.page >= pagination.totalPages || loading
                      }
                      onClick={() => loadAlerts(pagination.page + 1)}
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
      </div>

      {replyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI 回复建议</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyModalOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">回复风格</label>
              <div className="flex gap-2">
                {REPLY_STYLES.map((s) => (
                  <Button
                    key={s.value}
                    variant={replyStyle === s.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setReplyStyle(s.value);
                      setReplyText("");
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">回复重点标签 <span className="text-muted-foreground font-normal">(可选，如：卫生问题、退款处理、噪音扰民)</span></label>
              <Input
                placeholder="输入标签，多个用逗号分隔"
                value={replyTags}
                onChange={(e) => setReplyTags(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleGenerateReply}
              disabled={replyGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {replyGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  AI 生成中...
                </>
              ) : (
                "生成回复建议"
              )}
            </Button>

            {replyError && (
              <p className="text-sm text-red-500">{replyError}</p>
            )}

            {replyText && (
              <div className="space-y-2">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {replyText}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      已复制
                    </>
                  ) : (
                    "一键复制"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
