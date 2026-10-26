# syntax=docker/dockerfile:1

# .node-version 과 맞춘다.
ARG NODE_VERSION=22.14.0

# ---- deps: package-lock 기준으로 의존성 설치 ----
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: next build (standalone) ----
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# rewrites()는 빌드 시점에 평가되므로 BACKEND_URL은 빌드 인자로 넘겨야 한다.
# 백엔드 컨테이너와 같은 Docker 네트워크에 붙어서, 서비스(컨테이너) 이름 backend 로 접근한다.
# 컨테이너 안의 localhost는 컨테이너 자신이므로 localhost:8080 으로는 백엔드에 닿지 않는다.
ARG BACKEND_URL=http://backend:8080
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: 최소 실행 이미지 ----
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
