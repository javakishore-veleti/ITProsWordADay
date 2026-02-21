# ===== Stage 1: Build Go Backend =====
FROM golang:1.21-alpine AS go-builder
WORKDIR /app/backend
COPY Services/EnglishWordADayService/ .
RUN CGO_ENABLED=0 go build -o server .

# ===== Stage 2: Build Next.js Frontend =====
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY Portals/EnglishWordADayPortal/package*.json ./
RUN npm ci
COPY Portals/EnglishWordADayPortal/ .
RUN npm run build

# ===== Stage 3: Production Image =====
FROM alpine:3.19 AS production
RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=go-builder /app/backend/server .
COPY --from=go-builder /app/backend/data ./data

COPY --from=frontend-builder /app/frontend/out ./public

ENV PORT=8080
ENV DEPLOYMENT_MODE=github-pages
ENV DATA_ROOT_PATH=./data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/api/health || exit 1

CMD ["./server"]
