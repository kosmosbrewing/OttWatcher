const logger = require("../utils/logger");

// 전역 에러 핸들링 미들웨어
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = status === 500 ? "서버 내부 오류가 발생했습니다." : err.message;

  logger.error(err.message, {
    status,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
