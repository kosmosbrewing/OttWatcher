import type { ErrorRequestHandler } from "express";
import logger from "../utils/logger";

type HttpError = Error & { status?: number };

// 전역 에러 핸들링 미들웨어
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = err as HttpError;
  const status = error.status || 500;
  const message =
    status === 500 ? "서버 내부 오류가 발생했습니다." : error.message;

  logger.error(error.message, {
    status,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });

  res.status(status).json({ error: message });
};

export default errorHandler;
