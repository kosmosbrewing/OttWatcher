type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

// 구조화 로깅 (JSON: timestamp, level, message)
function createLog(level: LogLevel, message: string, meta: LogMeta = {}): string {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(log);
}

const logger = {
  info: (message: string, meta?: LogMeta): void => console.log(createLog("info", message, meta)),
  warn: (message: string, meta?: LogMeta): void => console.warn(createLog("warn", message, meta)),
  error: (message: string, meta?: LogMeta): void => console.error(createLog("error", message, meta)),
};

export default logger;
