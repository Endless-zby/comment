"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Star, Image, MessageCircle, RefreshCw, ChevronLeft, ChevronRight, Download, Sparkles, Loader2, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: number;
  hotelId: number;
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
}

interface Hotel {
  id: number;
  hotelName: string;
  fliggyHotelId?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyReviewId, setReplyReviewId] = useState<number | null>(null);
  const [replyStyle, setReplyStyle] = useState("professional");
  const [replyTags, setReplyTags] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyGenerating, setReplyGenerating] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [copied, setCopied] = useState(false);

  const REPLY_STYLES = [
    { label: "专业正式", value: "professional" },
    { label: "亲切温暖", value: "friendly" },
    { label: "简短有力", value: "brief" },
  ];

  const openReplyModal = (reviewId: number) => {
    setReplyReviewId(reviewId);
    setReplyText("");
    setReplyError("");
    setReplyTags("");
    setCopied(false);
    setReplyModalOpen(true);
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

  const handleCopyReply = () => {
    navigator.clipboard.writeText(replyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) {
        const data = await res.json();
        setHotels(data);
        if (data.length > 0 && !selectedHotelId) {
          setSelectedHotelId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error("加载酒店失败:", err);
    }
  };

  const loadReviews = useCallback(async (page: number = 1) => {
    if (!selectedHotelId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        hotelId: selectedHotelId,
        rating: ratingFilter,
        platform: platformFilter,
        page: page.toString(),
        pageSize: "20",
      });
      
      if (keyword) {
        params.set("keyword", keyword);
      }

      const res = await fetch(`/api/reviews?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
      }
    } catch (err) {
      console.error("加载评价失败:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedHotelId, ratingFilter, platformFilter, keyword]);

  useEffect(() => {
    if (selectedHotelId) {
      loadReviews(1);
    }
  }, [selectedHotelId, ratingFilter, platformFilter, loadReviews]);

  const handleSearch = () => {
    loadReviews(1);
  };

  const handlePageChange = (newPage: number) => {
    loadReviews(newPage);
  };

  const handleExport = async () => {
    if (!selectedHotelId) return;
    
    setExporting(true);
    try {
      const params = new URLSearchParams({
        hotelId: selectedHotelId,
        rating: ratingFilter,
        platform: platformFilter,
      });
      
      if (keyword) {
        params.set("keyword", keyword);
      }

      const res = await fetch(`/api/reviews/export?${params}`);
      if (!res.ok) {
        throw new Error("导出失败");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(res.headers.get("Content-Disposition")?.split("filename*=UTF-8''")[1] || "评价导出.xlsx");
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < fullStars
                ? "fill-yellow-400 text-yellow-400"
                : i === fullStars && hasHalf
                ? "fill-yellow-400/50 text-yellow-400"
                : "text-gray-300"
            )}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "bg-green-100 text-green-700";
    if (rating >= 3) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getPlatformBadge = (platform: string) => {
    if (platform === "fliggy") {
      return "bg-orange-100 text-orange-700";
    }
    return "bg-blue-100 text-blue-700";
  };

  const getPlatformLabel = (platform: string) => {
    return platform === "fliggy" ? "飞猪" : "携程";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">评价列表</h2>
          <p className="text-muted-foreground">浏览已拉取的评价数据（支持携程和飞猪平台）</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择酒店" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.length === 0 ? (
                    <SelectItem value="_empty" disabled>暂无酒店</SelectItem>
                  ) : hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={String(hotel.id)}>
                      {hotel.hotelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="平台筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  <SelectItem value="ctrip">携程</SelectItem>
                  <SelectItem value="fliggy">飞猪</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="评分筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部评分</SelectItem>
                  <SelectItem value="good">好评 (4-5星)</SelectItem>
                  <SelectItem value="neutral">中评 (3星)</SelectItem>
                  <SelectItem value="bad">差评 (1-2星)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="关键词搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-[200px]"
              />
              <Button variant="outline" onClick={handleSearch}>搜索</Button>
              <Button variant="outline" onClick={() => loadReviews(pagination.page)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={exporting || !selectedHotelId}>
                <Download className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
                {exporting ? '导出中...' : '导出Excel'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {hotels.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p>请先在「酒店管理」页面添加酒店</p>
              </div>
            </CardContent>
          </Card>
        ) : !selectedHotelId ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p>请选择一个酒店查看评价</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                评价列表 ({pagination.total} 条)
                {selectedHotelId && hotels.find(h => String(h.id) === selectedHotelId) && (
                  <span className="text-sm text-muted-foreground ml-2">
                    - {hotels.find(h => String(h.id) === selectedHotelId)?.hotelName}
                    {platformFilter !== "all" && ` (${platformFilter === "fliggy" ? "飞猪" : "携程"})`}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  加载中...
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>暂无评价数据，请先拉取评价</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderStars(review.rating)}
                            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getRatingColor(review.rating))}>
                              {review.rating >= 4 ? '好评' : review.rating >= 3 ? '中评' : '差评'}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getPlatformBadge(review.platform))}>
                              {getPlatformLabel(review.platform)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {review.roomName && `房型: ${review.roomName}`}
                            {review.checkInDate && ` · 入住: ${review.checkInDate}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {review.hasImage && (
                            <Image className="h-4 w-4" />
                          )}
                          <span>{review.reviewDate || '-'}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">{review.content || '无评价内容'}</p>
                      {review.hasImage && review.imageList && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {JSON.parse(review.imageList).map((img: string, idx: number) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`评价图片 ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                      )}
                      {review.hotelReply && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center gap-2 text-sm font-medium mb-1">
                            <MessageCircle className="h-4 w-4" />
                            酒店回复
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {review.hotelReply}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>评价者: {review.reviewer || "匿名"}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => openReplyModal(review.id)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI回复
                          </Button>
                          <span>ID: {review.commentId}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={pagination.page <= 1 || loading}
                        onClick={() => handlePageChange(pagination.page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        上一页
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          第 {pagination.page} / {pagination.totalPages} 页
                        </span>
                        <span className="text-sm text-muted-foreground">
                          (共 {pagination.total} 条)
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages || loading}
                        onClick={() => handlePageChange(pagination.page + 1)}
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
        )}
      </div>

      {replyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI 回复建议
              </h3>
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
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成回复建议
                </>
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
                  onClick={handleCopyReply}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      已复制到剪贴板
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      一键复制
                    </>
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