import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { fetchReviews } from "../crawler/review-fetcher";
import { fetchFliggyReviewsByApi } from "../crawler/fliggy-fetcher";
import { createLogger } from "../logger";

const log = createLogger("Scheduler");
const jobs = new Map<number, cron.ScheduledTask>();

export function startScheduler(): void {
  loadActiveConfigs();
}

async function loadActiveConfigs(): Promise<void> {
  const configs = await prisma.config.findMany({
    where: { isActive: true },
    include: { hotel: true },
  });

  for (const config of configs) {
    scheduleJob(config);
  }

  log.info(`已启动 ${configs.length} 个评价拉取任务`);
}

export function addJob(configId: number): void {
  removeJob(configId);
  prisma.config
    .findUnique({
      where: { id: configId },
      include: { hotel: true },
    })
    .then((config: { id: number; isActive: boolean; fetchIntervalHr: number; pageSize: number; fetchMode: string; hotel: { id: number; hotelName: string; ctripHotelId: string | null; fliggyHotelId: string | null } } | null) => {
      if (config && config.isActive && config.hotel) {
        scheduleJob(config);
      }
    });
}

export function removeJob(configId: number): void {
  const job = jobs.get(configId);
  if (job) {
    job.stop();
    jobs.delete(configId);
  }
}

function scheduleJob(config: { id: number; fetchIntervalHr: number; pageSize: number; fetchMode: string; hotel: { id: number; hotelName: string; ctripHotelId: string | null; fliggyHotelId: string | null } }): void {
  const interval = Math.max(1, config.fetchIntervalHr);
  const cronExpr = `0 */${interval} * * *`;

  const job = cron.schedule(cronExpr, async () => {
    log.info(`开始拉取酒店 ${config.hotel.hotelName} 的评价`);
    
    try {
      if (config.hotel.ctripHotelId) {
        const result = await fetchReviews(
          config.hotel.ctripHotelId,
          config.hotel.id,
          config.hotel.hotelName,
          config.id,
          config.pageSize,
          config.fetchMode as "full" | "incremental"
        );
        log.info(`携程拉取完成，新增 ${result.newCount} 条评价`);
      } else {
        log.warn(`酒店 ${config.hotel.hotelName} 未配置携程酒店ID，跳过携程拉取`);
      }

      if (config.hotel.fliggyHotelId) {
        const result = await fetchFliggyReviewsByApi(
          config.hotel.fliggyHotelId,
          config.hotel.id,
          config.hotel.hotelName,
          config.id
        );
        log.info(`飞猪拉取完成，新增 ${result.newCount} 条评价`);
      } else {
        log.warn(`酒店 ${config.hotel.hotelName} 未配置飞猪酒店ID，跳过飞猪拉取`);
      }
    } catch (err: any) {
      log.error(`拉取失败: ${err.message}`);
    }
  });

  jobs.set(config.id, job);
  log.info(`已添加定时任务: ${config.hotel.hotelName}，间隔 ${interval} 小时`);
}

export function stopAllJobs(): void {
  for (const [id, job] of jobs) {
    job.stop();
    log.info(`已停止任务 ${id}`);
  }
  jobs.clear();
}