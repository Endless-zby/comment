import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let lastSent = "";
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      };

      send(JSON.stringify({ type: "connected" }));

      intervalId = setInterval(async () => {
        try {
          const unreadCount = await prisma.alert.count({
            where: { isRead: false },
          });
          const payload = JSON.stringify({
            type: "alert-count",
            unreadCount,
          });
          if (payload !== lastSent) {
            lastSent = payload;
            send(payload);
          }
        } catch {}
      }, 3000);

      request.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
