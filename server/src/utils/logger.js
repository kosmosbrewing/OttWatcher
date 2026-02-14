// 구조화 로깅 (JSON: timestamp, level, message)
function createLog(level, message, meta = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(log);
}

const logger = {
  info: (message, meta) => console.log(createLog("info", message, meta)),
  warn: (message, meta) => console.warn(createLog("warn", message, meta)),
  error: (message, meta) => console.error(createLog("error", message, meta)),
};

module.exports = logger;
