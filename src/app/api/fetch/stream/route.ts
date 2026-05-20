import { getFetchStatus } from "@/services/crawler/review-fetcher";
import { getFliggyFetchStatus } from "@/services/crawler/fliggy-fetcher";

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

      intervalId = setInterval(() => {
        const ctripStatus = getFetchStatus();
        const fliggyStatus = getFliggyFetchStatus();
        const status = ctripStatus.isRunning
          ? { ...ctripStatus, type: "fetch-status" }
          : fliggyStatus.isRunning
            ? { ...fliggyStatus, type: "fetch-status" }
            : {
                type: "fetch-status",
                isRunning: false,
                currentHotelId: null,
                currentHotelName: null,
                currentPlatform: null,
                progress: null,
              };

        const payload = JSON.stringify(status);
        if (payload !== lastSent) {
          lastSent = payload;
          send(payload);
        }
      }, 500);

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
