FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY --from=server-builder /app/server/dist ./server/dist
COPY data/ ./data/
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=6002
EXPOSE 6002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6002/health || exit 1

CMD ["node", "server/dist/app.js"]
