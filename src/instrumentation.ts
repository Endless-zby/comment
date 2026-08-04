export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") {
    return;
  }

  const schedulerModule = "@/services/scheduler";
  const { startScheduler } = await import(schedulerModule);
  startScheduler();
}
