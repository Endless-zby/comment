type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];

export function createLogger(module: string) {
  return {
    info: (message: string) => addLog("info", module, message),
    warn: (message: string) => addLog("warn", module, message),
    error: (message: string) => addLog("error", module, message),
    debug: (message: string) => addLog("debug", module, message),
  };
}

function addLog(level: LogLevel, module: string, message: string): void {
  const entry: LogEntry = {
    timestamp: new Date(),
    level,
    module,
    message,
  };

  logs.push(entry);

  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  const timestamp = entry.timestamp.toLocaleString("zh-CN");
  const levelStr = level.toUpperCase().padEnd(5);
  console.log(`[${timestamp}] [${levelStr}] [${module}] ${message}`);
}

export function getLogs(
  module?: string,
  level?: LogLevel,
  limit?: number
): LogEntry[] {
  let filtered = logs;

  if (module) {
    filtered = filtered.filter((log) => log.module === module);
  }

  if (level) {
    filtered = filtered.filter((log) => log.level === level);
  }

  if (limit) {
    filtered = filtered.slice(-limit);
  }

  return filtered;
}

export function getModules(): string[] {
  const modules = new Set<string>();
  logs.forEach((log) => modules.add(log.module));
  return Array.from(modules);
}

export function clearLogs(): void {
  logs.length = 0;
}